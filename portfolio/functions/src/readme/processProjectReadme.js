const { randomUUID } = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { parseReadmeMarkdown } = require('./parseReadme');
const { cacheReadmeAssets, ensureStorageObject } = require('./imageCache');
const { parseGithubUrl } = require('./parseGithubUrl');
const {
  buildReadmeLyricChunks,
  buildLegacyTimeline,
  createFallbackChunks,
} = require('./readmeChunks');

const GITHUB_API_TOKEN = defineSecret('GITHUB_API_TOKEN');
// Bumping this invalidates the same-SHA skip, so every project regenerates on
// next process. 2.0.0: lyric-line chunks replaced the block/timeline shape.
// 3.0.0: whole-block chunks (GitHub-like rendering, no sentence splitting).
// 4.0.0: sentence/list-item/table-row chunks; duration derived from content
// weights instead of being scaled to the manually entered MM:SS.
// 4.1.0: image chunks carry intrinsic dimensions; height-aware image weights.
const GENERATOR_VERSION = '4.1.0';

function assertAdmin(request) {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

function getGithubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'portfolio-readme-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubJson(token, path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: getGithubHeaders(token),
  });

  if (!response.ok) {
    const error = new Error(`GitHub request failed with ${response.status}.`);
    error.status = response.status;
    error.body = await response.text();
    error.headers = response.headers;
    throw error;
  }

  return response.json();
}

function isRateLimited(error) {
  return error?.status === 429
    || (error?.status === 403 && error?.headers?.get('x-ratelimit-remaining') === '0');
}

async function fetchGithubReadme({ token, owner, repo, commitSha }) {
  const readme = await githubJson(token, `/repos/${owner}/${repo}/readme?ref=${commitSha}`);
  return {
    readmePath: readme.path,
    markdown: Buffer.from(readme.content || '', 'base64').toString('utf8'),
  };
}

async function resolveRepoState({ token, owner, repo, requestedCommitSha }) {
  const repoInfo = await githubJson(token, `/repos/${owner}/${repo}`);
  const defaultBranch = repoInfo.default_branch;
  const commitSha = requestedCommitSha || (await githubJson(token, `/repos/${owner}/${repo}/commits/${defaultBranch}`)).sha;
  return {
    defaultBranch,
    commitSha,
  };
}

function createProcessedReadme({
  projectId,
  source,
  chunks,
  durationSec,
  assets,
  warnings,
}) {
  return {
    schemaVersion: 1,
    projectId,
    source,
    chunks,
    timeline: buildLegacyTimeline(chunks),
    durationSec,
    assets,
    generatedAt: new Date().toISOString(),
    generatorVersion: GENERATOR_VERSION,
    warnings,
  };
}

async function writeProcessedReadme({ projectId, commitSha, processedReadme }) {
  const bucket = admin.storage().bucket();
  const json = Buffer.from(JSON.stringify(processedReadme, null, 2), 'utf8');
  const versionedPath = `projects/${projectId}/readme/processed-${commitSha}.json`;
  const currentPath = `projects/${projectId}/readme/current.json`;

  await ensureStorageObject({
    bucket,
    storagePath: versionedPath,
    buffer: json,
    contentType: 'application/json',
    cacheControl: 'public,max-age=300',
    overwrite: true,
  });

  const current = await ensureStorageObject({
    bucket,
    storagePath: currentPath,
    buffer: json,
    contentType: 'application/json',
    cacheControl: 'public,max-age=60',
    overwrite: true,
  });

  return {
    versionedPath,
    currentPath,
    downloadUrl: current.downloadUrl,
    byteSize: json.byteLength,
  };
}

async function updateProjectReadyState({
  projectRef,
  project,
  repoMeta,
  readmePath,
  commitSha,
  writtenReadme,
  processedReadme,
  warnings,
}) {
  const processingStatus = warnings.some((warning) => warning.toLowerCase().includes('failed to cache image'))
    ? 'asset_error'
    : 'ready';

  const githubSource = {
    owner: repoMeta.owner,
    repo: repoMeta.repo,
    fullName: repoMeta.fullName,
    defaultBranch: repoMeta.defaultBranch,
    readmePath,
    lastProcessedCommitSha: commitSha,
    webhookId: repoMeta.webhookId || null,
    webhookRegisteredAt: repoMeta.webhookRegisteredAt || null,
  };

  await projectRef.set({
    githubSource,
    processingStatus,
    processedReadmeRef: {
      storagePath: writtenReadme.currentPath,
      downloadUrl: writtenReadme.downloadUrl,
      commitSha,
      generatorVersion: GENERATOR_VERSION,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      byteSize: writtenReadme.byteSize,
      blockCount: processedReadme.chunks.length,
      durationSec: processedReadme.durationSec,
    },
    generatedDurationSec: processedReadme.durationSec,
    lyricsEnabled: typeof project?.lyricsEnabled === 'boolean' ? project.lyricsEnabled : true,
    latestProcessingWarnings: warnings,
    latestProcessingError: null,
  }, { merge: true });

  await admin.firestore().collection('processedReadmes').doc(String(projectRef.id)).set({
    projectId: projectRef.id,
    ...{
      storagePath: writtenReadme.currentPath,
      downloadUrl: writtenReadme.downloadUrl,
      commitSha,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      byteSize: writtenReadme.byteSize,
      blockCount: processedReadme.chunks.length,
      durationSec: processedReadme.durationSec,
    },
    warnings,
  });

  return processingStatus;
}

async function setProjectFailure(projectRef, status, errorMessage) {
  await projectRef.set({
    processingStatus: status,
    latestProcessingError: errorMessage,
    latestProcessingWarnings: [],
  }, { merge: true });
}

async function runProcessingJob({ projectId, trigger = 'cms_manual', requestedCommitSha = null, jobId = randomUUID() }) {
  const db = admin.firestore();
  const projectRef = db.collection('projects').doc(String(projectId));
  const jobRef = projectRef.collection('processingJobs').doc(jobId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new Error('Project not found.');
  }

  const project = projectSnap.data();
  const manualReadmeMarkdown = typeof project?.readmeMarkdown === 'string' ? project.readmeMarkdown : '';

  if (!project?.github && !manualReadmeMarkdown) {
    await setProjectFailure(projectRef, 'failed', 'Project does not have a GitHub URL or manual README content.');
    throw new Error('Project does not have a GitHub URL or manual README content.');
  }

  const token = GITHUB_API_TOKEN.value();
  const githubMeta = project.github ? parseGithubUrl(project.github) : {
    owner: 'manual',
    repo: String(projectId),
    fullName: `manual/${projectId}`,
  };
  const { owner, repo, fullName } = githubMeta;
  const repoMeta = {
    owner,
    repo,
    fullName,
    defaultBranch: project.githubSource?.defaultBranch || 'main',
    webhookId: project.githubSource?.webhookId || null,
    webhookRegisteredAt: project.githubSource?.webhookRegisteredAt || null,
  };

  await jobRef.set({
    id: jobId,
    projectId: String(projectId),
    trigger,
    requestedCommitSha,
    resolvedCommitSha: null,
    status: 'running',
    error: null,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    finishedAt: null,
    attempts: admin.firestore.FieldValue.increment(1),
    warnings: [],
  }, { merge: true });

  await projectRef.set({
    processingStatus: 'processing',
  }, { merge: true });

  try {
    const usingManualReadme = !project.github && Boolean(manualReadmeMarkdown);
    const { defaultBranch, commitSha } = usingManualReadme
      ? {
        defaultBranch: 'manual',
        commitSha: requestedCommitSha || 'manual',
      }
      : await resolveRepoState({
        token,
        owner,
        repo,
        requestedCommitSha,
      });

    if (!usingManualReadme
      && project.githubSource?.lastProcessedCommitSha === commitSha
      && project.processedReadmeRef?.generatorVersion === GENERATOR_VERSION) {
      await jobRef.set({
        resolvedCommitSha: commitSha,
        status: 'success',
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        warnings: ['Skipped processing because the commit SHA is unchanged.'],
      }, { merge: true });
      await projectRef.set({
        processingStatus: 'ready',
      }, { merge: true });
      return { skipped: true, commitSha };
    }

    let readmePath = 'README.md';
    let markdown = manualReadmeMarkdown;

    if (!usingManualReadme) {
      ({ readmePath, markdown } = await fetchGithubReadme({ token, owner, repo, commitSha }));
    }

    if (!markdown && manualReadmeMarkdown) {
      markdown = manualReadmeMarkdown;
      readmePath = 'MANUAL_README.md';
    }

    if (!markdown) {
      const fallbackChunks = createFallbackChunks(project?.description || '', 0);
      const processedReadme = createProcessedReadme({
        projectId: String(projectId),
        source: {
          owner,
          repo,
          commitSha,
          readmePath,
          branch: defaultBranch,
        },
        chunks: fallbackChunks,
        durationSec: Math.max(1, Math.round((fallbackChunks.at(-1)?.endMs || 0) / 1000)),
        assets: [],
        warnings: ['README content was empty. Falling back to project description.'],
      });
      const writtenReadme = await writeProcessedReadme({
        projectId: String(projectId),
        commitSha,
        processedReadme,
      });
      const status = await updateProjectReadyState({
        projectRef,
        project,
        repoMeta: { ...repoMeta, defaultBranch },
        readmePath,
        commitSha,
        writtenReadme,
        processedReadme,
        warnings: processedReadme.warnings,
      });
      await jobRef.set({
        resolvedCommitSha: commitSha,
        status: 'success',
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        warnings: processedReadme.warnings,
      }, { merge: true });
      return { ok: true, commitSha, durationSec: processedReadme.durationSec, status, jobId };
    }

    const parsed = parseReadmeMarkdown(markdown);
    const warnings = [...parsed.warnings];
    const cachedAssets = await cacheReadmeAssets({
      projectId: String(projectId),
      imageRefs: parsed.imageRefs,
      context: { owner, repo, commitSha, readmePath },
      warnings,
    });
    const chunks = buildReadmeLyricChunks({
      tree: parsed.tree,
      assetMap: cachedAssets.assetMap,
      targetDurationSec: 0,
    });
    const durationSec = Math.max(1, Math.round((chunks.at(-1)?.endMs || 0) / 1000));
    const processedReadme = createProcessedReadme({
      projectId: String(projectId),
      source: {
        owner,
        repo,
        commitSha,
        readmePath,
        branch: defaultBranch,
      },
      chunks,
      durationSec,
      assets: cachedAssets.assets,
      warnings,
    });
    const writtenReadme = await writeProcessedReadme({
      projectId: String(projectId),
      commitSha,
      processedReadme,
    });
    const status = await updateProjectReadyState({
      projectRef,
      project,
      repoMeta: { ...repoMeta, defaultBranch },
      readmePath,
      commitSha,
      writtenReadme,
      processedReadme,
      warnings,
    });

    await jobRef.set({
      resolvedCommitSha: commitSha,
      status: 'success',
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      warnings,
    }, { merge: true });

    logger.info('processProjectReadme success', {
      jobId,
      projectId,
      trigger,
      commitSha,
      status,
      blockCount: chunks.length,
      durationSec,
    });

    return { ok: true, commitSha, durationSec, status, jobId };
  } catch (error) {
    let status = 'failed';
    if (error?.status === 404) {
      status = 'private_or_missing';
    } else if (isRateLimited(error)) {
      status = 'rate_limited';
    } else if (error?.message?.toLowerCase().includes('parse')) {
      status = 'parse_error';
    }

    await setProjectFailure(projectRef, status, error?.message || 'README processing failed.');
    await jobRef.set({
      status: 'failure',
      error: {
        code: status,
        message: error?.message || 'README processing failed.',
      },
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.error('processProjectReadme failure', {
      jobId,
      projectId,
      trigger,
      status,
      error: error?.message,
    });

    throw error;
  }
}

async function enqueueProcessingJob({ projectId, trigger, requestedCommitSha = null }) {
  const jobId = randomUUID();
  const jobRef = admin.firestore()
    .collection('projects')
    .doc(String(projectId))
    .collection('processingJobs')
    .doc(jobId);

  await jobRef.create({
    id: jobId,
    projectId: String(projectId),
    trigger,
    requestedCommitSha,
    resolvedCommitSha: null,
    status: 'queued',
    error: null,
    startedAt: null,
    finishedAt: null,
    attempts: 0,
    warnings: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await admin.firestore().collection('projects').doc(String(projectId)).set({
    processingStatus: 'pending',
  }, { merge: true });

  return jobId;
}

exports.processProjectReadme = onCall(
  { secrets: [GITHUB_API_TOKEN] },
  async (request) => {
    assertAdmin(request);
    const projectId = request.data?.projectId;
    if (!projectId) {
      throw new HttpsError('invalid-argument', 'projectId is required.');
    }

    const jobId = await enqueueProcessingJob({
      projectId,
      trigger: 'cms_manual',
      requestedCommitSha: request.data?.commitSha || null,
    });

    return { ok: true, jobId, queued: true };
  },
);

exports.reprocessAllReadmes = onCall(
  { secrets: [GITHUB_API_TOKEN] },
  async (request) => {
    assertAdmin(request);
    const snapshot = await admin.firestore().collection('projects').get();
    const queued = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data?.github) {
        queued.push(await enqueueProcessingJob({
          projectId: doc.id,
          trigger: 'migration',
        }));
      }
    }
    return { ok: true, queuedJobs: queued.length };
  },
);

exports.onProcessingJobCreated = onDocumentCreated(
  {
    document: 'projects/{projectId}/processingJobs/{jobId}',
    secrets: [GITHUB_API_TOKEN],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== 'queued') {
      return;
    }

    await runProcessingJob({
      projectId: event.params.projectId,
      trigger: data.trigger,
      requestedCommitSha: data.requestedCommitSha || null,
      jobId: event.params.jobId,
    });
  },
);

exports.enqueueProcessingJob = enqueueProcessingJob;
exports.runProcessingJob = runProcessingJob;
exports.GITHUB_API_TOKEN = GITHUB_API_TOKEN;

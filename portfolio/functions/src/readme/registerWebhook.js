const crypto = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { parseGithubUrl, encodeRepoKey } = require('./parseGithubUrl');

const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'portfolio-d996c';
const webhookUrl = `https://us-central1-${projectId}.cloudfunctions.net/githubWebhook`;
const GITHUB_API_TOKEN = defineSecret('GITHUB_API_TOKEN');

function assertAdmin(request) {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

function getHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'portfolio-readme-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubRequest(token, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function deleteWebhook(token, owner, repo, webhookId) {
  if (!webhookId) return;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks/${webhookId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`GitHub webhook delete failed (${response.status}): ${text}`);
  }
}

async function registerWebhookForProject({ projectId: targetProjectId, githubUrl, token, existingSource }) {
  const { owner, repo, fullName } = parseGithubUrl(githubUrl);
  const secret = crypto.randomBytes(32).toString('hex');
  const payload = {
    name: 'web',
    active: true,
    events: ['push'],
    config: {
      url: webhookUrl,
      content_type: 'json',
      secret,
      insecure_ssl: '0',
    },
  };

  const hook = await githubRequest(token, `/repos/${owner}/${repo}/hooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const db = admin.firestore();
  await db.collection('projectGithubIndex').doc(encodeRepoKey(fullName)).set({
    fullName,
    projectId: targetProjectId,
    webhookSecret: secret,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    owner,
    repo,
    fullName,
    defaultBranch: existingSource?.defaultBranch || 'main',
    readmePath: existingSource?.readmePath || 'README.md',
    lastProcessedCommitSha: existingSource?.lastProcessedCommitSha || null,
    webhookId: hook?.id || null,
    webhookRegisteredAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

exports.registerProjectWebhook = onCall(
  { secrets: [GITHUB_API_TOKEN] },
  async (request) => {
    assertAdmin(request);

    const targetProjectId = request.data?.projectId;
    if (!targetProjectId) {
      throw new HttpsError('invalid-argument', 'projectId is required.');
    }

    const db = admin.firestore();
    const projectRef = db.collection('projects').doc(String(targetProjectId));
    const snap = await projectRef.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }

    const project = snap.data();
    if (!project?.github) {
      throw new HttpsError('failed-precondition', 'Project does not have a GitHub URL.');
    }

    const token = GITHUB_API_TOKEN.value();
    const source = await registerWebhookForProject({
      projectId: String(targetProjectId),
      githubUrl: project.github,
      token,
      existingSource: project.githubSource,
    });

    await projectRef.set({
      githubSource: source,
    }, { merge: true });

    logger.info('registerProjectWebhook success', { projectId: targetProjectId, repo: source.fullName });
    return { ok: true, repo: source.fullName, webhookId: source.webhookId };
  },
);

exports.registerWebhookForProject = registerWebhookForProject;
exports.deleteWebhook = deleteWebhook;
exports.GITHUB_API_TOKEN = GITHUB_API_TOKEN;

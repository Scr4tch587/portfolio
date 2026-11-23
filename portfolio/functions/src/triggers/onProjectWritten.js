const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { parseGithubUrl, encodeRepoKey } = require('../readme/parseGithubUrl');
const { registerWebhookForProject, deleteWebhook, GITHUB_API_TOKEN } = require('../readme/registerWebhook');
const { enqueueProcessingJob, loadManualMarkdown, README_SOURCES } = require('../readme/processProjectReadme');

exports.onProjectWritten = onDocumentWritten(
  {
    document: 'projects/{projectId}',
    secrets: [GITHUB_API_TOKEN],
  },
  async (event) => {
    const before = event.data?.before?.data() || null;
    const after = event.data?.after?.data() || null;
    const projectId = event.params.projectId;

    if (!after) {
      if (before?.githubSource?.fullName && before.githubSource.webhookId) {
        const token = GITHUB_API_TOKEN.value();
        try {
          await deleteWebhook(
            token,
            before.githubSource.owner,
            before.githubSource.repo,
            before.githubSource.webhookId,
          );
          await admin.firestore().collection('projectGithubIndex').doc(encodeRepoKey(before.githubSource.fullName)).delete().catch(() => null);
        } catch (error) {
          logger.error('Failed to clean up webhook on project delete', { projectId, error: error?.message });
        }
      }
      await admin.firestore().collection(README_SOURCES).doc(projectId).delete().catch(() => null);
      return;
    }

    const githubBefore = before?.github || null;
    const githubAfter = after?.github || null;
    if (githubBefore === githubAfter) {
      return;
    }

    const token = GITHUB_API_TOKEN.value();
    const projectRef = admin.firestore().collection('projects').doc(projectId);

    if (before?.githubSource?.fullName && before.githubSource.webhookId) {
      try {
        await deleteWebhook(token, before.githubSource.owner, before.githubSource.repo, before.githubSource.webhookId);
        await admin.firestore().collection('projectGithubIndex').doc(encodeRepoKey(before.githubSource.fullName)).delete().catch(() => null);
      } catch (error) {
        logger.error('Failed to remove previous GitHub webhook', { projectId, error: error?.message });
      }
    }

    if (!githubAfter) {
      // GitHub link removed: fall back to the hand-written README if any.
      if (await loadManualMarkdown(projectId)) {
        await projectRef.set({ githubSource: null }, { merge: true });
        await enqueueProcessingJob({ projectId, trigger: 'cms_write' });
        return;
      }
      await projectRef.set({
        processingStatus: 'idle',
        githubSource: null,
        processedReadmeRef: null,
        generatedDurationSec: null,
      }, { merge: true });
      return;
    }

    try {
      const parsed = parseGithubUrl(githubAfter);

      // Webhook registration is best-effort: it needs admin rights on the
      // repo, which the PAT only has for the owner's repos. Third-party
      // repos still process fine (public README reads) — they just don't
      // auto-update on push.
      let githubSource;
      try {
        githubSource = await registerWebhookForProject({
          projectId,
          githubUrl: githubAfter,
          token,
          existingSource: {
            ...after.githubSource,
            owner: parsed.owner,
            repo: parsed.repo,
            fullName: parsed.fullName,
          },
        });
      } catch (webhookError) {
        logger.warn('Webhook registration failed; processing README without push updates', {
          projectId,
          error: webhookError?.message,
        });
        githubSource = {
          owner: parsed.owner,
          repo: parsed.repo,
          fullName: parsed.fullName,
          webhookId: null,
          webhookStatus: 'unavailable',
        };
      }

      await projectRef.set({
        githubSource,
        processingStatus: 'pending',
      }, { merge: true });

      await enqueueProcessingJob({
        projectId,
        trigger: 'cms_write',
      });
    } catch (error) {
      await projectRef.set({
        processingStatus: 'failed',
        latestProcessingError: error?.message || 'Failed to start README processing.',
      }, { merge: true });
      logger.error('onProjectWritten failure', { projectId, error: error?.message });
    }
  },
);

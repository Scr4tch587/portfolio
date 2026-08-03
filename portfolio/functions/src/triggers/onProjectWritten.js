const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { parseGithubUrl, encodeRepoKey } = require('../readme/parseGithubUrl');
const { registerWebhookForProject, deleteWebhook, GITHUB_API_TOKEN } = require('../readme/registerWebhook');
const { enqueueProcessingJob } = require('../readme/processProjectReadme');

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
      if (before?.githubSource?.fullName) {
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
      return;
    }

    const githubBefore = before?.github || null;
    const githubAfter = after?.github || null;
    if (githubBefore === githubAfter) {
      return;
    }

    const token = GITHUB_API_TOKEN.value();
    const projectRef = admin.firestore().collection('projects').doc(projectId);

    if (before?.githubSource?.fullName) {
      try {
        await deleteWebhook(token, before.githubSource.owner, before.githubSource.repo, before.githubSource.webhookId);
        await admin.firestore().collection('projectGithubIndex').doc(encodeRepoKey(before.githubSource.fullName)).delete().catch(() => null);
      } catch (error) {
        logger.error('Failed to remove previous GitHub webhook', { projectId, error: error?.message });
      }
    }

    if (!githubAfter) {
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
      const githubSource = await registerWebhookForProject({
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
        latestProcessingError: error?.message || 'Failed to register project webhook.',
      }, { merge: true });
      logger.error('onProjectWritten failure', { projectId, error: error?.message });
    }
  },
);

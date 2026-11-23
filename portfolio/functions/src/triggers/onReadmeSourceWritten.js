const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { enqueueProcessingJob, GITHUB_API_TOKEN } = require('../readme/processProjectReadme');

/**
 * A hand-written README was saved (or cleared) from the admin panel.
 * Projects with a GitHub URL keep streaming the repo's README; for the rest
 * this queues the normal processing job, so the markdown, images and timing
 * go through exactly the same pipeline as a GitHub README.
 */
exports.onReadmeSourceWritten = onDocumentWritten(
  {
    document: 'readmeSources/{projectId}',
    secrets: [GITHUB_API_TOKEN],
  },
  async (event) => {
    const projectId = event.params.projectId;
    const before = String(event.data?.before?.data()?.markdown || '').trim();
    const after = String(event.data?.after?.data()?.markdown || '').trim();
    if (before === after) return;

    const projectRef = admin.firestore().collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists || projectSnap.data()?.github) return;

    if (!after) {
      await projectRef.set({
        processingStatus: 'idle',
        processedReadmeRef: null,
        generatedDurationSec: null,
        latestProcessingError: null,
        latestProcessingWarnings: [],
      }, { merge: true });
      return;
    }

    try {
      await enqueueProcessingJob({ projectId, trigger: 'manual_write' });
    } catch (error) {
      await projectRef.set({
        processingStatus: 'failed',
        latestProcessingError: error?.message || 'Failed to start README processing.',
      }, { merge: true });
      logger.error('onReadmeSourceWritten failure', { projectId, error: error?.message });
    }
  },
);

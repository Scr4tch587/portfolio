const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { GITHUB_API_TOKEN } = require('./processProjectReadme');
const { encodeRepoKey } = require('./parseGithubUrl');
const { enqueueProcessingJob } = require('./processProjectReadme');

function verifySignature(secret, rawBody, signatureHeader) {
  if (!secret || !signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = Buffer.from(`sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`);
  const actual = Buffer.from(signatureHeader);
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

exports.githubWebhook = onRequest(
  { secrets: [GITHUB_API_TOKEN] },
  async (req, res) => {
    const eventName = req.get('x-github-event');
    const deliveryId = req.get('x-github-delivery') || crypto.randomUUID();
    const webhookRef = admin.firestore().collection('webhookEvents').doc(deliveryId);

    try {
      await webhookRef.create({
        deliveryId,
        status: 'received',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    if (eventName !== 'push') {
      await webhookRef.set({ status: 'ignored_event' }, { merge: true });
      res.status(204).send('');
      return;
    }

    const payload = req.body || {};
    const fullName = String(payload?.repository?.full_name || '').toLowerCase();
    const defaultBranch = payload?.repository?.default_branch;
    const ref = payload?.ref;
    const sha = payload?.after;
    const expectedRef = defaultBranch ? `refs/heads/${defaultBranch}` : null;

    if (!fullName) {
      await webhookRef.set({ status: 'unknown_repo' }, { merge: true });
      res.status(404).json({ error: 'Unknown repo.' });
      return;
    }

    if (expectedRef && ref !== expectedRef) {
      await webhookRef.set({ status: 'ignored_branch' }, { merge: true });
      res.status(204).send('');
      return;
    }

    const indexRef = admin.firestore().collection('projectGithubIndex').doc(encodeRepoKey(fullName));
    const indexSnap = await indexRef.get();
    if (!indexSnap.exists) {
      await webhookRef.set({ status: 'unknown_repo' }, { merge: true });
      res.status(404).json({ error: 'Unknown repo.' });
      return;
    }

    const index = indexSnap.data();
    const signatureValid = verifySignature(index.webhookSecret, req.rawBody || Buffer.from(JSON.stringify(req.body || {})), req.get('x-hub-signature-256'));
    if (!signatureValid) {
      await webhookRef.set({ status: 'rejected_signature', signatureValid: false }, { merge: true });
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const jobId = await enqueueProcessingJob({
      projectId: index.projectId,
      trigger: 'webhook',
      requestedCommitSha: sha || null,
    });

    await webhookRef.set({
      status: 'accepted',
      signatureValid: true,
      projectId: index.projectId,
      fullName,
      ref,
      sha: sha || null,
      jobId,
    }, { merge: true });

    logger.info('githubWebhook accepted', { deliveryId, fullName, ref, sha, projectId: index.projectId, jobId });
    res.status(202).json({ ok: true, jobId });
  },
);

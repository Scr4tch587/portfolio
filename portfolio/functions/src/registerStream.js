const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Best-effort per-instance throttle: the client only confirms one stream per
// playthrough (>=5s), so anything faster than one hit per few seconds per
// caller+project is not organic.
const MIN_INTERVAL_MS = 4000;
const recentCalls = new Map();

function isThrottled(key) {
  const now = Date.now();
  const last = recentCalls.get(key) || 0;
  if (now - last < MIN_INTERVAL_MS) return true;
  if (recentCalls.size > 2000) recentCalls.clear();
  recentCalls.set(key, now);
  return false;
}

exports.registerStream = onCall(async (request) => {
  const projectId = String(request.data?.projectId || '').trim();
  if (!projectId || projectId.length > 128) {
    throw new HttpsError('invalid-argument', 'projectId is required.');
  }

  const callerIp = request.rawRequest?.ip || 'unknown';
  if (isThrottled(`${callerIp}:${projectId}`)) {
    return { ok: false, throttled: true };
  }

  const projectRef = admin.firestore().collection('projects').doc(projectId);
  const snapshot = await projectRef.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Unknown project.');
  }

  await projectRef.set({ views: admin.firestore.FieldValue.increment(1) }, { merge: true });
  return { ok: true };
});

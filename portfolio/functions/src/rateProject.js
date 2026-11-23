const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const MAX_HALF_STARS = 10;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

// Best-effort per-instance throttle, same idea as registerStream: nobody
// rates faster than this by hand.
const MIN_INTERVAL_MS = 1500;
const recentCalls = new Map();

function isThrottled(key) {
  const now = Date.now();
  const last = recentCalls.get(key) || 0;
  if (now - last < MIN_INTERVAL_MS) return true;
  if (recentCalls.size > 2000) recentCalls.clear();
  recentCalls.set(key, now);
  return false;
}

/**
 * Anonymous half-star ratings. There are no accounts: each browser keeps a
 * random clientId and gets one vote per project, stored function-only at
 * projects/{projectId}/ratingVotes/{clientId}. Aggregates live on the
 * project doc, where the site reads them:
 *   ratingCount  – number of ratings
 *   ratingSum    – sum in half-stars (average stars = ratingSum / count / 2)
 *   ratingHist   – { h1..h10 } counts per half-star value
 * halfStars 0 clears the caller's vote.
 */
exports.rateProject = onCall(async (request) => {
  const projectId = String(request.data?.projectId || '').trim();
  const clientId = String(request.data?.clientId || '');
  const next = Number(request.data?.halfStars);

  if (!projectId || projectId.length > 128 || projectId.includes('/')) {
    throw new HttpsError('invalid-argument', 'projectId is required.');
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    throw new HttpsError('invalid-argument', 'clientId is invalid.');
  }
  if (!Number.isInteger(next) || next < 0 || next > MAX_HALF_STARS) {
    throw new HttpsError('invalid-argument', 'halfStars must be an integer from 0 to 10.');
  }

  const callerIp = request.rawRequest?.ip || 'unknown';
  if (isThrottled(callerIp)) {
    throw new HttpsError('resource-exhausted', 'Slow down a little.');
  }

  const db = admin.firestore();
  const projectRef = db.collection('projects').doc(projectId);
  const voteRef = projectRef.collection('ratingVotes').doc(clientId);
  const { increment, serverTimestamp } = admin.firestore.FieldValue;

  await db.runTransaction(async (transaction) => {
    const [projectSnap, voteSnap] = await Promise.all([transaction.get(projectRef), transaction.get(voteRef)]);
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Unknown project.');
    }
    const prev = voteSnap.exists ? Number(voteSnap.data()?.halfStars) || 0 : 0;
    if (prev === next) return;

    const update = { ratingSum: increment(next - prev), ratingHist: {} };
    let countDelta = 0;
    if (prev) {
      countDelta -= 1;
      update.ratingHist[`h${prev}`] = increment(-1);
    }
    if (next) {
      countDelta += 1;
      update.ratingHist[`h${next}`] = increment(1);
    }
    update.ratingCount = increment(countDelta);
    transaction.set(projectRef, update, { merge: true });

    if (next) transaction.set(voteRef, { halfStars: next, updatedAt: serverTimestamp() });
    else transaction.delete(voteRef);
  });

  return { ok: true, halfStars: next };
});

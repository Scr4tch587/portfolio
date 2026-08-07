const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'portfolio-d996c';

if (!admin.apps.length) {
  admin.initializeApp({
    serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
    storageBucket: `${projectId}.firebasestorage.app`,
  });
}

const db = admin.firestore();

// Admin auth is Google sign-in + the `admin` custom claim; the old
// passphrase-based adminIssueToken callable was retired 2026-08-07.

exports.visitorMonthlyCount = onCall({
  cors: [
    /^http:\/\/localhost:\d+$/,
    'https://kaizhang.ca',
    'https://www.kaizhang.ca',
  ],
}, async () => {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoff);

  try {
    const aggregateSnap = await db
      .collection('visitors')
      .where('lastSeen', '>=', cutoffTs)
      .count()
      .get();
    return { count: aggregateSnap.data().count || 0 };
  } catch (error) {
    throw new HttpsError('internal', error?.message || 'Unable to load visitor count.');
  }
});

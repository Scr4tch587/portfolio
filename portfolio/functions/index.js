const crypto = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Force custom-token signing through the project App Engine service account.
// This avoids ambiguous signer resolution in some Gen2 deployments.
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'portfolio-d996c';
admin.initializeApp({
  serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
});
const db = admin.firestore();

setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
});

const ADMIN_PASS_HASH_HEX = defineSecret('ADMIN_PASS_HASH_HEX');
const ADMIN_PASS_SALT_HEX = defineSecret('ADMIN_PASS_SALT_HEX');
const RATE_LIMIT_PEPPER = defineSecret('RATE_LIMIT_PEPPER');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function validateHex(input, expectedBytes, fieldName) {
  if (typeof input !== 'string' || !/^[0-9a-f]+$/i.test(input) || input.length !== expectedBytes * 2) {
    throw new HttpsError('internal', `${fieldName} is not configured correctly.`);
  }
}

function verifyPassphrase(passphrase, expectedHashHex, saltHex) {
  const derived = crypto.scryptSync(passphrase, Buffer.from(saltHex, 'hex'), 64).toString('hex');
  const expected = Buffer.from(expectedHashHex, 'hex');
  const actual = Buffer.from(derived, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

function getIp(request) {
  const xff = request.rawRequest.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }

  return request.rawRequest.ip || 'unknown';
}

async function checkAndRecordRateLimit(ip, pepper) {
  const now = Date.now();
  const key = crypto.createHash('sha256').update(`${ip}|${pepper}`).digest('hex');
  const ref = db.collection('_adminRateLimits').doc(key);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : null;

    if (!data) {
      transaction.set(ref, {
        count: 1,
        windowStartMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const windowStartMs = Number(data.windowStartMs) || now;
    const count = Number(data.count) || 0;

    if (now - windowStartMs > WINDOW_MS) {
      transaction.set(ref, {
        count: 1,
        windowStartMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    if (count >= MAX_ATTEMPTS) {
      throw new HttpsError('resource-exhausted', 'Too many attempts. Try again later.');
    }

    transaction.update(ref, {
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return ref;
}

exports.adminIssueToken = onCall(
  {
    secrets: [ADMIN_PASS_HASH_HEX, ADMIN_PASS_SALT_HEX, RATE_LIMIT_PEPPER],
  },
  async (request) => {
    const passphrase = request.data?.passphrase;
    if (typeof passphrase !== 'string' || passphrase.length < 12) {
      throw new HttpsError('invalid-argument', 'Passphrase is required.');
    }

    const expectedHashHex = ADMIN_PASS_HASH_HEX.value();
    const saltHex = ADMIN_PASS_SALT_HEX.value();
    const pepper = RATE_LIMIT_PEPPER.value();

    validateHex(expectedHashHex, 64, 'ADMIN_PASS_HASH_HEX');
    validateHex(saltHex, 16, 'ADMIN_PASS_SALT_HEX');

    const ip = getIp(request);
    const limiterRef = await checkAndRecordRateLimit(ip, pepper);

    const valid = verifyPassphrase(passphrase, expectedHashHex, saltHex);
    if (!valid) {
      throw new HttpsError('permission-denied', 'Invalid passphrase.');
    }

    await limiterRef.delete().catch(() => null);

    const token = await admin.auth().createCustomToken('portfolio-admin', {
      admin: true,
      role: 'admin',
    });

    return { token };
  },
);

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
    console.error('visitorMonthlyCount failed', error);
    throw new HttpsError('internal', 'Unable to load visitor count.');
  }
});

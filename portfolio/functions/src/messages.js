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

const MSG_WINDOW_MS = 60 * 1000;
const MSG_MAX_PER_WINDOW = 20;
const NEW_CONV_WINDOW_MS = 24 * 60 * 60 * 1000;
const NEW_CONV_MAX_PER_WINDOW = 30;

// Same transaction pattern as the admin login limiter, keyed on sender uid
// (docs live in the function-only _msgRateLimits collection).
async function checkAndRecordRateLimit(key, windowMs, maxCount, message) {
  const now = Date.now();
  const ref = db.collection('_msgRateLimits').doc(key);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : null;

    if (!data || now - (Number(data.windowStartMs) || now) > windowMs) {
      transaction.set(ref, {
        count: 1,
        windowStartMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const count = Number(data.count) || 0;
    if (count >= maxCount) {
      throw new HttpsError('resource-exhausted', message);
    }

    transaction.update(ref, {
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

exports.sendMessage = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in to send messages.');
  }

  const toUsernameRaw = String(request.data?.toUsername || '').trim();
  const text = String(request.data?.text || '').trim();
  if (!toUsernameRaw || toUsernameRaw.length > 20) {
    throw new HttpsError('invalid-argument', 'Recipient username is required.');
  }
  if (text.length < 1 || text.length > 1000) {
    throw new HttpsError('invalid-argument', 'Messages must be 1-1000 characters.');
  }

  const senderDoc = await db.collection('users').doc(uid).get();
  const senderUsername = senderDoc.exists ? senderDoc.data().username : null;
  if (!senderUsername) {
    throw new HttpsError('failed-precondition', 'Pick a username first.');
  }

  const usernameDoc = await db.collection('usernames').doc(toUsernameRaw.toLowerCase()).get();
  if (!usernameDoc.exists) {
    throw new HttpsError('not-found', 'No user with that username.');
  }
  const toUid = usernameDoc.data().uid;
  if (toUid === uid) {
    throw new HttpsError('invalid-argument', 'You cannot message yourself.');
  }

  // Neutral wording on purpose: a block must not be distinguishable from a
  // generic failure by the sender.
  const [blockedByRecipient, blockedBySender] = await Promise.all([
    db.collection('users').doc(toUid).collection('blocks').doc(uid).get(),
    db.collection('users').doc(uid).collection('blocks').doc(toUid).get(),
  ]);
  if (blockedByRecipient.exists || blockedBySender.exists) {
    throw new HttpsError('permission-denied', 'Unable to send this message.');
  }

  await checkAndRecordRateLimit(
    `msg_${uid}`,
    MSG_WINDOW_MS,
    MSG_MAX_PER_WINDOW,
    'Sending too fast. Wait a minute and try again.',
  );

  const participants = [uid, toUid].sort();
  const convId = participants.join('_');
  const convRef = db.collection('conversations').doc(convId);

  const preexisting = await convRef.get();
  if (!preexisting.exists) {
    await checkAndRecordRateLimit(
      `newconv_${uid}`,
      NEW_CONV_WINDOW_MS,
      NEW_CONV_MAX_PER_WINDOW,
      'Too many new conversations today. Try again tomorrow.',
    );
  }

  let recipientUsername = toUsernameRaw;
  const recipientDoc = await db.collection('users').doc(toUid).get();
  if (recipientDoc.exists && recipientDoc.data().username) {
    recipientUsername = recipientDoc.data().username;
  }

  await db.runTransaction(async (transaction) => {
    const convSnap = await transaction.get(convRef);
    const usernames = participants.map((participant) => (
      participant === uid ? senderUsername : recipientUsername
    ));
    const messageRef = convRef.collection('messages').doc();

    if (!convSnap.exists) {
      transaction.set(convRef, {
        participants,
        participantUsernames: usernames,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageText: text.slice(0, 120),
        lastReadAt: { [uid]: admin.firestore.FieldValue.serverTimestamp() },
      });
    } else {
      const update = {
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageText: text.slice(0, 120),
        [`lastReadAt.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
      };
      const storedUsernames = convSnap.data().participantUsernames || [];
      if (storedUsernames.join('|') !== usernames.join('|')) {
        update.participantUsernames = usernames;
      }
      transaction.update(convRef, update);
    }

    transaction.set(messageRef, {
      senderUid: uid,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { convId };
});

exports.markRead = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }

  const convId = String(request.data?.convId || '').trim();
  if (!convId || convId.length > 200) {
    throw new HttpsError('invalid-argument', 'convId is required.');
  }

  const convRef = db.collection('conversations').doc(convId);
  const snap = await convRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Conversation not found.');
  }
  if (!(snap.data().participants || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Not your conversation.');
  }

  await convRef.update({
    [`lastReadAt.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

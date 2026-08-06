import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Atomically reserve usernames/{lower} and create users/{uid}. Throws
 * Error('invalid') on bad format and Error('taken') when already reserved.
 */
export async function claimUsername(user, username) {
  const trimmed = (username || '').trim();
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error('invalid');
  }
  const lower = trimmed.toLowerCase();
  const reservationRef = doc(db, 'usernames', lower);
  const userRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (transaction) => {
    const reservation = await transaction.get(reservationRef);
    if (reservation.exists()) {
      throw new Error('taken');
    }
    transaction.set(reservationRef, { uid: user.uid });
    transaction.set(userRef, {
      username: trimmed,
      usernameLower: lower,
      displayName: user.displayName || trimmed,
      photoURL: user.photoURL || null,
      bio: '',
      createdAt: serverTimestamp(),
    });
  });
}

/** Update the editable profile fields only. */
export async function updateProfileFields(uid, fields) {
  const allowed = {};
  if (typeof fields.displayName === 'string') allowed.displayName = fields.displayName.slice(0, 60);
  if (typeof fields.bio === 'string') allowed.bio = fields.bio.slice(0, 280);
  if (Object.keys(allowed).length === 0) return;
  await updateDoc(doc(db, 'users', uid), allowed);
}

/** Upload users/{uid}/avatar, point the profile at it, return the URL. */
export async function uploadAvatar(uid, file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Avatar must be an image.');
  }
  if (file.size >= 2 * 1024 * 1024) {
    throw new Error('Avatar must be under 2MB.');
  }
  const avatarRef = ref(storage, `users/${uid}/avatar`);
  await uploadBytes(avatarRef, file, { contentType: file.type });
  const url = await getDownloadURL(avatarRef);
  await updateDoc(doc(db, 'users', uid), { photoURL: url });
  return url;
}

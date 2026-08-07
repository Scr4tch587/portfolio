import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
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

/**
 * Change the username: atomically reserve the new name, release the old one,
 * and rewrite users/{uid}. Throws Error('invalid') / Error('taken') like
 * claimUsername. Afterwards refreshes the denormalized ownerUsername on the
 * user's playlists (best-effort; conversations self-heal on next send).
 */
export async function renameUsername(user, currentLower, newUsername) {
  const trimmed = (newUsername || '').trim();
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error('invalid');
  }
  const newLower = trimmed.toLowerCase();
  const userRef = doc(db, 'users', user.uid);

  if (newLower === currentLower) {
    // Same reservation, only the display casing changes.
    await updateDoc(userRef, { username: trimmed });
  } else {
    const newRef = doc(db, 'usernames', newLower);
    const oldRef = doc(db, 'usernames', currentLower);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(newRef);
      if (existing.exists()) {
        throw new Error('taken');
      }
      transaction.set(newRef, { uid: user.uid });
      transaction.delete(oldRef);
      transaction.update(userRef, { username: trimmed, usernameLower: newLower });
    });
  }

  try {
    const owned = await getDocs(
      query(collection(db, 'playlists'), where('ownerUid', '==', user.uid)),
    );
    if (!owned.empty) {
      const batch = writeBatch(db);
      owned.docs.forEach((playlistDoc) => {
        batch.update(playlistDoc.ref, { ownerUsername: trimmed });
      });
      await batch.commit();
    }
  } catch {
    // Stale ownerUsername on playlists is cosmetic; ignore.
  }
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

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create a playlist owned by { uid, username }. Accepts an optional
 * projectIds array in meta so a playlist can be born with its first project
 * in one write. Returns the new playlist id.
 */
export async function createPlaylist({ uid, username }, { name, description = '', visibility = 'private', projectIds = [] }) {
  const ref = await addDoc(collection(db, 'playlists'), {
    ownerUid: uid,
    ownerUsername: username,
    name,
    description,
    projectIds: projectIds.map(String),
    visibility,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update name/description/visibility only; anything else is ignored. */
export async function updatePlaylistMeta(playlistId, fields) {
  const allowed = {};
  if (typeof fields.name === 'string') allowed.name = fields.name;
  if (typeof fields.description === 'string') allowed.description = fields.description;
  if (typeof fields.visibility === 'string') allowed.visibility = fields.visibility;
  await updateDoc(doc(db, 'playlists', String(playlistId)), {
    ...allowed,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlaylist(playlistId) {
  await deleteDoc(doc(db, 'playlists', String(playlistId)));
}

export async function addProjectToPlaylist(playlistId, projectId) {
  await updateDoc(doc(db, 'playlists', String(playlistId)), {
    projectIds: arrayUnion(String(projectId)),
    updatedAt: serverTimestamp(),
  });
}

export async function removeProjectFromPlaylist(playlistId, projectId) {
  await updateDoc(doc(db, 'playlists', String(playlistId)), {
    projectIds: arrayRemove(String(projectId)),
    updatedAt: serverTimestamp(),
  });
}

/** Replace the ordered projectIds array (used for reordering). */
export async function reorderPlaylist(playlistId, projectIds) {
  await updateDoc(doc(db, 'playlists', String(playlistId)), {
    projectIds: projectIds.map(String),
    updatedAt: serverTimestamp(),
  });
}

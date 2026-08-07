import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/** Prefix search over usernames (usernameLower range scan). */
export async function searchUsers(term) {
  const q = (term || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const snapshot = await getDocs(query(
    collection(db, 'users'),
    where('usernameLower', '>=', q),
    where('usernameLower', '<=', `${q}`),
    limit(5),
  ));
  return snapshot.docs.map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() }));
}

/**
 * Public-playlist search. The rules only allow list queries scoped to
 * visibility == 'public', so fetch a page and substring-match client-side —
 * fine at portfolio scale.
 */
export async function searchPublicPlaylists(term) {
  const q = (term || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const snapshot = await getDocs(query(
    collection(db, 'playlists'),
    where('visibility', '==', 'public'),
    limit(50),
  ));
  return snapshot.docs
    .map((playlistDoc) => ({ id: playlistDoc.id, ...playlistDoc.data() }))
    .filter((playlist) => (playlist.name || '').toLowerCase().includes(q))
    .slice(0, 5);
}

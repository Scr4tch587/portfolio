import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * User search across username AND display name. Firestore can't do
 * case-insensitive contains and displayName has no lowercased twin, so fetch
 * a page and substring-match client-side — fine at portfolio scale.
 */
export async function searchUsers(term) {
  const q = (term || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const snapshot = await getDocs(query(collection(db, 'users'), limit(100)));
  return snapshot.docs
    .map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() }))
    .filter((person) => (
      (person.usernameLower || '').includes(q)
      || (person.displayName || '').toLowerCase().includes(q)
    ))
    .slice(0, 5);
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

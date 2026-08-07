import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const SEEN_KEY = 'notifFollowSeenAt';
const SEEN_EVENT = 'notifFollowSeen';

const readSeenAt = () => {
  try {
    return Number(localStorage.getItem(SEEN_KEY) || 0);
  } catch {
    return 0;
  }
};

/**
 * Recent followers of the signed-in user, resolved to profiles, with a
 * localStorage-backed "seen" watermark shared across hook instances (the
 * TopBar badge and the notifications panel both consume this).
 */
export function useFollowerNotifications(max = 10) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [seenAt, setSeenAt] = useState(readSeenAt);
  const profileCacheRef = useRef(new Map());

  useEffect(() => {
    const sync = () => setSeenAt(readSeenAt());
    window.addEventListener(SEEN_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SEEN_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowers([]);
      return undefined;
    }
    const recent = query(
      collection(db, 'users', user.uid, 'followers'),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const unsubscribe = onSnapshot(recent, async (snapshot) => {
      const rows = await Promise.all(snapshot.docs.map(async (followerDoc) => {
        const uid = followerDoc.id;
        let profile = profileCacheRef.current.get(uid);
        if (!profile) {
          profile = await getDoc(doc(db, 'users', uid))
            .then((snap) => (snap.exists() ? snap.data() : null))
            .catch(() => null);
          if (profile) profileCacheRef.current.set(uid, profile);
        }
        if (!profile) return null;
        const createdAt = followerDoc.data()?.createdAt;
        return {
          uid,
          username: profile.username,
          displayName: profile.displayName || profile.username,
          photoURL: profile.photoURL || null,
          createdAtMs: createdAt?.toMillis?.() ?? Date.now(),
          createdAtDate: createdAt?.toDate?.() ?? new Date(),
        };
      }));
      setFollowers(rows.filter(Boolean));
    }, () => setFollowers([]));
    return () => unsubscribe();
  }, [user, max]);

  const newCount = followers.filter((f) => f.createdAtMs > seenAt).length;

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // Private mode — the dot just stays until reload.
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  };

  return { followers, newCount, seenAt, markSeen };
}

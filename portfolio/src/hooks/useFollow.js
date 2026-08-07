import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/** Follower/following counts for a profile; call refresh() after a toggle. */
export function useFollowStats(uid) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const [followersSnap, followingSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users', uid, 'followers')),
        getCountFromServer(collection(db, 'users', uid, 'following')),
      ]);
      setFollowers(followersSnap.data().count);
      setFollowing(followingSnap.data().count);
    } catch {
      // Counts stay at their last value on transient errors.
    }
  }, [uid]);

  useEffect(() => {
    setFollowers(0);
    setFollowing(0);
    refresh();
  }, [refresh]);

  return { followers, following, refresh };
}

/** Live "am I following this profile?" state for the signed-in viewer. */
export function useIsFollowing(targetUid) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!user || !targetUid || user.uid === targetUid) {
      setIsFollowing(false);
      return undefined;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'users', targetUid, 'followers', user.uid),
      (snapshot) => setIsFollowing(snapshot.exists()),
      () => setIsFollowing(false),
    );
    return () => unsubscribe();
  }, [user, targetUid]);

  return isFollowing;
}

/** Follow: write both sides of the graph; unfollow: remove both. */
export async function setFollowing(myUid, targetUid, follow) {
  const followerRef = doc(db, 'users', targetUid, 'followers', myUid);
  const followingRef = doc(db, 'users', myUid, 'following', targetUid);
  if (follow) {
    const batch = writeBatch(db);
    batch.set(followerRef, { createdAt: serverTimestamp() });
    batch.set(followingRef, { createdAt: serverTimestamp() });
    await batch.commit();
  } else {
    await Promise.all([deleteDoc(followerRef), deleteDoc(followingRef)]);
  }
}

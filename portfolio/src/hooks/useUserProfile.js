import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Live view of the signed-in user's own profile doc. needsUsername is true
 * once auth + the first snapshot agree the account has no users/{uid} doc yet.
 */
export function useMyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? { uid: user.uid, ...snapshot.data() } : null);
        setLoading(false);
      },
      () => {
        setProfile(null);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  return {
    profile,
    loading,
    needsUsername: Boolean(user) && !loading && !profile,
  };
}

/**
 * Public profile lookup: usernames/{lower} -> live users/{uid} subscription.
 */
export function useProfileByUsername(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const lower = (username || '').trim().toLowerCase();
    if (!lower) {
      setProfile(null);
      setLoading(false);
      setNotFound(true);
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = null;
    setProfile(null);
    setLoading(true);
    setNotFound(false);

    getDoc(doc(db, 'usernames', lower))
      .then((reservation) => {
        if (cancelled) return;
        const uid = reservation.exists() ? reservation.data()?.uid : null;
        if (!uid) {
          setLoading(false);
          setNotFound(true);
          return;
        }
        unsubscribe = onSnapshot(
          doc(db, 'users', uid),
          (snapshot) => {
            if (cancelled) return;
            if (snapshot.exists()) {
              setProfile({ uid, ...snapshot.data() });
              setNotFound(false);
            } else {
              setProfile(null);
              setNotFound(true);
            }
            setLoading(false);
          },
          () => {
            if (cancelled) return;
            setProfile(null);
            setLoading(false);
            setNotFound(true);
          },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setNotFound(true);
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [username]);

  return { profile, loading, notFound };
}

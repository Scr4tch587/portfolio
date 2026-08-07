import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const decodeSnapshot = (snapshot) =>
  snapshot.docs.map((playlistDoc) => ({ id: playlistDoc.id, ...playlistDoc.data() }));

/** Live list of the signed-in user's playlists, newest activity first. */
export function useMyPlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const myPlaylists = query(
      collection(db, 'playlists'),
      where('ownerUid', '==', user.uid),
      orderBy('updatedAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      myPlaylists,
      (snapshot) => {
        setPlaylists(decodeSnapshot(snapshot));
        setLoading(false);
      },
      () => {
        setPlaylists([]);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  return { playlists, loading };
}

/**
 * Live single-playlist subscription. Rules deny reads of private playlists
 * to non-owners, so permission errors surface as notFound (re-subscribes on
 * auth changes so signing in as the owner recovers).
 */
export function usePlaylist(playlistId) {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!playlistId) {
      setPlaylist(null);
      setNotFound(true);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setNotFound(false);

    let cancelled = false;
    let unsubscribe = null;
    let retryTimer = null;
    let attempts = 0;

    const subscribe = () => {
      if (unsubscribe) unsubscribe();
      unsubscribe = onSnapshot(
        doc(db, 'playlists', String(playlistId)),
        (snapshot) => {
          if (cancelled) return;
          attempts = 0;
          if (snapshot.exists()) {
            setPlaylist({ id: snapshot.id, ...snapshot.data() });
            setNotFound(false);
          } else {
            setPlaylist(null);
            setNotFound(true);
          }
          setLoading(false);
        },
        () => {
          if (cancelled) return;
          // Errors here are usually a private playlist read by a non-owner,
          // but can also be transient (an owner's fresh auth token not yet on
          // the listen stream) — retry briefly before declaring notFound.
          if (attempts < 3) {
            attempts += 1;
            retryTimer = setTimeout(subscribe, 700 * attempts);
            return;
          }
          setPlaylist(null);
          setNotFound(true);
          setLoading(false);
        },
      );
    };
    subscribe();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [playlistId, user]);

  return { playlist, loading, notFound };
}

/** Live list of a user's public playlists (for profile pages). */
export function usePublicPlaylistsOf(uid) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPlaylists([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const publicPlaylists = query(
      collection(db, 'playlists'),
      where('ownerUid', '==', uid),
      where('visibility', '==', 'public'),
      orderBy('updatedAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      publicPlaylists,
      (snapshot) => {
        setPlaylists(decodeSnapshot(snapshot));
        setLoading(false);
      },
      () => {
        setPlaylists([]);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [uid]);

  return { playlists, loading };
}

import { useEffect, useRef } from 'react';
import { buildHash, parseHash, subscribeHash } from '../lib/hashRoute';
import { usePlayer } from '../context/PlayerContext';

/**
 * Two-way sync between the URL hash and the mainView state machine, so
 * playlists and profiles are shareable links (GitHub Pages-safe).
 * Renders nothing.
 */
const HashRouter = () => {
  const { mainView, viewParams, openPlaylist, openProfile } = usePlayer();
  const applyingHashRef = useRef(false);

  // Hash -> view (initial load + back/forward/hand-edited hashes).
  useEffect(() => {
    const apply = (route) => {
      if (!route) return;
      applyingHashRef.current = true;
      if (route.view === 'playlist') openPlaylist(route.playlistId);
      else if (route.view === 'user') openProfile(route.username);
      applyingHashRef.current = false;
    };
    apply(parseHash(window.location.hash));
    return subscribeHash(apply);
    // openPlaylist/openProfile are stable per provider render; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // View -> hash (replaceState so browsing doesn't spam history; it also
  // doesn't retrigger hashchange, so no sync loop).
  useEffect(() => {
    if (applyingHashRef.current) return;
    let route = null;
    if (mainView === 'playlist' && viewParams.playlistId) {
      route = { view: 'playlist', playlistId: viewParams.playlistId };
    } else if (mainView === 'profile' && viewParams.username) {
      route = { view: 'user', username: viewParams.username };
    }
    const built = buildHash(route) || '';
    const nextHash = built && !built.startsWith('#') ? `#${built}` : built;
    if (nextHash === (window.location.hash || '')) return;
    const base = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', base + nextHash);
  }, [mainView, viewParams]);

  return null;
};

export default HashRouter;

/**
 * Tiny hash-routing shim for shareable URLs on GitHub Pages:
 *   #/playlist/{id} -> { view: 'playlist', playlistId }
 *   #/u/{username}  -> { view: 'user', username }
 * The app keeps mainView as the source of truth and syncs it to the hash.
 */

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const segments = raw.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  const [kind, value] = segments;
  if (kind === 'playlist' && value) {
    return { view: 'playlist', playlistId: decodeURIComponent(value) };
  }
  if (kind === 'u' && value) {
    return { view: 'user', username: decodeURIComponent(value) };
  }
  return null;
}

export function buildHash(route) {
  if (!route) return '';
  if (route.view === 'playlist' && route.playlistId) {
    return `#/playlist/${encodeURIComponent(route.playlistId)}`;
  }
  if (route.view === 'user' && route.username) {
    return `#/u/${encodeURIComponent(route.username)}`;
  }
  return '';
}

export function subscribeHash(cb) {
  const handler = () => cb(parseHash(window.location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

/**
 * Two skins, one site. 'spotify' is the default for first-time visitors;
 * the last mode a browser left the site in is remembered. Deep links win
 * over the memory: any #/lb… hash opens Letterboxd.
 */
export const MODE_SPOTIFY = 'spotify';
export const MODE_LETTERBOXD = 'letterboxd';

const STORAGE_KEY = 'siteMode';

export function readStoredMode() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === MODE_LETTERBOXD ? MODE_LETTERBOXD : value === MODE_SPOTIFY ? MODE_SPOTIFY : null;
  } catch {
    return null;
  }
}

export function storeMode(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private windows / blocked storage: the preference just doesn't stick.
  }
}

export function isLetterboxdHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  return raw === '/lb' || raw.startsWith('/lb/');
}

export function resolveInitialMode(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  if (isLetterboxdHash(hash)) return MODE_LETTERBOXD;
  return readStoredMode() || MODE_SPOTIFY;
}

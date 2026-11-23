import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MODE_LETTERBOXD, MODE_SPOTIFY, isLetterboxdHash, resolveInitialMode, storeMode } from '../lib/siteMode';

const ModeContext = createContext({
  mode: MODE_SPOTIFY,
  switching: false,
  hasSwitched: false,
  switchTo: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteMode = () => useContext(ModeContext);

const FADE_MS = 280;

/**
 * Owns which skin is mounted and the fade-through-black between them. The
 * mode is remembered per browser; deep links override the memory on load
 * (see siteMode.js) and, once followed, become the new memory.
 */
export const ModeProvider = ({ children }) => {
  const [mode, setMode] = useState(resolveInitialMode);
  const [switching, setSwitching] = useState(false);
  const [hasSwitched, setHasSwitched] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    storeMode(mode);
  }, [mode]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // A hash typed or followed in-page (no reload) is still a deep link:
  // #/lb… means Letterboxd.
  useEffect(() => {
    const onHashChange = () => {
      if (isLetterboxdHash(window.location.hash)) setMode(MODE_LETTERBOXD);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /**
   * @param {'spotify'|'letterboxd'} next
   * @param {{ hash?: string, onSwitched?: () => void }} options
   *   hash: the URL hash the target skin should open on (defaults to home).
   *   onSwitched: runs right before the target skin mounts, for state the
   *   target keeps outside the URL (e.g. selecting a project in Spotify).
   */
  const switchTo = useCallback((next, options = {}) => {
    if (next !== MODE_SPOTIFY && next !== MODE_LETTERBOXD) return;
    if (switching) return;
    const { hash = '', onSwitched } = options;
    setSwitching(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (onSwitched) onSwitched();
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', base + (hash || ''));
      // Same-document hash edits via replaceState don't fire hashchange;
      // the target skin reads the hash on mount, so nothing else to do.
      setMode(next);
      setHasSwitched(true);
      window.scrollTo(0, 0);
      timerRef.current = setTimeout(() => setSwitching(false), 40);
    }, FADE_MS);
  }, [switching]);

  const value = useMemo(() => ({ mode, switching, hasSwitched, switchTo }), [mode, switching, hasSwitched, switchTo]);

  return (
    <ModeContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[10000] bg-black pointer-events-none"
        style={{ opacity: switching ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      />
    </ModeContext.Provider>
  );
};

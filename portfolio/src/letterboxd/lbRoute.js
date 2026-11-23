import { useCallback, useEffect, useState } from 'react';

/**
 * Letterboxd-mode routes all live under #/lb so a shared link opens in the
 * right skin:
 *   #/lb                      home (Kai's profile)
 *   #/lb/films                browse
 *   #/lb/film/{slug}          film page
 *   #/lb/journal              README long-reads
 *   #/lb/journal/{slug}       one article
 *   #/lb/search/{query}       search results
 */
export const LB_HOME = '#/lb';

export function parseLbHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const segments = raw.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  if (segments[0] !== 'lb') return { page: 'home' };
  const [, kind, value] = segments;
  if (!kind) return { page: 'home' };
  if (kind === 'films') return { page: 'films' };
  if (kind === 'film' && value) return { page: 'film', slug: value };
  if (kind === 'journal') return value ? { page: 'article', slug: value } : { page: 'journal' };
  if (kind === 'search') return { page: 'search', query: value || '' };
  return { page: 'home' };
}

export const lbHref = {
  home: () => LB_HOME,
  films: () => '#/lb/films',
  film: (slug) => `#/lb/film/${encodeURIComponent(slug)}`,
  journal: () => '#/lb/journal',
  article: (slug) => `#/lb/journal/${encodeURIComponent(slug)}`,
  search: (q) => `#/lb/search/${encodeURIComponent(q)}`,
};

export function navigateLb(href) {
  window.location.hash = href;
}

export function useLbRoute() {
  const [route, setRoute] = useState(() => parseLbHash(window.location.hash));

  useEffect(() => {
    const handler = () => {
      setRoute(parseLbHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((href) => navigateLb(href), []);
  return { route, navigate };
}

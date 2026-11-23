import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useSiteMode } from '../context/ModeContext';
import { MODE_SPOTIFY } from '../lib/siteMode';
import { lbHref, navigateLb } from './lbRoute';
import { findProjectBySlug } from './lbData';
import LbMark from './LbMark';

const NAV = [
  { label: 'Journal', href: lbHref.journal() },
];

/**
 * Site-wide header, Letterboxd style: mark + wordmark, then the uppercase
 * nav, a search field, and the "switch to Spotify" item where Letterboxd
 * keeps "+ LOG". `route` lets the switch land on the matching Spotify view.
 */
export default function LbHeader({ route }) {
  const { switchTo } = useSiteMode();
  const { allProjectsList, playProject, setIsPlaying, goHome } = usePlayer();
  const [query, setQuery] = useState('');
  const handleSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigateLb(lbHref.search(q));
    setQuery('');
  };

  // Carry the current screen across to its Spotify counterpart.
  const switchToSpotify = () => {
    if (route.page === 'film' || route.page === 'article') {
      const project = findProjectBySlug(allProjectsList, route.slug);
      if (project) {
        switchTo(MODE_SPOTIFY, {
          onSwitched: () => {
            goHome();
            // Select without counting a stream: the visitor hasn't pressed play.
            playProject(project, { countStream: false, switchView: route.page === 'article', openSidebar: true });
            setIsPlaying(false);
          },
        });
        return;
      }
    }
    switchTo(MODE_SPOTIFY, { onSwitched: goHome });
  };

  return (
    <header className="bg-lb-bg">
      <div className="mx-auto flex h-[72px] max-w-[950px] items-center gap-6 px-4">
        <a href={lbHref.home()} className="flex items-center gap-2.5 text-lb-heading" aria-label="Kaizhang home">
          <LbMark size={26} />
          <span className="lb-wordmark">Kaizhang</span>
        </a>

        <nav className="ml-auto flex items-center gap-5 text-[13px] font-bold uppercase tracking-[0.04em] text-lb-text">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} className="hover:text-white">{item.label}</a>
          ))}

          <form onSubmit={handleSearch} className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="h-[30px] w-[150px] rounded-full bg-lb-panel pl-3 pr-8 text-[13px] font-normal normal-case tracking-normal text-lb-heading placeholder:text-lb-muted focus:w-[190px] focus:bg-lb-heading focus:text-lb-bg focus:outline-none focus:placeholder:text-lb-muted transition-[width,background-color]"
            />
            <button type="submit" aria-label="Search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lb-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7" /><path d="M16 16l5.5 5.5" strokeLinecap="round" /></svg>
            </button>
          </form>

          <button
            type="button"
            onClick={switchToSpotify}
            className="group inline-flex h-[30px] items-stretch overflow-hidden rounded-[4px] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
            aria-label="Switch to Spotify mode"
            title="Switch to Spotify mode"
          >
            {/* Letterboxd's "+ LOG" split button, with the Spotify logo in place of the label. */}
            <span className="flex items-center bg-[#44ab3b] px-3.5 transition-colors group-hover:bg-[#4fb946]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
            </span>
            <span className="flex w-[30px] items-center justify-center bg-[#5ab552] transition-colors group-hover:bg-[#66c25e]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}

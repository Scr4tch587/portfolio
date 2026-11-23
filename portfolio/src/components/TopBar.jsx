import React, { useMemo, useRef, useState } from 'react';
import { SpBrowse, SpHome, SpPlay, SpSearchGlyph } from './icons/SpotifyIcons';
import { usePlayer } from '../context/PlayerContext';
import { useSiteMode } from '../context/ModeContext';
import { MODE_LETTERBOXD } from '../lib/siteMode';
import { lbHref } from '../letterboxd/lbRoute';
import { projectSlug } from '../letterboxd/lbData';
import LbMark from '../letterboxd/LbMark';
import SearchOverlay from './SearchOverlay';

const TopBar = ({ scrollY }) => {
  const {
    allProjectsList,
    searchProjects,
    searchQuery,
    setSearchQuery,
    playProject,
    playRandomProject,
    openDiscographyAll,
    goHome,
    mainView,
    currentProject,
    rightSidebarOpen,
  } = usePlayer();

  const { switchTo } = useSiteMode();

  // Land on the film page of whatever is selected, else the Letterboxd home.
  const switchToLetterboxd = () => {
    const showingProject = currentProject && (mainView === 'lyrics' || rightSidebarOpen);
    switchTo(MODE_LETTERBOXD, { hash: showingProject ? lbHref.film(projectSlug(currentProject)) : lbHref.home() });
  };
  const [focused, setFocused] = useState(false);
  const searchInputRef = useRef(null);

  const results = useMemo(
    () => searchProjects(searchQuery, allProjectsList),
    [allProjectsList, searchProjects, searchQuery],
  );

  const handleSelect = (project) => {
    playProject(project);
    setSearchQuery('');
    setFocused(false);
  };

  const handleFocusSearch = () => {
    setFocused(true);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Spotify-style compact artist header: fades in once the hero scrolls away.
  const showCompactHeader = scrollY > 340;

  return (
    <header
      className={`topbar h-16 sticky top-0 z-40 px-4 md:px-6 flex items-center gap-4 ${scrollY > 64 ? 'bg-[#121212]/96' : 'bg-transparent'}`}
    >
      <div
        className={`absolute left-4 md:left-6 top-1/2 -translate-y-1/2 hidden xl:flex items-center gap-3 transition-opacity duration-200 ${showCompactHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          type="button"
          onClick={playRandomProject}
          className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0"
          aria-label="Play a random project"
          tabIndex={showCompactHeader ? 0 : -1}
        >
          <SpPlay size={20} className="text-black" />
        </button>
        <span className="text-2xl font-bold truncate max-w-[220px]">Kai Zhang</span>
      </div>

      <div className="flex-1 max-w-[540px] mx-auto flex items-center gap-2">
        <button
          type="button"
          onClick={goHome}
          className="w-12 h-12 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-105 transition-all flex items-center justify-center text-[#b3b3b3] hover:text-white shrink-0"
          aria-label="Home"
        >
          <SpHome size={24} />
        </button>

        <div className="flex-1 relative">
          <div className="h-12 rounded-full bg-[#242424] flex items-center px-4 border border-transparent focus-within:border-[#535353]">
            <button
              type="button"
              onClick={handleFocusSearch}
              className="relative group text-gray-400 hover:text-white shrink-0"
              aria-label="Search"
            >
              <SpSearchGlyph size={20} />
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Search
              </span>
            </button>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="What do you want to play?"
              className="bg-transparent outline-none text-white text-[15px] px-3 w-full placeholder:text-[#b3b3b3]"
            />
            <div className="h-6 w-px bg-white/15 mr-2" />
            <button
              type="button"
              onClick={openDiscographyAll}
              className="relative group text-gray-400 hover:text-white shrink-0"
              aria-label="Open all discography"
            >
              <SpBrowse size={20} />
              <span className="pointer-events-none absolute top-full right-0 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Explore
              </span>
            </button>
          </div>

          {focused && searchQuery.trim() && (
            <SearchOverlay
              results={results}
              onSelect={handleSelect}
              onClose={() => setFocused(false)}
            />
          )}
        </div>
      </div>

      <div className="shrink-0 hidden md:flex items-center gap-7 text-gray-300">
        <button
          type="button"
          onClick={switchToLetterboxd}
          className="lb-switch group flex items-center gap-2"
          aria-label="Switch to Letterboxd mode"
        >
          <span className="lb-switch-hint flex items-center gap-1 text-xs font-medium text-[#8a8a8a] transition-colors group-hover:text-white" aria-hidden="true">
            try me
            <svg className="lb-switch-arrow" width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 8.5C5 3.5 11 3 17.5 6" />
              <path d="M13.5 2.5 18 6.2l-5 2.6" />
            </svg>
          </span>
          <span className="lb-switch-mark flex h-9 items-center rounded-full bg-[#14181c] px-2.5 ring-1 ring-white/10 transition-transform group-hover:scale-110">
            <LbMark size={14} />
          </span>
        </button>
      </div>

    </header>
  );
};

export default TopBar;

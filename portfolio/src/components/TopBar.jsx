import React, { useMemo, useRef, useState } from 'react';
import { Bell, House, LayoutGrid, Play, Search, User } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
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
    openWhatsNew,
    goHome,
  } = usePlayer();

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
          <Play size={20} fill="black" className="ml-0.5 text-black" />
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
          <House size={22} />
        </button>

        <div className="flex-1 relative">
          <div className="h-12 rounded-full bg-[#242424] flex items-center px-4 border border-transparent focus-within:border-[#535353]">
            <button
              type="button"
              onClick={handleFocusSearch}
              className="relative group text-gray-400 hover:text-white shrink-0"
              aria-label="Search"
            >
              <Search size={18} />
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
              <LayoutGrid size={18} />
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
        <div className="relative group">
          <button
            type="button"
            onClick={openWhatsNew}
            className="hover:text-white"
            aria-label="What's new"
          >
            <Bell size={17} />
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            What&apos;s new
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <div className="relative group">
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-105 transition-all flex items-center justify-center text-gray-300 hover:text-white"
            aria-label="Profile"
          >
            <span className="w-8 h-8 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-center">
              <User size={16} />
            </span>
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Coming Soon
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

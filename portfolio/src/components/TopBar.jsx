import React, { useMemo, useRef, useState } from 'react';
import { Bell, LayoutGrid, Search, User } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SearchOverlay from './SearchOverlay';

const TopBar = ({ scrollY }) => {
  const {
    allProjectsList,
    searchProjects,
    searchQuery,
    setSearchQuery,
    playProject,
    openDiscographyAll,
    openWhatsNew,
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

  return (
    <header
      className={`topbar h-16 sticky top-0 z-40 px-4 md:px-6 flex items-center gap-4 ${scrollY > 64 ? 'bg-[#121212]/96' : 'bg-transparent'}`}
    >
      <div className="flex-1 max-w-[480px] mx-auto relative">
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
            className="w-9 h-9 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-center text-gray-300 hover:text-white"
            aria-label="Profile"
          >
            <User size={18} />
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

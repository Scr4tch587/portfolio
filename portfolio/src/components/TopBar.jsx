import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { SpBell, SpBrowse, SpHome, SpPlay, SpSearchGlyph } from './icons/SpotifyIcons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useMyProfile } from '../hooks/useUserProfile';
import { useConversations } from '../hooks/useConversations';
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
    openProfile,
    openMessages,
  } = usePlayer();

  const { user, signInWithGoogle, signOutUser } = useAuth();
  const { profile } = useMyProfile();
  const { unreadCount } = useConversations();
  const [focused, setFocused] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  const handleAccountClick = async () => {
    if (user) {
      setAccountMenuOpen((prev) => !prev);
      return;
    }
    try {
      await signInWithGoogle();
    } catch {
      // Popup dismissed or blocked — stay signed out silently.
    }
  };

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
        <div className="relative group">
          <button
            type="button"
            onClick={openWhatsNew}
            className="hover:text-white"
            aria-label="What's new"
          >
            <SpBell size={16} />
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            What&apos;s new
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <div className="relative group" ref={accountMenuRef}>
          <button
            type="button"
            onClick={handleAccountClick}
            className="w-12 h-12 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-105 transition-all flex items-center justify-center text-gray-300 hover:text-white"
            aria-label={user ? 'Account menu' : 'Sign in with Google'}
          >
            <span className="w-8 h-8 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-black" aria-label={`${unreadCount} unread conversations`} />
            )}
          </button>
          {!accountMenuOpen && (
            <span className="pointer-events-none absolute top-full right-0 mt-2 text-xs bg-[#282828] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {user ? user.displayName || user.email : 'Sign in with Google'}
            </span>
          )}
          {accountMenuOpen && user && (
            <div className="absolute top-full right-0 mt-2 w-48 rounded-md bg-[#282828] shadow-xl py-1 z-50">
              {profile?.username && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    openProfile(profile.username);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10"
                >
                  Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  openMessages({});
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center justify-between"
              >
                Messages
                {unreadCount > 0 && (
                  <span className="min-w-4 h-4 px-1 bg-green-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAccountMenuOpen(false);
                  await signOutUser();
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;

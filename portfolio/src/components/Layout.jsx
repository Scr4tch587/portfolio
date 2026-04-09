import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import RightSidebar from './RightSidebar';
import PlayerBar from './PlayerBar';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import LikedSongsModal from './LikedSongsModal';
import WhatsNewMenu from './WhatsNewMenu';
import { usePlayer } from '../context/PlayerContext';

const Layout = ({ children }) => {
  const { rightSidebarOpen, toggleRightSidebar, currentProject, togglePlay } = usePlayer();
  const mainRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const timeoutRef = useRef(null);

  const handleMainScroll = () => {
    const el = mainRef.current;
    if (el) setScrollY(el.scrollTop);
    setIsScrolling(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsScrolling(false), 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Spacebar toggles play/pause when a track is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'Space') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!currentProject) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, togglePlay]);

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-sans text-white flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 p-2 gap-2 overflow-hidden pb-[84px]">
        <LeftSidebar />

        <div className="flex-1 flex flex-col bg-[#121212] rounded-lg overflow-hidden relative">
          <TopBar scrollY={scrollY} />
          <main
            ref={mainRef}
            onScroll={handleMainScroll}
            className={`flex-1 overflow-y-auto custom-scrollbar relative ${isScrolling ? 'scrolling' : ''}`}
          >
            {children}
          </main>
        </div>

        {rightSidebarOpen ? (
          <RightSidebar onClose={toggleRightSidebar} />
        ) : (
          <button
            type="button"
            onClick={toggleRightSidebar}
            className="hidden lg:flex items-center justify-center w-8 bg-[#121212] rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0 border border-white/5"
            aria-label="Expand now playing view"
          >
            <ChevronLeft size={15} className="text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <PlayerBar />
      <LikedSongsModal />
      <WhatsNewMenu />
    </div>
  );
};

export default Layout;

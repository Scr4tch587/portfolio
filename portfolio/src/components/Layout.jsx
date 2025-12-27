import React, { useRef, useEffect, useState } from 'react';
import RightSidebar from './RightSidebar';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import { usePlayer } from '../context/PlayerContext';

const Layout = ({ children }) => {
  const { currentProject } = usePlayer();
  const mainRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

              timeoutRef.current = setTimeout(() => {
              setIsScrolling(false);
            }, 500);    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-black min-h-screen font-sans text-white flex flex-col h-screen overflow-hidden">
      <Sidebar />
        {/* Main Content Area + Right Sidebar */}
      <div className={`flex flex-1 p-2 ml-64 ${currentProject ? 'gap-2' : ''} overflow-hidden ${currentProject ? 'pb-24' : ''}`}>
            
            {/* Main Center Panel */}
            <main 
                ref={mainRef}
                className={`flex-1 bg-[#121212] rounded-lg overflow-y-auto custom-scrollbar relative ${isScrolling ? 'scrolling' : ''}`}
            >
                {children}
            </main>
            
            {/* Right Sidebar (Only shows if there's an active project or if we want it persistently there) */}
            {currentProject && <RightSidebar />}
        </div>

        {/* Fixed Player Bar */}
        {currentProject && <PlayerBar />}
    </div>
  );
};

export default Layout;
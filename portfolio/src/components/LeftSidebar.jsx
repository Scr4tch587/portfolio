import React from 'react';
import { Heart, Library, Play, Volume2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import squareLogo from '../assets/square_logo.png';

const LeftSidebar = () => {
  const { recentlyPlayed, currentProject, isPlaying, playProject, likedCount, openLikedSongs, openDiscographyAll, goHome } = usePlayer();

  return (
    <aside className="hidden md:flex w-[72px] bg-[#121212] rounded-lg p-2 flex-col gap-1 items-center overflow-y-auto custom-scrollbar shrink-0">
      <button type="button" onClick={goHome} className="w-10 h-10 rounded-full overflow-hidden mb-2 ring-1 ring-white/10" aria-label="Go to home">
        <img src={squareLogo} alt="Kai Zhang" className="w-full h-full object-cover" />
      </button>
      <button
        type="button"
        onClick={openDiscographyAll}
        className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1f1f1f]"
        aria-label="Library"
      >
        <Library size={20} />
      </button>

      <div className="w-8 h-px bg-[#282828] my-2" />

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 items-center">
        {recentlyPlayed.map((project) => {
          const isActive = currentProject?.id === project.id;
          const isActiveAndPlaying = isActive && isPlaying;
          return (
            <div key={project.id} className="relative group">
              <button
                type="button"
                onClick={() => playProject(project)}
                className="w-12 h-12 rounded overflow-hidden shrink-0 relative cursor-pointer transition-transform duration-150 hover:scale-105 ring-1 ring-white/10 hover:ring-white/30"
                aria-label={project.title}
                title={project.title}
              >
                <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" fill="currentColor" />
                </div>
                {isActiveAndPlaying && (
                  <div className="absolute inset-0 rounded bg-black/60 flex items-center justify-center">
                    <Volume2 size={30} className="text-green-500" />
                  </div>
                )}
              </button>
              <div className="sidebar-tooltip pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#282828] px-2 py-1 rounded text-xs text-white whitespace-nowrap z-50">
                {project.title}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto" />

      <button
        type="button"
        onClick={openLikedSongs}
        className="w-12 h-12 rounded bg-linear-to-br from-[#5f66ea] to-[#a6d6d1] flex items-center justify-center relative mb-1 cursor-pointer hover:scale-105 transition-transform"
        aria-label="Open liked songs"
      >
        <Heart size={14} fill="white" className="text-white" />
        {likedCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {likedCount > 9 ? '9+' : likedCount}
          </span>
        )}
      </button>
    </aside>
  );
};

export default LeftSidebar;

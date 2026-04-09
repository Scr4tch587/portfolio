import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Mic2, LayoutList, Volume2, Maximize2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import LikeButton from './LikeButton';

const PlayerBar = () => {
  const {
    currentProject,
    isPlaying,
    togglePlay,
    currentTime,
    durationSeconds,
    toggleLike,
    isLiked,
    isShuffleOn,
    toggleShuffle,
    playNextProject,
    playPreviousProject,
  } = usePlayer();
  if (!currentProject) return null;

  const formatTime = (seconds) => {
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;
  const title = currentProject?.title || '';
  const artist = currentProject?.artist || 'Kai Zhang';

  return (
    <div className="h-[80px] bg-black border-t border-[#282828] px-4 md:px-5 flex items-center justify-between fixed bottom-0 w-full z-50 text-white animate-fade-in-up">
      
      {/* Left: Project Info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
        <div className="w-12 h-12 bg-[#1c1c1c] rounded-[4px] flex items-center justify-center shrink-0 overflow-hidden">
             {currentProject?.image ? (
               <img src={currentProject?.image} alt={title} className="w-full h-full object-cover" />
             ) : (
               <span className="font-bold text-sm">{title ? title[0] : ''}</span>
             )}        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-medium text-sm hover:underline cursor-pointer truncate">{title}</span>
          <span className="text-xs text-[#b3b3b3] hover:underline cursor-pointer hover:text-white transition-colors truncate">
            {artist}
          </span>
        </div>
        <div className="ml-3">
          <LikeButton
            isLiked={isLiked(currentProject?.id)}
            onToggle={() => toggleLike(currentProject?.id)}
            ariaLabel={isLiked(currentProject?.id) ? 'Unlike' : 'Like'}
            size={20}
          />
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex flex-col items-center max-w-[40%] w-full gap-1.5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={toggleShuffle} aria-label={isShuffleOn ? 'Disable shuffle' : 'Enable shuffle'}>
            <Shuffle size={16} className={`${isShuffleOn ? 'text-green-500' : 'text-gray-400'} hover:text-white cursor-pointer`} />
          </button>
          <button type="button" onClick={playPreviousProject} aria-label="Previous project">
            <SkipBack size={18} className="text-gray-400 hover:text-white cursor-pointer" fill="currentColor" />
          </button>
          
          <button
            className="w-[32px] h-[32px] bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 focus:outline-none"
            onClick={togglePlay}
          >
            {isPlaying ? (
               <Pause size={16} fill="black" className="text-black" />
            ) : (
               <Play size={16} fill="black" className="text-black ml-0.5" />
            )}
          </button>
          
          <button type="button" onClick={playNextProject} aria-label="Next project">
            <SkipForward size={18} className="text-gray-400 hover:text-white cursor-pointer" fill="currentColor" />
          </button>
          
          <div className="relative flex items-center justify-center">
            <Repeat size={16} className="text-green-500 cursor-pointer" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
            <span className="absolute -top-1 right-0 text-[8px] font-bold text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">1</span>
          </div>

        </div>
        
        <div className="w-full flex items-center gap-2 text-[11px] text-[#b3b3b3] font-medium">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <div className="h-1 bg-[#4d4d4d] rounded-full flex-1 group cursor-pointer hover:h-1.5 transition-all">
             <div className="h-full bg-white rounded-full group-hover:bg-green-500 relative" style={{ width: `${progressPercentage}%`, transition: 'width 50ms linear' }}>
                <div className="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
             </div>
          </div>
          <span className="tabular-nums">{currentProject?.duration || '3:45'}</span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="hidden md:flex items-center justify-end gap-2.5 w-[30%] min-w-[180px] text-[#b3b3b3]">
         <Mic2 size={16} className="hover:text-white cursor-pointer" />
         <LayoutList size={16} className="hover:text-white cursor-pointer" />
         <div className="flex items-center gap-2 group">
             <Volume2 size={16} className="hover:text-white cursor-pointer" />
             <div className="w-24 h-1 bg-[#4d4d4d] rounded-full cursor-pointer overflow-hidden">
                <div className="w-2/3 h-full bg-white group-hover:bg-green-500"></div>
             </div>
         </div>
         <Maximize2 size={16} className="hover:text-white cursor-pointer" />
      </div>

    </div>
  );
};

export default PlayerBar;

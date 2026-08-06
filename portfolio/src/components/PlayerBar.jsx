import React, { useEffect, useState } from 'react';
import { SpPlay, SpPause, SpSkipBack, SpSkipForward, SpRepeat, SpShuffle, SpLyrics, SpQueue, SpFullscreen } from './icons/SpotifyIcons';
import { usePlayer } from '../context/PlayerContext';
import LikeButton from './LikeButton';

const PlayerBar = () => {
  const {
    currentProject,
    isPlaying,
    togglePlay,
    currentTime,
    seekTo,
    durationSeconds,
    toggleLike,
    isLiked,
    isShuffleOn,
    toggleShuffle,
    playNextProject,
    playPreviousProject,
    mainView,
    setMainView,
    isLyricsProjectReady,
    rightSidebarOpen,
    toggleRightSidebar,
  } = usePlayer();

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  if (!currentProject) return null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds) => {
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;
  const title = currentProject?.title || '';
  const artist = currentProject?.artist || 'Kai Zhang';
  const displayedDuration = durationSeconds > 0 ? formatTime(durationSeconds) : (currentProject?.duration || '0:00');

  const handleSeek = (event) => {
    if (durationSeconds <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * durationSeconds);
  };

  return (
    <div className="h-[72px] bg-black px-4 md:px-5 flex items-center justify-between fixed bottom-0 w-full z-50 text-white animate-fade-in-up">
      
      {/* Left: Project Info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
        <div className="w-14 h-14 bg-[#1c1c1c] rounded-[4px] flex items-center justify-center shrink-0 overflow-hidden">
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
            <SpShuffle size={16} className={`${isShuffleOn ? 'text-green-500' : 'text-[#b3b3b3]'} hover:text-white cursor-pointer`} />
          </button>
          <button type="button" onClick={playPreviousProject} aria-label="Previous project">
            <SpSkipBack size={16} className="text-[#b3b3b3] hover:text-white cursor-pointer" />
          </button>
          
          <button
            className="w-[32px] h-[32px] bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 focus:outline-none"
            onClick={togglePlay}
          >
            {isPlaying ? (
               <SpPause size={16} className="text-black" />
            ) : (
               <SpPlay size={16} className="text-black" />
            )}
          </button>
          
          <button type="button" onClick={playNextProject} aria-label="Next project">
            <SpSkipForward size={16} className="text-[#b3b3b3] hover:text-white cursor-pointer" />
          </button>
          
          <div
            className="relative flex items-center justify-center"
            title="Always on repeat — every full playthrough counts a new stream"
          >
            <SpRepeat size={16} className="text-green-500" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
            <span className="absolute -top-1 right-0 text-[8px] font-bold text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">1</span>
          </div>

        </div>
        
        <div className="w-full flex items-center gap-2 text-xs text-[#b3b3b3] font-medium">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <button
            type="button"
            onClick={handleSeek}
            className="h-1 flex-1 rounded-full bg-[#4d4d4d] text-left group cursor-pointer hover:h-1.5 transition-all"
            aria-label="Seek playback"
          >
             <div className="h-full bg-white rounded-full group-hover:bg-green-500 relative" style={{ width: `${progressPercentage}%`, transition: 'width 50ms linear' }}>
                <div className="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
             </div>
          </button>
          <span className="tabular-nums">{displayedDuration}</span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="hidden md:flex items-center justify-end gap-2.5 w-[30%] min-w-[180px] text-[#b3b3b3]">
         <button
           type="button"
           onClick={() => {
             if (!isLyricsProjectReady(currentProject)) return;
             setMainView(mainView === 'lyrics' ? 'home' : 'lyrics');
           }}
           title={isLyricsProjectReady(currentProject) ? 'Lyrics' : 'Lyrics unavailable for this project'}
           aria-label="Toggle lyrics view"
           className={isLyricsProjectReady(currentProject) ? 'cursor-pointer' : 'cursor-default opacity-40'}
         >
           <SpLyrics size={16} className={mainView === 'lyrics' ? 'text-green-500' : 'hover:text-white'} />
         </button>
         <button
           type="button"
           onClick={toggleRightSidebar}
           title="Now playing view"
           aria-label="Toggle now playing view"
         >
           <SpQueue size={16} className={rightSidebarOpen ? 'text-green-500 cursor-pointer' : 'hover:text-white cursor-pointer'} />
         </button>
         <button
           type="button"
           onClick={toggleFullscreen}
           title={isFullscreen ? 'Exit full screen' : 'Full screen'}
           aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
         >
           <SpFullscreen size={16} className={isFullscreen ? 'text-green-500 cursor-pointer' : 'hover:text-white cursor-pointer'} />
         </button>
      </div>

    </div>
  );
};

export default PlayerBar;

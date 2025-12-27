import React from 'react';
import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Mic2, LayoutList, Volume2, Maximize2, Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const PlayerBar = () => {
 const { currentProject, isPlaying, togglePlay, currentTime, durationSeconds, streamConfirmedTrigger } = usePlayer();
 const [showHaptic, setShowHaptic] = useState(false);

  // Trigger haptic effect when stream is confirmed
  useEffect(() => {
    if (streamConfirmedTrigger > 0) {
      setShowHaptic(true);
      const timer = setTimeout(() => setShowHaptic(false), 150);
      return () => clearTimeout(timer);
    }
  }, [streamConfirmedTrigger]);

  if (!currentProject) return null;

  const formatTime = (seconds) => {
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

  return (
     <div className={`h-24 bg-black border-t border-[#282828] px-4 flex items-center justify-between fixed bottom-0 w-full z-50 text-white ${showHaptic ? 'haptic-pulse' : ''}`}>
      
      {/* Left: Project Info */}
      <div className="flex items-center gap-4 w-[30%] min-w-[180px]">
        <div className="w-14 h-14 bg-gray-700 rounded flex items-center justify-center shrink-0 overflow-hidden">
             {currentProject.image ? (
               <img src={currentProject.image} alt={currentProject.title} className="w-full h-full object-cover" />
             ) : (
               <span className="font-bold text-sm">{currentProject.title[0]}</span>
             )}        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-medium text-sm hover:underline cursor-pointer truncate">{currentProject.title}</span>
          <span className="text-xs text-gray-400 hover:underline cursor-pointer hover:text-white transition-colors truncate">
            {currentProject.artist || 'You'}
          </span>
        </div>
        <Heart size={16} className="text-gray-400 hover:text-white cursor-pointer ml-2" />
      </div>

      {/* Center: Controls */}
      <div className="flex flex-col items-center max-w-[40%] w-full gap-2">
        <div className="flex items-center gap-6">
          <Shuffle size={16} className="text-gray-400 hover:text-white cursor-pointer" />
          <SkipBack size={20} className="text-gray-400 hover:text-white cursor-pointer" fill="currentColor" />
          
          <button 
            className={`w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 ${showHaptic ? 'micro-shake' : ''}`}
            onClick={togglePlay}
          >
            {isPlaying ? (
               <Pause size={16} fill="black" className="text-black" />
            ) : (
               <Play size={16} fill="black" className="text-black ml-0.5" />
            )}
          </button>
          
          <SkipForward size={20} className="text-gray-400 hover:text-white cursor-pointer" fill="currentColor" />
          
          {/* Repeat Button with Spotify-like styling for 'Repeat One' */}
          <div className="relative flex items-center justify-center">
            <Repeat size={16} className="text-green-500 cursor-pointer" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
            <span className="absolute -top-1 right-0 text-[8px] font-bold text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">1</span>
          </div>

        </div>
        
        {/* Progress Bar Mockup */}
        <div className="w-full flex items-center gap-2 text-xs text-gray-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <div className="h-1 bg-[#4d4d4d] rounded-full flex-1 group cursor-pointer">
             <div className="h-full bg-white rounded-full group-hover:bg-green-500 relative" style={{ width: `${progressPercentage}%` }}>
                <div className="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"></div>
             </div>
          </div>
          <span>{currentProject.duration || '3:45'}</span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="flex items-center justify-end gap-3 w-[30%] min-w-[180px] text-gray-400">
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

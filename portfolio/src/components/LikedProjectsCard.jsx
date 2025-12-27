import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import profileImage from '../assets/profilephoto1.jpg';

const LikedProjectsCard = () => {
  const { likedCount } = usePlayer();

  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold text-white mb-3">Liked Songs</span>

      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <img src={profileImage} alt="Kai" className="w-full h-full object-cover transform scale-125" />
          </div>

          <div className="absolute w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-lg z-10" style={{ bottom: 6, right: 6 }}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18.01 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-base text-white font-semibold">You've liked {likedCount} projects</span>
          <span className="text-sm text-gray-400">By Kai Zhang</span>
        </div>
      </div>
    </div>
  );
};

export default LikedProjectsCard;

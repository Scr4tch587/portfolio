import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useSiteProfile } from '../hooks/useSiteProfile';

const ArtistPickCard = ({ project, descriptor = '' }) => {
  const { playProject, currentProject, togglePlay } = usePlayer();
  const { avatar: profileImage } = useSiteProfile();

  const handleClick = (e) => {
    e.stopPropagation();
    if (!project) return;
    if (currentProject?.id === project.id) {
      togglePlay();
    } else {
      playProject(project);
    }
  };

  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold text-white mb-3">Artist Pick</span>

      <div className="flex items-end gap-6">
        <button onClick={handleClick} className="w-24 h-24 bg-gray-800 rounded-md overflow-hidden shadow-md flex-shrink-0 focus:outline-none">
          <img src={project?.image} alt={project?.title || 'Artist pick'} className="w-full h-full object-cover" />
        </button>

        <div className="flex flex-col">
          <div className="mb-2">
            <div className="bg-white text-black rounded-full px-3 py-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden -ml-1">
                <img src={profileImage} alt="Kai" className="w-full h-full object-cover transform scale-110" />
              </div>
              <span className="text-sm font-medium">{descriptor}</span>
            </div>
          </div>

          <div>
            <span onClick={handleClick} className="text-2xl font-bold text-white block hover:underline cursor-pointer">{project?.title || ''}</span>
            <span className="text-sm text-gray-400">Album</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistPickCard;

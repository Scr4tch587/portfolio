import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const LikedSongsModal = () => {
  const {
    likedSongsOpen,
    closeLikedSongs,
    likedProjects,
    playProject,
  } = usePlayer();

  if (!likedSongsOpen) return null;

  const handleSelectProject = (project) => {
    playProject(project);
    closeLikedSongs();
  };

  useEffect(() => {
    if (!likedSongsOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeLikedSongs();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [likedSongsOpen, closeLikedSongs]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={closeLikedSongs}>
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-[#121212] border border-white/10 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white text-xl font-bold">Liked Songs</h3>
          <button type="button" onClick={closeLikedSongs} className="text-gray-400 hover:text-white" aria-label="Close liked songs">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[calc(80vh-72px)]">
          {likedProjects.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No liked songs yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {likedProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelectProject(project)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-white/10"
                >
                  <img src={project.image} alt={project.title} className="w-11 h-11 rounded object-cover" />
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{project.title}</div>
                    <div className="text-gray-400 text-sm">{project.year} • {project.type}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikedSongsModal;

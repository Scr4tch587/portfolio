import React from 'react';
import { X, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const RightSidebar = () => {
  const { currentProject, setCurrentProject } = usePlayer();

  if (!currentProject) return null;

  const handleClose = () => {
    setCurrentProject(null);
  };

  return (
    <div className="hidden lg:flex w-80 bg-[#121212] flex-col p-4 m-2 ml-0 rounded-lg text-white overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <span className="font-bold text-base hover:underline cursor-pointer">{currentProject.title}</span>
        <div className="flex gap-2">
            <MoreHorizontal className="text-gray-400 hover:text-white cursor-pointer" size={20} />
            <X className="text-gray-400 hover:text-white cursor-pointer" size={20} onClick={handleClose} />
        </div>
      </div>

      <div className="w-full pb-[100%] relative mb-6 rounded-lg shadow-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-[#282828]">
         {/* Placeholder for project image */}
         {currentProject.image ? (
            <img src={currentProject.image} alt={currentProject.title} className="w-full h-full object-cover" />
         ) : (
            <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-600 flex items-center justify-center text-3xl font-bold">
                {currentProject.title[0]}
            </div>
         )}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-6">
        <h2 className="text-2xl font-bold leading-tight">{currentProject.title}</h2>
        <span className="text-gray-400 text-base">{currentProject.artist || 'You'}</span>
      </div>

      {/* About the Project Section */}
      <div className="bg-[#242424] rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-base">About the Project</h3>
        </div>
        
        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          {currentProject.description || (
            <>
              This is a placeholder description for <strong>{currentProject.title}</strong>. 
              Here you would describe the tech stack, the challenges you faced, and the 
              outcome. It acts like the "About the Artist" section on Spotify.
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
           {(currentProject.tags || ['React', 'Node.js', 'Tailwind']).map(tag => (
               <span key={tag} className="text-xs bg-[#333] px-2 py-1 rounded text-gray-200">{tag}</span>
           ))}
        </div>
      </div>

       {/* Credits Section */}
       <div className="bg-[#242424] rounded-lg p-4">
          <h3 className="font-bold text-base mb-3">Credits</h3>
          <div className="flex justify-between items-center text-sm mb-2">
             <span className="text-gray-300">Role</span>
             <span className="text-white font-medium">Lead Developer</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-gray-300">Year</span>
             <span className="text-white font-medium">2024</span>
          </div>
       </div>
    </div>
  );
};

export default RightSidebar;

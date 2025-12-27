import React, { useState, useEffect } from 'react';
import { X, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const RightSidebar = () => {
  const { currentProject, clearCurrentProjectDelayed } = usePlayer();

  const [visible, setVisible] = useState(false);
  const [animState, setAnimState] = useState('exit');
  const EXIT_MS = 260;

  useEffect(() => {
    // Show when a project appears. When project is cleared, play exit animation
    if (currentProject) {
      setVisible(true);
      setAnimState('enter');
    } else if (visible) {
      setAnimState('exit');
      const t = setTimeout(() => setVisible(false), EXIT_MS + 20);
      return () => clearTimeout(t);
    }
  }, [currentProject, visible]);

  const handleClose = () => {
    // Trigger exit animation, then clear the project after the animation finishes
    setAnimState('exit');
    setTimeout(() => {
      setVisible(false);
      clearCurrentProjectDelayed(10); // give a tiny extra breath to ensure animation end
    }, EXIT_MS + 10);
  };

  const hasProject = !!currentProject;
  const title = currentProject?.title || 'Browse Projects';
  const artist = hasProject ? (currentProject?.artist || 'You') : 'Select a project to view details';

  const containerClass = animState === 'enter' ? 'animate-fade-in-up' : 'animate-fade-out-down';
  if (!visible) return null;

  return (
    <div className={`hidden lg:flex w-80 bg-[#121212] flex-col p-4 m-2 ml-0 rounded-lg text-white overflow-y-auto custom-scrollbar ${containerClass}`} style={{ fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <span className="font-bold text-base hover:underline cursor-pointer text-left">{title}</span>
        <div className="flex gap-2">
            <MoreHorizontal className="text-gray-400 hover:text-white cursor-pointer" size={20} />
            {hasProject && (
              <X className="text-gray-400 hover:text-white cursor-pointer" size={20} onClick={handleClose} />
            )}
        </div>
      </div>

       <div className="w-full pb-[100%] relative mb-6 rounded-lg shadow-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-[#282828]">
          {hasProject && currentProject?.image ? (
            <img src={currentProject?.image} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-600 flex items-center justify-center text-3xl font-bold">
               {hasProject ? (title ? title[0] : '📁') : '📁'}
            </div>
          )}
          </div>
        </div>

      <div className="flex flex-col gap-1 mb-6 text-left">
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        <span className="text-gray-400 text-base">{artist}</span>
      </div>

      <div className="bg-[#242424] rounded-lg p-4 mb-4 text-left">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-base">About the Project</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          {hasProject ? (
            (currentProject?.description) || (
              <>This project currently has no description provided.</>
            )
          ) : (
            <>Select a project from the list to preview details here.</>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
             {(hasProject ? (currentProject?.tags || ['React', 'Node.js', 'Tailwind']) : ['React', 'Tailwind', 'Firebase']).map(tag => (
               <span key={tag} className="text-xs bg-[#333] px-2 py-1 rounded text-gray-200">{tag}</span>
             ))}
        </div>
      </div>

       <div className="bg-[#242424] rounded-lg p-4 text-left">
          <h3 className="font-bold text-base mb-3">Credits</h3>
          <div className="flex justify-between items-center text-sm mb-2">
             <span className="text-gray-300">Role</span>
             <span className="text-white font-medium">{hasProject ? 'Lead Developer' : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-gray-300">Year</span>
             <span className="text-white font-medium">{hasProject ? (currentProject?.year || '—') : '—'}</span>
          </div>
       </div>
    </div>
  );
};

export default RightSidebar;

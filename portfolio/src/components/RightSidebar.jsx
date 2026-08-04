import React from 'react';
import { SpClose } from './icons/SpotifyIcons';
import { usePlayer } from '../context/PlayerContext';
import LikeButton from './LikeButton';

const RightSidebar = ({ onClose }) => {
  const { currentProject, toggleLike, isLiked } = usePlayer();
  const devpostProjectIds = new Set([202, 203, 204]);

  const hasProject = !!currentProject;
  const title = currentProject?.title || 'No project selected';
  const artist = hasProject ? (currentProject?.artist || 'Kai Zhang') : 'Select a project';
  const visitLabel = hasProject && devpostProjectIds.has(currentProject?.id) ? 'Devpost' : 'Website';

  const showProcessingBanner = hasProject && ['parse_error', 'failed'].includes(currentProject?.processingStatus);

  return (
    <div className="hidden lg:flex w-80 bg-[#121212] flex-col p-4 rounded-lg text-white overflow-y-auto custom-scrollbar animate-fade-in-up shrink-0 border border-white/5">
      <div className="flex justify-between items-center mb-5">
        <span className="font-bold text-base text-left">{title}</span>
        <button type="button" onClick={onClose} aria-label="Close details">
          <SpClose className="text-gray-400 hover:text-white cursor-pointer" size={18} />
        </button>
      </div>

      <div className="w-full pb-[100%] relative mb-5 rounded-md shadow-lg overflow-hidden">
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
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
          {hasProject ? (
            <LikeButton
              isLiked={isLiked(currentProject?.id)}
              onToggle={() => toggleLike(currentProject?.id)}
              ariaLabel={isLiked(currentProject?.id) ? 'Unlike' : 'Like'}
              size={20}
            />
          ) : null}
        </div>
        <span className="text-gray-400 text-base">{artist}</span>
      </div>

      <div className="bg-[#242424] rounded-md p-4 mb-4 text-left">
        {showProcessingBanner ? (
          <div className="mb-4 rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            README failed to process. Showing default view.
          </div>
        ) : null}
        <p className="text-gray-300 text-sm leading-relaxed mb-4 whitespace-pre-line">
          {hasProject ? (
            (currentProject?.description) || (
              <>This project currently has no description provided.</>
            )
          ) : (
            <>Select a project from the list to preview details here.</>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {(hasProject ? (currentProject?.tags || ['React', 'Node.js', 'Tailwind']) : ['React', 'Tailwind', 'Firebase']).map((tag) => (
            <span key={tag} className="text-xs bg-[#333] px-2 py-1 rounded text-gray-200">{tag}</span>
          ))}
        </div>
      </div>

      <div className="bg-[#242424] rounded-md p-4 text-left">
        <h3 className="font-bold text-base mb-3">Credits</h3>
        {hasProject && currentProject?.github ? (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-300">Source</span>
            <a href={currentProject.github} target="_blank" rel="noopener noreferrer" className="text-green-500 font-medium hover:underline">Github</a>
          </div>
        ) : null}

        {hasProject && currentProject?.website ? (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-300">Visit</span>
            <a href={currentProject.website} target="_blank" rel="noopener noreferrer" className="text-green-500 font-medium hover:underline">{visitLabel}</a>
          </div>
        ) : null}

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">Year</span>
          <span className="text-white font-medium">{hasProject ? (currentProject?.year || '—') : '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;

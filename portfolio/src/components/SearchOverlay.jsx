import React, { useEffect, useRef } from 'react';

const SearchOverlay = ({ results, onSelect, onClose }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="search-overlay-enter absolute top-full mt-2 w-full bg-[#2a2a2a] rounded-lg shadow-2xl max-h-[400px] overflow-y-auto z-50 border border-white/10"
    >
      {results.length === 0 ? (
        <div className="p-4 text-gray-400 text-sm">No results found</div>
      ) : (
        results.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelect(project)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer text-left"
          >
            <img
              src={project.image}
              alt={project.title}
              className="w-10 h-10 rounded object-cover"
            />
            <div className="min-w-0">
              <span className="block text-white text-sm font-medium truncate">{project.title}</span>
              <span className="block text-gray-400 text-xs">{project.type} • {project.year}</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export default SearchOverlay;

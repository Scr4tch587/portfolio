import React, { useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { SpPlay } from './icons/SpotifyIcons';

const SectionHeader = ({ children }) => (
  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</p>
);

const SearchOverlay = ({
  results,
  users = [],
  playlists = [],
  onSelect,
  onSelectUser,
  onSelectPlaylist,
  onClose,
}) => {
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

  const empty = results.length === 0 && users.length === 0 && playlists.length === 0;

  return (
    <div
      ref={overlayRef}
      className="search-overlay-enter absolute top-full mt-2 w-full bg-[#2a2a2a] rounded-lg shadow-2xl max-h-[400px] overflow-y-auto custom-scrollbar z-50 border border-white/10"
    >
      {empty ? (
        <div className="p-4 text-gray-400 text-sm">No results found</div>
      ) : (
        <div className="pb-2">
          {results.length > 0 && (
            <>
              <SectionHeader>Projects</SectionHeader>
              {results.map((project) => (
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
              ))}
            </>
          )}

          {users.length > 0 && (
            <>
              <SectionHeader>Profiles</SectionHeader>
              {users.map((person) => (
                <button
                  key={person.uid}
                  type="button"
                  onClick={() => onSelectUser(person)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer text-left"
                >
                  <span className="w-10 h-10 rounded-full overflow-hidden bg-[#3a3a3a] flex items-center justify-center shrink-0">
                    {person.photoURL ? (
                      <img src={person.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-[#b3b3b3]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-white text-sm font-medium truncate">{person.displayName || person.username}</span>
                    <span className="block text-gray-400 text-xs">@{person.username}</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {playlists.length > 0 && (
            <>
              <SectionHeader>Playlists</SectionHeader>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => onSelectPlaylist(playlist)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer text-left"
                >
                  <span className="w-10 h-10 rounded bg-[#3a3a3a] flex items-center justify-center shrink-0">
                    <SpPlay size={16} className="text-[#b3b3b3]" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-white text-sm font-medium truncate">{playlist.name}</span>
                    <span className="block text-gray-400 text-xs">
                      Playlist • {playlist.ownerUsername}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchOverlay;

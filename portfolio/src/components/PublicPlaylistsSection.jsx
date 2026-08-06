import React from 'react';
import { SpPlay } from './icons/SpotifyIcons';
import { useProfileByUsername } from '../hooks/useUserProfile';
import { usePublicPlaylistsOf } from '../hooks/usePlaylists';
import { usePlayer } from '../context/PlayerContext';

/** Public playlists shown at the bottom of a profile page. */
const PublicPlaylistsSection = ({ username }) => {
  const { profile } = useProfileByUsername(username);
  const { playlists } = usePublicPlaylistsOf(profile?.uid || null);
  const { openPlaylist, allProjectsList } = usePlayer();

  if (!profile || playlists.length === 0) return null;

  const coverFor = (playlist) => {
    const firstId = (playlist.projectIds || [])[0];
    if (firstId == null) return null;
    const project = allProjectsList.find((p) => String(p.id) === String(firstId));
    return project?.image || null;
  };

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Public Playlists</h2>
      <div className="flex flex-wrap -mx-3">
        {playlists.map((playlist) => {
          const cover = coverFor(playlist);
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => openPlaylist(playlist.id)}
              className="w-[212px] p-3 rounded-md hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-full aspect-square rounded-md overflow-hidden bg-[#282828] flex items-center justify-center relative">
                {cover ? (
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <SpPlay size={32} className="text-[#b3b3b3]" />
                )}
              </div>
              <div className="font-medium text-base truncate mt-2">{playlist.name}</div>
              <p className="text-sm text-[#b3b3b3]">
                {(playlist.projectIds || []).length} project{(playlist.projectIds || []).length === 1 ? '' : 's'}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default PublicPlaylistsSection;

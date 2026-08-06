import React, { useEffect, useState } from 'react';
import { SpAddCircle, SpCheckCircle, SpClose } from './icons/SpotifyIcons';
import { useAuth } from '../context/AuthContext';
import { useMyProfile } from '../hooks/useUserProfile';
import { useMyPlaylists } from '../hooks/usePlaylists';
import { addProjectToPlaylist, createPlaylist, removeProjectFromPlaylist } from '../lib/playlists';

const AddToPlaylistMenu = ({ project, isOpen, onClose }) => {
  const { user, signInWithGoogle } = useAuth();
  const { profile } = useMyProfile();
  const { playlists, loading } = useMyPlaylists();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setCreating(false);
      setNewName('');
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const projectKey = String(project.id);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !profile?.username || busy) return;
    setBusy(true);
    try {
      // Born with the project already in it — one write, no follow-up needed.
      await createPlaylist(
        { uid: user.uid, username: profile.username },
        { name: name.slice(0, 60), projectIds: [projectKey] },
      );
      setCreating(false);
      setNewName('');
    } catch {
      // Rules rejection or offline — leave the form open so they can retry.
    } finally {
      setBusy(false);
    }
  };

  const toggleMembership = async (playlist) => {
    const inPlaylist = (playlist.projectIds || []).includes(projectKey);
    const action = inPlaylist ? removeProjectFromPlaylist : addProjectToPlaylist;
    await action(playlist.id, projectKey).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[70vh] bg-[#121212] border border-white/10 rounded-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white text-xl font-bold">Add to playlist</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close add to playlist">
            <SpClose size={18} />
          </button>
        </div>

        {!user ? (
          <div className="p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-[#b3b3b3] text-center">Sign in to create playlists.</p>
            <button
              type="button"
              onClick={() => signInWithGoogle().catch(() => {})}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="p-3 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-1">
              {creating ? (
                <div className="flex items-center gap-2 p-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                    maxLength={60}
                    placeholder="Playlist name"
                    autoFocus
                    className="flex-1 bg-[#282828] rounded-md px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-[#535353]"
                    aria-label="New playlist name"
                  />
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || !profile?.username || busy}
                    className="px-4 py-2 rounded-full bg-green-500 text-black text-sm font-bold disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  disabled={!profile?.username}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="w-11 h-11 rounded bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                    <SpAddCircle size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-white font-medium">New playlist</div>
                    {!profile?.username && (
                      <div className="text-gray-400 text-xs">Pick a username first</div>
                    )}
                  </div>
                </button>
              )}

              {loading ? (
                <p className="text-gray-400 text-sm p-4">Loading playlists...</p>
              ) : (
                playlists.map((playlist) => {
                  const inPlaylist = (playlist.projectIds || []).includes(projectKey);
                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => toggleMembership(playlist)}
                      className="w-full text-left flex items-center justify-between gap-3 p-2 rounded-md hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{playlist.name}</div>
                        <div className="text-gray-400 text-sm">
                          {(playlist.projectIds || []).length} {(playlist.projectIds || []).length === 1 ? 'project' : 'projects'}
                        </div>
                      </div>
                      {inPlaylist ? (
                        <SpCheckCircle size={20} className="text-green-500 shrink-0" />
                      ) : (
                        <SpAddCircle size={20} className="text-[#b3b3b3] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistMenu;

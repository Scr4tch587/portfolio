import React, { useEffect, useState } from 'react';
import { SpClose } from './icons/SpotifyIcons';
import { useAuth } from '../context/AuthContext';
import { useMyProfile } from '../hooks/useUserProfile';
import { createPlaylist } from '../lib/playlists';
import { usePlayer } from '../context/PlayerContext';

const CreatePlaylistModal = ({ isOpen, onClose }) => {
  const { user, signInWithGoogle } = useAuth();
  const { profile } = useMyProfile();
  const { openPlaylist } = usePlayer();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !profile?.username || busy) return;
    setBusy(true);
    try {
      const id = await createPlaylist(
        { uid: user.uid, username: profile.username },
        { name: trimmed.slice(0, 60) },
      );
      onClose();
      openPlaylist(id);
    } catch {
      // Rules rejection or offline — leave the form open to retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white text-xl font-bold">New playlist</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close new playlist">
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
          <div className="p-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              maxLength={60}
              placeholder="Playlist name"
              autoFocus
              aria-label="Playlist name"
              className="w-full bg-[#282828] rounded-md px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-[#535353]"
            />
            {!profile?.username && (
              <p className="mt-2 text-xs text-gray-400">Pick a username first.</p>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || !profile?.username || busy}
              className="mt-4 w-full rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:scale-[1.02] transition-transform disabled:bg-gray-500 disabled:scale-100"
            >
              {busy ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePlaylistModal;

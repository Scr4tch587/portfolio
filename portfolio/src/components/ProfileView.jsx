import React, { useRef, useState } from 'react';
import { User } from 'lucide-react';
import { SpPlay } from './icons/SpotifyIcons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useProfileByUsername } from '../hooks/useUserProfile';
import { useMyPlaylists, usePublicPlaylistsOf } from '../hooks/usePlaylists';
import { useFollowStats, useIsFollowing, setFollowing } from '../hooks/useFollow';
import { renameUsername, updateProfileFields, uploadAvatar } from '../lib/userProfile';

const joinedLabel = (createdAt) => {
  const date = createdAt?.toDate?.();
  if (!date) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const VISIBILITY_LABEL = { private: 'Private', unlisted: 'Unlisted' };

/**
 * Full-pane Spotify-style profile: playlists, follower/following counts,
 * follow + message actions; editable (incl. username + photo) when own.
 */
const ProfileView = ({ username, onMessage }) => {
  const { user } = useAuth();
  const { openPlaylist, openProfile, allProjectsList } = usePlayer();
  const { profile, loading, notFound } = useProfileByUsername(username);

  const isOwn = Boolean(user && profile && user.uid === profile.uid);
  const { playlists: myPlaylists } = useMyPlaylists();
  const { playlists: publicPlaylists } = usePublicPlaylistsOf(isOwn ? null : profile?.uid);
  const playlists = isOwn ? myPlaylists : publicPlaylists;
  const publicCount = playlists.filter((p) => p.visibility === 'public').length;

  const { followers, following, refresh: refreshFollowStats } = useFollowStats(profile?.uid);
  const isFollowing = useIsFollowing(profile?.uid);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftUsername, setDraftUsername] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const startEditing = () => {
    setDraftName(profile?.displayName || '');
    setDraftUsername(profile?.username || '');
    setDraftBio(profile?.bio || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const newUsername = draftUsername.trim();
      const usernameChanged = newUsername && newUsername !== profile.username;
      if (usernameChanged) {
        await renameUsername(user, profile.usernameLower, newUsername);
      }
      await updateProfileFields(profile.uid, {
        displayName: draftName.trim() || newUsername || profile.username,
        bio: draftBio,
      });
      setEditing(false);
      // The page is addressed by username; follow the rename.
      if (usernameChanged) openProfile(newUsername);
    } catch (saveError) {
      if (saveError?.message === 'taken') setError('That username is taken.');
      else if (saveError?.message === 'invalid') setError('Usernames are 3–20 letters, numbers, or underscores.');
      else setError('Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    try {
      await uploadAvatar(profile.uid, file);
    } catch (uploadError) {
      setError(uploadError?.message || 'Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (followBusy || !user) return;
    setFollowBusy(true);
    try {
      await setFollowing(user.uid, profile.uid, !isFollowing);
      await refreshFollowStats();
    } catch {
      // Snapshot listener keeps the button truthful on failure.
    } finally {
      setFollowBusy(false);
    }
  };

  const playlistCover = (playlist) => {
    const firstId = (playlist.projectIds || [])[0];
    if (firstId == null) return null;
    const project = allProjectsList.find((p) => String(p.id) === String(firstId));
    return project?.image || null;
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#121212] text-white px-6 pt-16">
        <div className="flex items-end gap-6 animate-pulse">
          <div className="w-52 h-52 rounded-full bg-white/10" />
          <div className="flex-1 pb-4">
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="mt-4 h-12 w-72 bg-white/10 rounded" />
            <div className="mt-4 h-4 w-40 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-full bg-[#121212] text-white flex items-center justify-center">
        <p className="text-gray-400">User not found</p>
      </div>
    );
  }

  const joined = joinedLabel(profile.createdAt);

  return (
    <div className="min-h-full bg-[#121212] text-white relative">
      <div className="absolute inset-x-0 top-0 h-90 bg-linear-to-b from-[#252b36] to-[#121212]" />

      <div className="relative z-10 px-6 pt-16 pb-10">
        <div className="flex items-end gap-6">
          <div className="relative shrink-0 group">
            <div className="w-52 h-52 rounded-full overflow-hidden bg-[#282828] shadow-2xl flex items-center justify-center">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User size={88} className="text-[#b3b3b3]" />
              )}
            </div>
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-semibold"
                  aria-label="Change profile picture"
                >
                  {uploading ? 'Uploading...' : 'Choose photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-2">
            <p className="text-sm font-semibold">Profile</p>
            {editing ? (
              <div className="mt-2 flex flex-col gap-2 max-w-xl">
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={60}
                  aria-label="Display name"
                  placeholder="Display name"
                  className="w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-3xl font-extrabold outline-none focus:border-green-500"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[#b3b3b3] text-sm">@</span>
                  <input
                    value={draftUsername}
                    onChange={(event) => setDraftUsername(event.target.value)}
                    maxLength={20}
                    aria-label="Username"
                    spellCheck="false"
                    className="flex-1 rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
            ) : (
              <h1 className="text-7xl font-extrabold truncate mt-1 pb-2">{profile.displayName}</h1>
            )}
            <p className="mt-3 text-sm">
              {publicCount} Public Playlist{publicCount === 1 ? '' : 's'}
              <span className="mx-1">•</span>
              {followers} Follower{followers === 1 ? '' : 's'}
              <span className="mx-1">•</span>
              {following} Following
            </p>
            <p className="mt-1 text-[#b3b3b3] text-sm">
              @{profile.username}
              {joined && <span> • Joined {joined}</span>}
            </p>
          </div>
        </div>

        <div className="mt-6 max-w-2xl">
          {editing ? (
            <textarea
              value={draftBio}
              onChange={(event) => setDraftBio(event.target.value)}
              maxLength={280}
              rows={3}
              aria-label="Bio"
              placeholder="Tell people about yourself"
              className="w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-green-500 resize-none"
            />
          ) : (
            profile.bio && <p className="text-[#b3b3b3] text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {isOwn && !editing && (
            <button
              type="button"
              onClick={startEditing}
              className="px-4 py-1 border border-[#7c7c7c] rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-transform"
            >
              Edit profile
            </button>
          )}
          {isOwn && editing && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1 bg-green-500 text-black rounded-full text-sm font-bold hover:scale-105 transition-transform disabled:bg-gray-500"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-1 border border-[#7c7c7c] rounded-full text-sm font-bold hover:border-white"
              >
                Cancel
              </button>
            </>
          )}
          {!isOwn && user && (
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={followBusy}
              className={`px-4 py-1 rounded-full text-sm font-bold hover:scale-105 transition-transform border ${isFollowing ? 'border-green-500 text-green-500' : 'border-[#7c7c7c] hover:border-white'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          {!isOwn && user && onMessage && (
            <button
              type="button"
              onClick={() => onMessage({ username: profile.username })}
              className="px-4 py-1 border border-[#7c7c7c] rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-transform"
            >
              Message
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {playlists.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold mb-4">{isOwn ? 'Playlists' : 'Public Playlists'}</h2>
            <div className="flex flex-wrap -mx-3">
              {playlists.map((playlist) => {
                const cover = playlistCover(playlist);
                const count = (playlist.projectIds || []).length;
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => openPlaylist(playlist.id)}
                    className="w-[212px] p-3 rounded-md hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="w-full aspect-square rounded-md overflow-hidden bg-[#282828] flex items-center justify-center">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <SpPlay size={32} className="text-[#b3b3b3]" />
                      )}
                    </div>
                    <div className="font-medium text-base truncate mt-2">{playlist.name}</div>
                    <p className="text-sm text-[#b3b3b3]">
                      {count} project{count === 1 ? '' : 's'}
                      {isOwn && VISIBILITY_LABEL[playlist.visibility] && (
                        <span> • {VISIBILITY_LABEL[playlist.visibility]}</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProfileView;

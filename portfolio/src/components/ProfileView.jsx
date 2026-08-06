import React, { useRef, useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfileByUsername } from '../hooks/useUserProfile';
import { updateProfileFields, uploadAvatar } from '../lib/userProfile';

const joinedLabel = (createdAt) => {
  const date = createdAt?.toDate?.();
  if (!date) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/**
 * Full-pane public profile. Editable when it belongs to the signed-in user;
 * `children` is where the parent injects extra sections (e.g. playlists).
 */
const ProfileView = ({ username, onMessage, children }) => {
  const { user } = useAuth();
  const { profile, loading, notFound } = useProfileByUsername(username);

  const isOwn = Boolean(user && profile && user.uid === profile.uid);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const startEditing = () => {
    setDraftName(profile?.displayName || '');
    setDraftBio(profile?.bio || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await updateProfileFields(profile.uid, { displayName: draftName.trim() || profile.username, bio: draftBio });
      setEditing(false);
    } catch {
      setError('Could not save profile changes.');
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

  if (loading) {
    return (
      <div className="min-h-full bg-[#121212] text-white px-6 pt-16">
        <div className="flex items-end gap-6 animate-pulse">
          <div className="w-40 h-40 rounded-full bg-white/10" />
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
            <div className="w-40 h-40 rounded-full overflow-hidden bg-[#282828] ring-1 ring-white/10 shadow-2xl flex items-center justify-center">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User size={72} className="text-[#b3b3b3]" />
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
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={60}
                aria-label="Display name"
                className="mt-2 w-full max-w-xl rounded-md border border-white/20 bg-black/60 px-3 py-2 text-4xl font-extrabold outline-none focus:border-green-500"
              />
            ) : (
              <h1 className="text-6xl font-extrabold truncate mt-1">{profile.displayName}</h1>
            )}
            <p className="mt-3 text-[#b3b3b3] text-sm">
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

        {children && <div className="mt-10">{children}</div>}
      </div>
    </div>
  );
};

export default ProfileView;

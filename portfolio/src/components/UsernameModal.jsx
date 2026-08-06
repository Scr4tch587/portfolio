import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMyProfile } from '../hooks/useUserProfile';
import { claimUsername, USERNAME_PATTERN } from '../lib/userProfile';

const suggestFrom = (displayName) => {
  const base = (displayName || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : '';
};

/**
 * Blocking first-sign-in flow: a signed-in account with no users/{uid} doc
 * must pick a username before continuing. Renders nothing otherwise.
 */
const UsernameModal = () => {
  const { user } = useAuth();
  const { needsUsername } = useMyProfile();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (needsUsername) {
      // Prefill only while untouched — never clobber what the user typed.
      setUsername((prev) => prev || suggestFrom(user?.displayName));
      setError('');
    }
  }, [needsUsername, user]);

  if (!user || !needsUsername) return null;

  const trimmed = username.trim();
  const formatOk = USERNAME_PATTERN.test(trimmed);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formatOk || saving) return;
    setSaving(true);
    setError('');
    try {
      await claimUsername(user, trimmed);
    } catch (claimError) {
      if (claimError?.message === 'taken') {
        setError('That username is taken.');
      } else {
        setError('Could not claim that username. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-white text-xl font-bold">Pick a username</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <p className="text-gray-400 text-sm">
            Your username is public — it names your profile and playlists.
          </p>

          <label className="mt-4 block text-sm text-gray-300" htmlFor="username-input">Username</label>
          <input
            id="username-input"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError('');
            }}
            autoComplete="off"
            spellCheck="false"
            className="mt-2 w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-green-500"
          />
          <p className={`mt-2 text-xs ${trimmed && !formatOk ? 'text-red-400' : 'text-gray-500'}`}>
            3–20 characters: letters, numbers, underscores.
          </p>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!formatOk || saving}
            className="mt-5 w-full rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:scale-[1.02] transition-transform disabled:bg-gray-500 disabled:scale-100"
          >
            {saving ? 'Claiming...' : 'Claim username'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameModal;

import { useEffect, useState } from 'react';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { DEFAULT_BIO, siteProfileRef, useSiteProfile } from '../../hooks/useSiteProfile';

/** Edits the bio line under the name on the Letterboxd profile. */
export default function ProfileBio() {
  const { bio, loaded, error: loadError } = useSiteProfile();
  const current = bio ?? DEFAULT_BIO;
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Follow the stored value until the admin starts typing something else.
  useEffect(() => { setDraft(current); }, [current]);

  const trimmed = draft.trim();
  const dirty = trimmed !== current.trim();

  const save = async (event) => {
    event.preventDefault();
    if (!trimmed || !dirty) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await setDoc(siteProfileRef(), { bio: trimmed, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save the bio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white" data-testid="profile-bio-admin">
      <h2 className="text-lg font-semibold">Bio</h2>
      <p className="mt-1 text-sm text-gray-400">Shown under your name on the Letterboxd profile and in the About card on the Spotify page.</p>

      <form onSubmit={save} className="mt-4 max-w-xl">
        <textarea
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setSaved(false); }}
          rows={3}
          disabled={!loaded || saving}
          aria-label="Bio"
          className="w-full rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2 text-sm disabled:opacity-50"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !dirty || !trimmed}
            className="rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save bio'}
          </button>
          {saved && !dirty && <span className="text-xs text-green-400">Saved</span>}
        </div>
      </form>

      {(error || loadError) && <p className="mt-3 text-sm text-red-400">{error || loadError}</p>}
    </section>
  );
}

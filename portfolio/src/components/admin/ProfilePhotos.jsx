import { useRef, useState } from 'react';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { storage } from '../../firebase';
import { siteProfileRef, useSiteProfile } from '../../hooks/useSiteProfile';

// Site photos live beside project images: that Storage folder is already
// admin-writable and publicly readable.
const STORAGE_FOLDER = 'projects/_site';

function sanitizeFileName(name) {
  return String(name || 'photo')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The About gallery photos (upload, order, remove) and which one is the
 * profile image used across both skins.
 */
export default function ProfilePhotos() {
  const { photos, avatarUrl, loaded, error: loadError } = useSiteProfile();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const save = (data) => setDoc(siteProfileRef(), { ...data, updatedAt: serverTimestamp() }, { merge: true });

  const run = async (label, action) => {
    setBusy(label);
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError?.message || 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const upload = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    run(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`, async () => {
      const urls = [];
      for (const [index, file] of files.entries()) {
        const safeName = sanitizeFileName(file.name);
        const ext = safeName.includes('.') ? '' : '.jpg';
        const fileRef = ref(storage, `${STORAGE_FOLDER}/${Date.now()}-${index}-${safeName}${ext}`);
        await uploadBytes(fileRef, file);
        urls.push(await getDownloadURL(fileRef));
      }
      const next = [...photos, ...urls];
      // The first photo ever added becomes the profile image.
      await save({ photos: next, ...(avatarUrl ? {} : { avatarUrl: next[0] }) });
    }).finally(() => { if (inputRef.current) inputRef.current.value = ''; });
  };

  const move = (index, delta) => {
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    run('Saving…', () => save({ photos: next }));
  };

  const remove = (url) => run('Removing…', async () => {
    const next = photos.filter((item) => item !== url);
    await save({ photos: next, ...(avatarUrl === url ? { avatarUrl: next[0] || null } : {}) });
    try {
      await deleteObject(ref(storage, url));
    } catch {
      // Already gone, or not a Storage file: the list is what matters.
    }
  });

  const disabled = !loaded || Boolean(busy);

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white" data-testid="profile-photos-admin">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Profile photos</h2>
        {busy && <span className="animate-pulse text-xs text-green-400">{busy}</span>}
      </div>
      <p className="mt-1 text-sm text-gray-400">
        These are the photos in the About gallery on the Spotify page, in this order; the first is the About card’s cover.
        Pick one as your profile image for both sites. Changes save immediately.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {photos.map((url, index) => {
          const isAvatar = url === avatarUrl;
          return (
            <div key={url} className={`w-[150px] rounded-lg border p-2 ${isAvatar ? 'border-green-500/60 bg-green-500/10' : 'border-white/10 bg-[#101010]'}`}>
              <img src={url} alt={`Photo ${index + 1}`} className="h-[130px] w-full rounded object-cover" />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} earlier`} className="rounded p-0.5 text-gray-400 hover:text-white disabled:opacity-25">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" disabled={disabled || index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} later`} className="rounded p-0.5 text-gray-400 hover:text-white disabled:opacity-25">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button type="button" disabled={disabled} onClick={() => remove(url)} aria-label={`Remove photo ${index + 1}`} className="rounded p-0.5 text-red-300/80 hover:text-red-200 disabled:opacity-25">
                  <X size={16} />
                </button>
              </div>
              <button
                type="button"
                disabled={disabled || isAvatar}
                onClick={() => run('Saving…', () => save({ avatarUrl: url }))}
                className={`mt-2 w-full rounded-md px-2 py-1 text-xs font-semibold ${isAvatar ? 'bg-green-500 text-black' : 'border border-white/25 text-white hover:bg-white/10'} disabled:cursor-default`}
              >
                {isAvatar ? 'Profile image' : 'Use as profile image'}
              </button>
            </div>
          );
        })}
        {loaded && photos.length === 0 && (
          <p className="text-sm text-gray-500">No photos yet. Until you add some, the site shows the built-in profile photo.</p>
        )}
      </div>

      <label className="mt-4 block text-sm">
        Add photos
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(event) => upload(event.target.files)}
          className="mt-1 block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-gray-200 disabled:opacity-50"
        />
      </label>

      {(error || loadError) && <p className="mt-3 text-sm text-red-400">{error || loadError}</p>}
    </section>
  );
}

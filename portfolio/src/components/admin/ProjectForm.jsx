import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import ReadmeEditor from './ReadmeEditor';

const EMPTY_FORM = {
  title: '',
  description: '',
  tags: '',
  github: '',
  website: '',
  year: '',
  type: 'Album',
  duration: '',
  imageUrl: '',
  lyricsEnabled: true,
  posterUrl: '',
  backdropUrl: '',
  tagline: '',
};

function sanitizeFileName(name) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function ProjectForm({ mode, project, onCancel, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  // Letterboxd artwork picked for upload; each overrides its URL field on save.
  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  // Remounts the file inputs so a saved or abandoned pick is cleared from them.
  const [fileInputsKey, setFileInputsKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Hand-written README (readmeSources/{docId}); `savedReadme` is what's stored.
  const [readme, setReadme] = useState('');
  const [savedReadme, setSavedReadme] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);
  // New projects get their doc id up front so README images have a home.
  const [draftDocId, setDraftDocId] = useState(() => doc(collection(db, 'projects')).id);
  const editingDocId = mode === 'edit' && project?.docId ? project.docId : null;
  const projectDocId = editingDocId || draftDocId;

  useEffect(() => {
    setReadme('');
    setSavedReadme('');
    if (!editingDocId) {
      setDraftDocId(doc(collection(db, 'projects')).id);
      return undefined;
    }
    let cancelled = false;
    setReadmeLoading(true);
    getDoc(doc(db, 'readmeSources', editingDocId))
      .then((snapshot) => {
        if (cancelled) return;
        const markdown = snapshot.exists() ? String(snapshot.data()?.markdown || '') : '';
        setReadme(markdown);
        setSavedReadme(markdown);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReadmeLoading(false); });
    return () => { cancelled = true; };
  }, [editingDocId]);

  useEffect(() => {
    if (mode === 'edit' && project) {
      setForm({
        title: project.title || '',
        description: project.description || '',
        tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
        github: project.github || '',
        website: project.website || '',
        year: project.year ?? '',
        type: project.type || 'Album',
        duration: project.duration || '',
        imageUrl: project.imageUrl || '',
        lyricsEnabled: project.lyricsEnabled !== false,
        posterUrl: project.posterUrl || '',
        backdropUrl: project.backdropUrl || '',
        tagline: project.tagline || '',
      });
      setImageFile(null);
      setLocalPreviewUrl('');
      setPosterFile(null);
      setBackdropFile(null);
      setFileInputsKey((key) => key + 1);
      return;
    }

    setForm(EMPTY_FORM);
    setImageFile(null);
    setLocalPreviewUrl('');
    setPosterFile(null);
    setBackdropFile(null);
    setFileInputsKey((key) => key + 1);
  }, [mode, project]);

  useEffect(() => {
    if (!imageFile) {
      setLocalPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!posterFile) {
      setPosterPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(posterFile);
    setPosterPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [posterFile]);

  const parsedData = useMemo(() => {
    const cleanTags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      tags: cleanTags,
      github: form.github.trim() || null,
      website: form.website.trim() || null,
      year: Number(form.year),
      type: form.type,
      duration: form.duration.trim(),
      imageUrl: form.imageUrl.trim() || null,
      lyricsEnabled: Boolean(form.lyricsEnabled),
      // Letterboxd mode
      posterUrl: form.posterUrl.trim() || null,
      backdropUrl: form.backdropUrl.trim() || null,
      tagline: form.tagline.trim(),
    };
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!parsedData.title || Number.isNaN(parsedData.year)) {
      setError('Title and year are required.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload a picked file into the project's Storage folder and return its
      // URL; with no file the typed URL stands.
      const uploadOr = async (file, label, typedUrl, previousUrl) => {
        if (!file) return typedUrl;
        const safeName = sanitizeFileName(file.name);
        const ext = safeName.includes('.') ? '' : '.jpg';
        const fileRef = ref(storage, `projects/${projectDocId}/${Date.now()}-${label}${safeName}${ext}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        // Best effort cleanup for replaced Storage-hosted images.
        // A file still referenced by another of the project's image fields stays.
        const stillUsed = [parsedData.imageUrl, parsedData.posterUrl, parsedData.backdropUrl]
          .filter((other) => other === previousUrl).length > (typedUrl === previousUrl ? 1 : 0);
        if (previousUrl && previousUrl !== url && !stillUsed) {
          try {
            await deleteObject(ref(storage, previousUrl));
          } catch {
            // Ignore if URL is external/non-Storage or already deleted.
          }
        }
        return url;
      };

      const nextImageUrl = await uploadOr(imageFile, '', parsedData.imageUrl, project?.imageUrl || null);
      const nextPosterUrl = await uploadOr(posterFile, 'poster-', parsedData.posterUrl, project?.posterUrl || null);
      const nextBackdropUrl = await uploadOr(backdropFile, 'backdrop-', parsedData.backdropUrl, project?.backdropUrl || null);

      const payload = {
        ...parsedData,
        imageUrl: nextImageUrl || null,
        posterUrl: nextPosterUrl || null,
        backdropUrl: nextBackdropUrl || null,
      };

      if (mode === 'edit' && project?.docId) {
        await updateDoc(doc(db, 'projects', project.docId), payload);
      } else {
        // Bump all existing projects' orderingPriority by 1 so the new one sits at the top
        const existingSnapshot = await getDocs(collection(db, 'projects'));
        const batch = writeBatch(db);
        existingSnapshot.docs.forEach((existingDoc) => {
          const current = existingDoc.data().orderingPriority ?? 999;
          batch.update(doc(db, 'projects', existingDoc.id), { orderingPriority: current + 1 });
        });
        await batch.commit();

        await setDoc(doc(db, 'projects', projectDocId), {
          ...payload,
          orderingPriority: 0,
          views: 0,
          createdAt: serverTimestamp(),
          whatsNewAt: serverTimestamp(),
          whatsNewEnabled: true,
        });
      }

      // The README source is saved after the project doc exists: its write
      // is what queues processing. Repo-backed projects ignore it.
      if (!payload.github && readme !== savedReadme) {
        const sourceRef = doc(db, 'readmeSources', projectDocId);
        if (readme.trim()) await setDoc(sourceRef, { markdown: readme, updatedAt: serverTimestamp() });
        else await deleteDoc(sourceRef);
      }

      onSaved();
      setReadme('');
      setSavedReadme('');
      setDraftDocId(doc(collection(db, 'projects')).id);
      setForm(EMPTY_FORM);
      setImageFile(null);
      setLocalPreviewUrl('');
      setPosterFile(null);
      setBackdropFile(null);
      setFileInputsKey((key) => key + 1);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const currentImageUrl = localPreviewUrl || form.imageUrl || '';

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white">
      <h2 className="text-lg font-semibold">{mode === 'edit' ? 'Edit Project' : 'Add Project'}</h2>
      {mode === 'edit' && project?.title && (
        <p className="mt-1 text-sm text-gray-400">Currently editing: {project.title}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Type
          <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2">
            <option>Album</option>
            <option>Single</option>
            <option>EP</option>
          </select>
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Description
          <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Tags (comma-separated)
          <input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          GitHub URL
          <input value={form.github} onChange={(e) => setForm((prev) => ({ ...prev, github: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Website URL
          <input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Year
          <input type="number" value={form.year} onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Duration (MM:SS)
          <input value={form.duration} onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Image URL (optional)
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="https://..."
            className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2"
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Upload Image (optional, overrides URL)
          <input
            type="file"
            accept="image/*"
            key={`image-${fileInputsKey}`}
            onChange={(e) => {
              setImageFile(e.target.files?.[0] || null);
            }}
            className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-gray-200"
          />
          {imageFile && <span className="text-xs text-gray-400">Selected: {imageFile.name}</span>}
        </label>

        <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">README (no GitHub repo)</div>

        <div className="md:col-span-2">
          {form.github.trim() ? (
            <p className="rounded-md border border-white/10 bg-[#101010] px-3 py-3 text-sm text-gray-400">
              This project streams its README from the GitHub URL above. Clear that field to write one by hand instead.
            </p>
          ) : readmeLoading ? (
            <p className="text-sm text-gray-400">Loading README…</p>
          ) : (
            <ReadmeEditor projectDocId={projectDocId} value={readme} onChange={setReadme} />
          )}
        </div>

        <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Letterboxd mode</div>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Tagline (the all-caps line above the description on the Letterboxd film page, e.g. “Earn. Spend. Party.”)
          <input value={form.tagline} onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))} maxLength={120} className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Poster URL (2:3, optional)
          <input value={form.posterUrl} onChange={(e) => setForm((prev) => ({ ...prev, posterUrl: e.target.value }))} placeholder="https://..." className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Backdrop URL (16:9, optional)
          <input value={form.backdropUrl} onChange={(e) => setForm((prev) => ({ ...prev, backdropUrl: e.target.value }))} placeholder="https://..." className="rounded-md border border-white/20 bg-[#0f0f0f] px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Upload poster (2:3, optional, overrides URL)
          <input
            key={`poster-${fileInputsKey}`}
            type="file"
            accept="image/*"
            aria-label="Upload poster"
            onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-gray-200"
          />
          {posterFile && <span className="text-xs text-gray-400">Selected: {posterFile.name}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Upload backdrop (16:9, optional, overrides URL)
          <input
            key={`backdrop-${fileInputsKey}`}
            type="file"
            accept="image/*"
            aria-label="Upload backdrop"
            onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-gray-200"
          />
          {backdropFile && <span className="text-xs text-gray-400">Selected: {backdropFile.name}</span>}
        </label>

        {(posterPreviewUrl || form.posterUrl) && (
          <div className="md:col-span-2 flex items-center gap-3 text-xs text-gray-400">
            <img
              src={posterPreviewUrl || form.posterUrl}
              alt="Poster preview"
              className="h-[120px] w-[80px] rounded border border-white/15 bg-[#1c1c1c] object-cover"
            />
            <span>{posterPreviewUrl ? 'New poster, uploaded when you save.' : 'Current poster.'}</span>
          </div>
        )}

        <label className="md:col-span-2 flex items-center gap-3 rounded-md border border-white/10 bg-[#101010] px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.lyricsEnabled)}
            onChange={(e) => setForm((prev) => ({ ...prev, lyricsEnabled: e.target.checked }))}
            className="h-4 w-4 accent-green-500"
          />
          <span>Enable lyrics view when a processed README is available</span>
        </label>

        {mode === 'edit' && project ? (
          <div className="md:col-span-2 rounded-md border border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-300">
            <p>Processing status: <span className="font-medium text-white">{project.processingStatus || 'idle'}</span></p>
            <p className="mt-1">Manual duration: <span className="font-medium text-white">{project.duration || '—'}</span></p>
            <p className="mt-1">Generated duration: <span className="font-medium text-white">{project.generatedDurationSec ? `${Math.floor(project.generatedDurationSec / 60)}:${String(project.generatedDurationSec % 60).padStart(2, '0')}` : '—'}</span></p>
            {project.processedReadmeRef?.commitSha ? (
              <p className="mt-1">
                {project.processedReadmeRef.commitSha.startsWith('manual-') ? 'Source: ' : 'Latest commit: '}
                <span className="font-mono text-white">{project.processedReadmeRef.commitSha.startsWith('manual-') ? 'hand-written README' : project.processedReadmeRef.commitSha.slice(0, 7)}</span>
              </p>
            ) : null}
            {project.latestProcessingError ? <p className="mt-1 text-red-300">{project.latestProcessingError}</p> : null}
            {(project.latestProcessingWarnings || []).map((warning) => <p key={warning} className="mt-1 text-amber-300">{warning}</p>)}
          </div>
        ) : null}

        {currentImageUrl && (
          <div className="md:col-span-2">
            <p className="mb-2 text-xs text-gray-400">Current image preview</p>
            <img src={currentImageUrl} alt="Project preview" className="h-32 w-32 rounded-md object-cover border border-white/15" />
          </div>
        )}

        <div className="md:col-span-2 flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-black disabled:bg-gray-500">
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Project'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white">
            Cancel
          </button>
        </div>

        {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}
      </form>
    </section>
  );
}

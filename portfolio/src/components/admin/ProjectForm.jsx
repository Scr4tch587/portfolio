import { useEffect, useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      });
      setImageFile(null);
      setLocalPreviewUrl('');
      return;
    }

    setForm(EMPTY_FORM);
    setImageFile(null);
    setLocalPreviewUrl('');
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
      const projectDocId = mode === 'edit' && project?.docId
        ? project.docId
        : doc(collection(db, 'projects')).id;

      let nextImageUrl = parsedData.imageUrl;
      if (imageFile) {
        const previousImageUrl = project?.imageUrl || null;
        const safeName = sanitizeFileName(imageFile.name);
        const ext = safeName.includes('.') ? '' : '.jpg';
        const path = `projects/${projectDocId}/${Date.now()}-${safeName}${ext}`;
        const imageRef = ref(storage, path);
        await uploadBytes(imageRef, imageFile);
        nextImageUrl = await getDownloadURL(imageRef);

        // Best effort cleanup for replaced Storage-hosted images.
        if (previousImageUrl && previousImageUrl !== nextImageUrl) {
          try {
            await deleteObject(ref(storage, previousImageUrl));
          } catch {
            // Ignore if URL is external/non-Storage or already deleted.
          }
        }
      }

      const payload = {
        ...parsedData,
        imageUrl: nextImageUrl || null,
      };

      if (mode === 'edit' && project?.docId) {
        await updateDoc(doc(db, 'projects', project.docId), payload);
      } else {
        await setDoc(doc(db, 'projects', projectDocId), {
          ...payload,
          views: 0,
          createdAt: serverTimestamp(),
          whatsNewAt: serverTimestamp(),
          whatsNewEnabled: true,
        });
      }

      onSaved();
      setForm(EMPTY_FORM);
      setImageFile(null);
      setLocalPreviewUrl('');
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
            onChange={(e) => {
              setImageFile(e.target.files?.[0] || null);
            }}
            className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-gray-200"
          />
          {imageFile && <span className="text-xs text-gray-400">Selected: {imageFile.name}</span>}
        </label>

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

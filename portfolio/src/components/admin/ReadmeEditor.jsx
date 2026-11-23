import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebase';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // the pipeline skips anything larger

function sanitizeFileName(name) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

const altFromFile = (file) => String(file.name || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[[\]]/g, '');

/**
 * Markdown editor for a hand-written README (projects without a GitHub
 * repo). Same GitHub-flavoured markdown the repo pipeline takes. Images are
 * uploaded to Storage and inserted as ordinary markdown image links, which
 * the pipeline then caches and sizes like any README image.
 */
export default function ReadmeEditor({ projectDocId, value, onChange }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('write');
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');

  const insertAtCursor = (snippet) => {
    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : value.length;
    const end = textarea ? textarea.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Images sit on their own line so they become their own lyric chunk.
    const lead = before && !before.endsWith('\n') ? '\n\n' : '';
    const trail = after.startsWith('\n') ? '' : '\n\n';
    const next = `${before}${lead}${snippet}${trail}${after}`;
    onChange(next);
    const caret = (before + lead + snippet + trail).length;
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(caret, caret);
    });
  };

  const uploadImages = async (files) => {
    const images = [...files].filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    setError('');
    for (const file of images) {
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is over 5 MB and would be skipped; resize it first.`);
        continue;
      }
      setUploading((count) => count + 1);
      try {
        const path = `projects/${projectDocId}/readme-${Date.now()}-${sanitizeFileName(file.name)}`;
        const imageRef = ref(storage, path);
        await uploadBytes(imageRef, file, { contentType: file.type });
        const url = await getDownloadURL(imageRef);
        insertAtCursor(`![${altFromFile(file)}](${url})`);
      } catch (uploadError) {
        setError(uploadError?.message || `Failed to upload ${file.name}.`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
  };

  const handlePaste = (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault();
      uploadImages(files);
    }
  };

  const handleDrop = (event) => {
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length === 0) return;
    event.preventDefault();
    uploadImages(files);
  };

  const tabClass = (name) => `rounded-md px-3 py-1 text-xs font-semibold ${tab === name ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'}`;

  return (
    <div className="rounded-md border border-white/10 bg-[#101010] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={tabClass('write')} onClick={() => setTab('write')}>Write</button>
        <button type="button" className={tabClass('preview')} onClick={() => setTab('preview')}>Preview</button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto rounded-md border border-white/25 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
        >
          {uploading > 0 ? 'Uploading…' : 'Add image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Add README image"
          className="hidden"
          onChange={(event) => {
            uploadImages(event.target.files || []);
            event.target.value = '';
          }}
        />
      </div>

      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          rows={18}
          spellCheck
          aria-label="README markdown"
          placeholder={'# What I did\n\nWrite it like a GitHub README: headings, lists, tables, code blocks, images.\nPaste or drop an image to upload it.'}
          className="mt-3 w-full rounded-md border border-white/20 bg-[#0b0b0b] px-3 py-2 font-mono text-[13px] leading-relaxed"
        />
      ) : (
        <div className="lyric-markdown readme-preview mt-3 max-h-[520px] min-h-[200px] overflow-y-auto rounded-md border border-white/10 bg-[#0b0b0b] px-4 py-3 text-white">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-sm text-gray-500">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
        GitHub-flavoured markdown. Saving the project processes it into the lyrics view and the Letterboxd journal, like a repo README. Images: use the button, paste, or drop; max 5 MB each.
      </p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { db } from '../../firebase';
import {
  SECTION_ALBUMS,
  SECTION_LABELS,
  SECTION_POPULAR,
  SECTION_SINGLES,
  albumsOf,
  isAlbum,
  mergeSectionOrder,
  popularReleasesOf,
  singlesAndEpsOf,
} from '../../lib/discography';

function move(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** One ordered column: drag a row or use the arrows; optional remove. */
export function OrderList({ label, items, disabled, onReorder, onRemove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const finishDrag = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      onReorder(move(items, dragIndex, overIndex));
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ol className="mt-3 space-y-1" aria-label={`${label} order`}>
      {items.map((project, index) => (
        <li
          key={project.docId}
          draggable={!disabled}
          onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragIndex(index); }}
          onDragOver={(event) => { event.preventDefault(); setOverIndex(index); }}
          onDragEnd={finishDrag}
          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm select-none ${
            overIndex === index && dragIndex !== null && dragIndex !== index
              ? 'border-green-500/40 bg-green-500/15'
              : 'border-transparent hover:bg-white/5'
          } ${dragIndex === index ? 'opacity-40' : ''}`}
        >
          <GripVertical size={14} className="shrink-0 cursor-grab text-gray-500" />
          <span className="w-4 shrink-0 text-right text-xs tabular-nums text-gray-500">{index + 1}</span>
          {project.imageUrl ? (
            <img src={project.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded bg-[#1c1c1c] object-cover" />
          ) : (
            <div className="h-7 w-7 shrink-0 rounded bg-[#1c1c1c]" />
          )}
          <span className="min-w-0 flex-1 truncate">{project.title || '(untitled)'}</span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">{project.type}</span>
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onReorder(move(items, index, index - 1))}
            aria-label={`Move ${project.title} up in ${label}`}
            className="rounded p-0.5 text-gray-400 hover:text-white disabled:opacity-25"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            disabled={disabled || index === items.length - 1}
            onClick={() => onReorder(move(items, index, index + 1))}
            aria-label={`Move ${project.title} down in ${label}`}
            className="rounded p-0.5 text-gray-400 hover:text-white disabled:opacity-25"
          >
            <ChevronDown size={14} />
          </button>
          {onRemove && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(project)}
              aria-label={`Remove ${project.title} from ${label}`}
              className="rounded p-0.5 text-red-300/80 hover:text-red-200 disabled:opacity-25"
            >
              <X size={14} />
            </button>
          )}
        </li>
      ))}
      {items.length === 0 && <li className="px-2 py-2 text-xs text-gray-500">Nothing here yet.</li>}
    </ol>
  );
}

/**
 * Curation for the Spotify discography: the exact order of each of its
 * three sections, and which projects are allowed into "Popular releases".
 */
export default function DiscographyOrder({ projects }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const popular = popularReleasesOf(projects);
  const albums = albumsOf(projects);
  const singles = singlesAndEpsOf(projects);
  const notInPopular = projects
    .filter((project) => !popular.includes(project))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  /** Write only the docs whose value actually changes. */
  const commit = async (updates) => {
    const changed = updates.filter(({ project, field, value }) => (project[field] ?? null) !== value);
    if (changed.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const batch = writeBatch(db);
      changed.forEach(({ project, field, value }) => {
        batch.update(doc(db, 'projects', project.docId), { [field]: value });
      });
      await batch.commit();
    } catch (commitError) {
      setError(commitError?.message || 'Failed to save the order.');
    } finally {
      setSaving(false);
    }
  };

  const savePopular = (ordered, removed = []) => commit([
    ...ordered.map((project, index) => ({ project, field: 'popularRank', value: index + 1 })),
    ...removed.map((project) => ({ project, field: 'popularRank', value: null })),
  ]);

  const saveTypeSection = (ordered, inSection) => commit(
    mergeSectionOrder(projects, ordered, inSection)
      .map((project, index) => ({ project, field: 'orderingPriority', value: index + 1 })),
  );

  const column = 'rounded-lg border border-white/10 bg-[#101010] p-3';

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Discography order</h2>
        {saving && <span className="animate-pulse text-xs text-green-400">Saving…</span>}
      </div>
      <p className="mt-1 text-sm text-gray-400">
        The order of each discography tab on the Spotify page. Drag a row or use the arrows; changes save immediately.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={column}>
          <h3 className="text-sm font-semibold">{SECTION_LABELS[SECTION_POPULAR]}</h3>
          <p className="mt-0.5 text-xs text-gray-400">Only the projects you add here appear in this tab. Empty hides the tab.</p>
          <OrderList
            label={SECTION_LABELS[SECTION_POPULAR]}
            items={popular}
            disabled={saving}
            onReorder={(ordered) => savePopular(ordered)}
            onRemove={(project) => savePopular(popular.filter((item) => item !== project), [project])}
          />
          <select
            defaultValue=""
            disabled={saving || notInPopular.length === 0}
            aria-label="Add a project to Popular releases"
            onChange={(event) => {
              const project = notInPopular.find((item) => item.docId === event.target.value);
              event.target.value = '';
              if (project) savePopular([...popular, project]);
            }}
            className="mt-3 w-full rounded-md border border-white/20 bg-[#0f0f0f] px-2 py-1.5 text-sm"
          >
            <option value="">Add a project…</option>
            {notInPopular.map((project) => (
              <option key={project.docId} value={project.docId}>{project.title} ({project.type})</option>
            ))}
          </select>
        </div>

        <div className={column}>
          <h3 className="text-sm font-semibold">{SECTION_LABELS[SECTION_ALBUMS]}</h3>
          <p className="mt-0.5 text-xs text-gray-400">Every project whose type is Album.</p>
          <OrderList label={SECTION_LABELS[SECTION_ALBUMS]} items={albums} disabled={saving} onReorder={(ordered) => saveTypeSection(ordered, isAlbum)} />
        </div>

        <div className={column}>
          <h3 className="text-sm font-semibold">{SECTION_LABELS[SECTION_SINGLES]}</h3>
          <p className="mt-0.5 text-xs text-gray-400">Every project whose type is Single or EP.</p>
          <OrderList label={SECTION_LABELS[SECTION_SINGLES]} items={singles} disabled={saving} onReorder={(ordered) => saveTypeSection(ordered, (project) => !isAlbum(project))} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

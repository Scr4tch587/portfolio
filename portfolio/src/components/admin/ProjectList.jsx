import { useState, useRef, useCallback } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { GripVertical } from 'lucide-react';

export default function ProjectList({ projects, loading, deletingProjectId, onRefresh, onAdd, onEdit, onDelete }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const dragNode = useRef(null);

  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    dragNode.current = e.target.closest('[data-row]');
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image semi-transparent
    requestAnimationFrame(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';

    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...projects];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);

      // Batch-write new orderingPriority values
      setSaving(true);
      try {
        const batch = writeBatch(db);
        reordered.forEach((project, i) => {
          batch.update(doc(db, 'projects', project.docId), { orderingPriority: i + 1 });
        });
        await batch.commit();
      } catch (err) {
        console.error('Failed to save order:', err);
      } finally {
        setSaving(false);
      }
    }

    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }, [dragIndex, overIndex, projects]);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  }, []);

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Projects</h2>
          {saving && <span className="text-xs text-green-400 animate-pulse">Saving order...</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="rounded-md border border-white/25 px-3 py-2 text-xs font-semibold text-white">
            Refresh
          </button>
          <button type="button" onClick={onAdd} className="rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-black">
            Add New Project
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {!loading && projects.length === 0 && (
          <p className="py-4 text-gray-400 text-sm">No projects found.</p>
        )}
        {projects.map((project, index) => {
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== index;

          return (
            <div
              key={project.docId}
              data-row
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnter={(e) => e.preventDefault()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors select-none ${
                isOver
                  ? 'bg-green-500/15 border border-green-500/40'
                  : isDragging
                    ? 'opacity-40'
                    : 'border border-transparent hover:bg-white/5'
              }`}
            >
              <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 shrink-0">
                <GripVertical size={16} />
              </div>

              <span className="text-xs text-gray-500 w-5 text-right tabular-nums shrink-0">{index + 1}</span>

              {project.imageUrl ? (
                <img src={project.imageUrl} alt="" className="w-9 h-9 rounded object-cover shrink-0 bg-[#1c1c1c]" />
              ) : (
                <div className="w-9 h-9 rounded bg-[#1c1c1c] shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{project.title || '(untitled)'}</p>
                <p className="text-xs text-gray-400 truncate">
                  {project.year || '-'} &bull; {project.type || '-'}
                  {Array.isArray(project.tags) && project.tags.length > 0 && (
                    <> &bull; {project.tags.slice(0, 3).join(', ')}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => onEdit(project)} className="rounded-md border border-white/25 px-3 py-1 text-xs font-semibold text-white">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(project)}
                  disabled={deletingProjectId === project.docId}
                  className="rounded-md border border-red-400/60 px-3 py-1 text-xs font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingProjectId === project.docId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import { useState, useRef, useCallback } from 'react';
import { collection, doc, getDocs, limit, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { GripVertical } from 'lucide-react';

function getStatusTone(status) {
  if (status === 'ready') return 'bg-green-500/15 text-green-300 border-green-400/20';
  if (status === 'asset_error') return 'bg-amber-500/15 text-amber-200 border-amber-400/20';
  if (status === 'processing' || status === 'pending') return 'bg-blue-500/15 text-blue-200 border-blue-400/20';
  if (status === 'failed' || status === 'parse_error' || status === 'private_or_missing' || status === 'rate_limited') {
    return 'bg-red-500/15 text-red-200 border-red-400/20';
  }
  return 'bg-white/10 text-white/70 border-white/10';
}

function formatJobTime(timestamp) {
  if (!timestamp?.toDate) return 'Pending';
  return timestamp.toDate().toLocaleString();
}

export default function ProjectList({
  projects,
  loading,
  deletingProjectId,
  processingProjectId,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onReprocess,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [jobsByProjectId, setJobsByProjectId] = useState({});
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

  const toggleExpanded = useCallback(async (project) => {
    const nextProjectId = expandedProjectId === project.docId ? null : project.docId;
    setExpandedProjectId(nextProjectId);
    if (!nextProjectId || jobsByProjectId[nextProjectId]) return;

    const jobsQuery = query(
      collection(db, 'projects', project.docId, 'processingJobs'),
      orderBy('createdAt', 'desc'),
      limit(5),
    );
    const snapshot = await getDocs(jobsQuery);
    setJobsByProjectId((prev) => ({
      ...prev,
      [project.docId]: snapshot.docs.map((jobDoc) => ({ id: jobDoc.id, ...jobDoc.data() })),
    }));
  }, [expandedProjectId, jobsByProjectId]);

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

          const projectJobs = jobsByProjectId[project.docId] || [];
          const isExpanded = expandedProjectId === project.docId;

          return (
            <div key={project.docId} className="rounded-lg border border-transparent">
              <div
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{project.title || '(untitled)'}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusTone(project.processingStatus)}`}>
                      {project.processingStatus || 'idle'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {project.year || '-'} &bull; {project.type || '-'}
                    {Array.isArray(project.tags) && project.tags.length > 0 && (
                      <> &bull; {project.tags.slice(0, 3).join(', ')}</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {project.github ? (
                    <button
                      type="button"
                      onClick={() => onReprocess(project)}
                      disabled={processingProjectId === project.docId}
                      className="rounded-md border border-green-400/40 px-3 py-1 text-xs font-semibold text-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingProjectId === project.docId ? 'Queueing...' : 'Reprocess'}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => toggleExpanded(project)} className="rounded-md border border-white/15 px-3 py-1 text-xs font-semibold text-white/80">
                    {isExpanded ? 'Hide jobs' : 'Jobs'}
                  </button>
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

              {isExpanded ? (
                <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-xs text-gray-300">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">Latest processing jobs</span>
                    {project.generatedDurationSec ? (
                      <span className="text-gray-400">Generated duration: {Math.floor(project.generatedDurationSec / 60)}:{String(project.generatedDurationSec % 60).padStart(2, '0')}</span>
                    ) : null}
                  </div>
                  {projectJobs.length === 0 ? (
                    <p className="text-gray-400">No jobs loaded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {projectJobs.map((job) => (
                        <div key={job.id} className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{job.trigger}</span>
                            <span className={`rounded-full border px-2 py-0.5 uppercase tracking-wide ${getStatusTone(job.status)}`}>{job.status}</span>
                            <span className="font-mono text-white/70">{job.resolvedCommitSha?.slice(0, 7) || job.requestedCommitSha?.slice(0, 7) || 'pending'}</span>
                            <span className="text-gray-500">{formatJobTime(job.startedAt || job.createdAt)}</span>
                          </div>
                          {job.error?.message ? (
                            <p className="mt-1 text-red-200">{job.error.message}</p>
                          ) : null}
                          {Array.isArray(job.warnings) && job.warnings.length > 0 ? (
                            <p className="mt-1 text-amber-100">{job.warnings[0]}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

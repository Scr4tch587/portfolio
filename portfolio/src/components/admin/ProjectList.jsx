export default function ProjectList({ projects, loading, deletingProjectId, onRefresh, onAdd, onEdit, onDelete }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="rounded-md border border-white/25 px-3 py-2 text-xs font-semibold text-white">
            Refresh
          </button>
          <button type="button" onClick={onAdd} className="rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-black">
            Add New Project
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-400">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Year</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Tags</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-400">No projects found.</td>
              </tr>
            )}
            {projects.map((project) => (
              <tr key={project.docId} className="border-b border-white/5">
                <td className="py-3 pr-4 font-medium">{project.title || '(untitled)'}</td>
                <td className="py-3 pr-4">{project.year || '-'}</td>
                <td className="py-3 pr-4">{project.type || '-'}</td>
                <td className="py-3 pr-4 text-gray-300">{Array.isArray(project.tags) ? project.tags.slice(0, 3).join(', ') : '-'}</td>
                <td className="py-3 flex items-center gap-2">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

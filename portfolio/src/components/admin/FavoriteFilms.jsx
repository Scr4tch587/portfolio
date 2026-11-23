import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { MAX_FAVORITE_FILMS, favoriteFilmsOf } from '../../lib/favorites';
import { OrderList } from './DiscographyOrder';

const LABEL = 'Favorite projects';

/** Curation for the four "Favorite films" on the Letterboxd profile. */
export default function FavoriteFilms({ projects }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const favorites = favoriteFilmsOf(projects);
  const isFull = favorites.length >= MAX_FAVORITE_FILMS;
  const candidates = projects
    .filter((project) => !favorites.includes(project))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  /**
   * Rank the chosen projects in order and clear every other project that
   * still carries a rank or the older `featured` flag.
   */
  const save = async (ordered) => {
    const writes = [];
    projects.forEach((project) => {
      const index = ordered.indexOf(project);
      if (index >= 0) {
        if (project.favoriteRank !== index + 1 || project.featured !== true) {
          writes.push([project, { favoriteRank: index + 1, featured: true }]);
        }
      } else if (Number.isFinite(project.favoriteRank) || project.featured) {
        writes.push([project, { favoriteRank: null, featured: false }]);
      }
    });
    if (writes.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const batch = writeBatch(db);
      writes.forEach(([project, data]) => batch.update(doc(db, 'projects', project.docId), data));
      await batch.commit();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save the favorite projects.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#161616] p-5 text-white" data-testid="favorite-films-admin">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Letterboxd favorite projects</h2>
        {saving && <span className="animate-pulse text-xs text-green-400">Saving…</span>}
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Up to {MAX_FAVORITE_FILMS} projects shown, in this order, as “Favorite projects” on the Letterboxd profile.
        Left empty, the row shows the most viewed projects. Changes save immediately.
      </p>

      <div className="mt-4 max-w-md rounded-lg border border-white/10 bg-[#101010] p-3">
        <OrderList
          label={LABEL}
          items={favorites}
          disabled={saving}
          onReorder={save}
          onRemove={(project) => save(favorites.filter((item) => item !== project))}
        />
        <select
          defaultValue=""
          disabled={saving || isFull || candidates.length === 0}
          aria-label="Add a project to Favorite projects"
          onChange={(event) => {
            const project = candidates.find((item) => item.docId === event.target.value);
            event.target.value = '';
            if (project) save([...favorites, project]);
          }}
          className="mt-3 w-full rounded-md border border-white/20 bg-[#0f0f0f] px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="">{isFull ? `All ${MAX_FAVORITE_FILMS} slots are filled — remove one first` : 'Add a project…'}</option>
          {candidates.map((project) => (
            <option key={project.docId} value={project.docId}>{project.title} ({project.type})</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

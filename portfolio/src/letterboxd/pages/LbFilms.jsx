import React, { useMemo, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import Poster from '../Poster';
import { byName, byNewest, byRating, byViews, filmType } from '../lbData';

const SORTS = [
  ['popular', 'Popular', byViews],
  ['rating', 'Highest rated', byRating],
  ['newest', 'Newest', byNewest],
  ['name', 'Name', byName],
];
const TYPES = ['All', 'Feature', 'Featurette', 'Short'];

const selectClass = 'h-7 rounded-[3px] bg-lb-panel px-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-lb-heading focus:outline-none';

/** Browse: the whole catalog as a 6-across poster grid with sort + format. */
export default function LbFilms() {
  const { allProjectsList } = usePlayer();
  const [sortKey, setSortKey] = useState('popular');
  const [type, setType] = useState('All');

  const projects = useMemo(() => {
    const sorter = SORTS.find(([key]) => key === sortKey)?.[2] || byViews;
    return allProjectsList
      .filter((project) => type === 'All' || filmType(project.type) === type)
      .sort(sorter);
  }, [allProjectsList, sortKey, type]);

  return (
    <div className="pt-6">
      <div className="mb-4 flex items-center justify-between border-b border-lb-line pb-2">
        <h1 className="text-[12px] font-medium uppercase tracking-[0.075em] text-lb-text">
          Projects <span className="text-lb-muted">· {projects.length}</span>
        </h1>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-lb-muted">
          <label className="flex items-center gap-1.5">Format
            <select value={type} onChange={(event) => setType(event.target.value)} className={selectClass} aria-label="Filter by format">
              {TYPES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">Sort by
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)} className={selectClass} aria-label="Sort projects">
              {SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2.5">
        {projects.map((project) => <Poster key={project.docId} project={project} showMeta />)}
      </div>
    </div>
  );
}

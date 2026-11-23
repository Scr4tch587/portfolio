import React, { useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import Poster from '../Poster';

export default function LbSearch({ query }) {
  const { allProjectsList, searchProjects } = usePlayer();
  const films = useMemo(() => searchProjects(query, allProjectsList), [query, allProjectsList, searchProjects]);

  return (
    <div className="pt-6">
      <h1 className="lb-section-heading"><span>Results for “{query}”</span></h1>
      {films.length === 0 && <p className="py-6 text-lb-muted">Nothing matched.</p>}
      {films.length > 0 && (
        <div className="grid grid-cols-6 gap-2.5">
          {films.map((project) => <Poster key={project.docId} project={project} showMeta />)}
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useProcessedReadme } from '../../hooks/useProcessedReadme';
import { MarkdownBlock } from '../../components/lyrics/MarkdownBlock';
import { lbHref } from '../lbRoute';
import { KAI, findProjectBySlug, projectSlug } from '../lbData';

/** A README rendered as a Letterboxd journal long-read. */
export default function LbArticle({ slug }) {
  const { allProjectsList, projectsLoaded } = usePlayer();
  const project = useMemo(() => findProjectBySlug(allProjectsList, slug), [allProjectsList, slug]);
  const { data, loading, error } = useProcessedReadme(project);
  const chunks = data?.chunks || [];

  if (!project) return <p className="pt-16 text-center text-lb-text">{projectsLoaded ? 'No such story.' : 'Loading…'}</p>;

  const rawSha = project.processedReadmeRef?.commitSha;
  // Hand-written READMEs carry a 'manual-…' content revision, not a commit.
  const commitSha = rawSha && !rawSha.startsWith('manual-') ? rawSha : null;
  const commitUrl = commitSha && project.github ? `${String(project.github).replace(/\.git$/, '').replace(/\/+$/, '')}/commit/${commitSha}` : null;

  return (
    <article className="mx-auto max-w-[660px] pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lb-muted">
        Story
      </p>
      <h1 className="lb-serif mt-2 text-[40px] font-bold leading-[1.1] text-white">
        <a href={lbHref.film(projectSlug(project))} className="hover:text-lb-blue">{project.title}</a>
      </h1>
      <p className="mt-3 text-[13px] text-lb-text">
        By <a href={lbHref.home()} className="font-semibold text-lb-heading hover:text-lb-blue">{KAI.name}</a>
        {commitSha && (
          <>
            <span className="mx-1.5 text-lb-muted">·</span>
            from commit{' '}
            {commitUrl ? <a href={commitUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-lb-heading hover:text-lb-blue">{commitSha.slice(0, 7)}</a> : <span className="font-mono">{commitSha.slice(0, 7)}</span>}
          </>
        )}
      </p>
      {project.image && (
        <div className="mt-6 overflow-hidden rounded-[4px] bg-lb-panel">
          <img src={project.backdropUrl || project.image} alt="" className="mx-auto max-h-[360px] object-contain" />
        </div>
      )}

      <div className="lb-article mt-6">
        {loading && <p className="text-lb-muted">Loading…</p>}
        {error && <p className="text-lb-orange">{error}</p>}
        {chunks.map((chunk, index) => {
          const prev = chunks[index - 1];
          const isContinuation = Boolean(prev && prev.sourceBlockIndex === chunk.sourceBlockIndex && prev.type === chunk.type);
          return (
            <MarkdownBlock
              key={chunk.id || `${chunk.type}-${index}`}
              chunk={chunk}
              isActive
              isPast={false}
              isContinuation={isContinuation}
            />
          );
        })}
      </div>
    </article>
  );
}

import React from 'react';
import { lbHref } from './lbRoute';
import Stars from './Stars';
import { formatCount, posterBackground, projectSlug, ratingOf } from './lbData';

/**
 * 2:3 poster. Real posters come from `posterUrl`; otherwise the square
 * Spotify art is set on a blurred copy of itself so nothing is cropped.
 */
export function PosterImage({ project, className = '' }) {
  const poster = project?.posterUrl;
  const art = project?.image || project?.imageUrl;
  if (poster) {
    return <img src={poster} alt={project.title} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  if (!art) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-lb-panel px-2 text-center text-xs font-semibold text-lb-heading ${className}`}>
        {project?.title}
      </div>
    );
  }
  const flat = posterBackground(project);
  if (flat) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: flat.background }}>
        <img src={art} alt={project.title} loading="lazy" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: flat.scale }} />
      </div>
    );
  }
  return (
    <div className={`relative h-full w-full overflow-hidden bg-lb-panel ${className}`}>
      <img src={art} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-60 blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />
      <img src={art} alt={project.title} loading="lazy" className="absolute left-1/2 top-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] shadow-xl" />
    </div>
  );
}

export default function Poster({ project, showMeta = false, className = '' }) {
  const rating = ratingOf(project);
  return (
    <div className={className}>
      <a href={lbHref.film(projectSlug(project))} className="lb-poster" title={project.title} aria-label={project.title}>
        <PosterImage project={project} />
      </a>
      {showMeta && (
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-lb-muted">
          <Stars value={rating} size={10} showEmpty={false} />
          <span className="ml-auto inline-flex items-center gap-1 tabular-nums" title={`${formatCount(project.views)} views`}>
            <EyeIcon />
            {formatCount(project.views)}
          </span>
        </div>
      )}
    </div>
  );
}

export function EyeIcon({ size = 11, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 5C6.5 5 2.3 8.6 1 12c1.3 3.4 5.5 7 11 7s9.7-3.6 11-7c-1.3-3.4-5.5-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  );
}

export function HeartIcon({ size = 12, className = '', filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} className={className} aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.9 6.4 4.4c2-.3 3.9.6 5.6 2.5 1.7-1.9 3.6-2.8 5.6-2.5 3.5.5 5.5 4 4 7.4C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

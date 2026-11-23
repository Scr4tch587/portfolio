import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { usePlayer } from '../../context/PlayerContext';
import { useMyRating } from '../../hooks/useRatings';
import { rateProject, ratingSummary } from '../../lib/ratings';
import { PosterImage, EyeIcon } from '../Poster';
import RatingInput from '../RatingInput';
import RatingsPanel from '../RatingsPanel';
import ReadmeReviews from '../ReadmeReviews.jsx';
import { Star } from '../Stars';
import { lbHref } from '../lbRoute';
import { KAI, findProjectBySlug, formatCount, isReadmeReady, projectSlug } from '../lbData';

function GithubGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

function GlobeGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.8 3 4.2 6.1 4.2 9.5s-1.4 6.5-4.2 9.5c-2.8-3-4.2-6.1-4.2-9.5S9.2 5.5 12 2.5z" />
    </svg>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Website';
  }
}

/** One service row of the "Where to watch" box. */
function WatchRow({ href, icon, iconClass, name, tag }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="lb-watch-row group">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] ${iconClass}`}>{icon}</span>
      <span className="min-w-0 truncate text-[13px] leading-[18px] text-lb-text group-hover:text-white">{name}</span>
      <span className="lb-watch-tag">{tag}</span>
    </a>
  );
}

/**
 * The film page: backdrop; poster and "Where to watch" on the left; title,
 * tagline, synopsis and the stack (as "Cast") in the middle; the rating box
 * and ratings histogram on the right.
 * Opening it counts a view (the Spotify mode's "stream").
 */
export default function LbFilm({ slug }) {
  const { allProjectsList, projectsLoaded } = usePlayer();
  const project = useMemo(() => findProjectBySlug(allProjectsList, slug), [allProjectsList, slug]);
  const myRating = useMyRating(project ? String(project.docId ?? project.id) : null);
  const [copied, setCopied] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);

  const projectKey = project ? String(project.docId ?? project.id) : null;
  useEffect(() => {
    if (!projectKey) return;
    httpsCallable(functions, 'registerStream')({ projectId: projectKey })
      .catch((error) => console.error('Error registering view:', error));
  }, [projectKey]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!project) {
    return (
      <div className="pt-16 text-center text-lb-text">
        {projectsLoaded ? 'No such project.' : 'Loading…'}
      </div>
    );
  }

  const summary = ratingSummary(project);
  const backdrop = project.backdropUrl || project.image;
  const tags = project.tags || [];
  const readmeReady = isReadmeReady(project);

  const handleRate = async (halfStars) => {
    if (ratingBusy) return;
    setRatingBusy(true);
    try {
      await rateProject(projectKey, halfStars);
    } catch (error) {
      console.error('Rating failed:', error);
    } finally {
      setRatingBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}${lbHref.film(projectSlug(project))}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt('Copy link', url);
    }
  };

  const links = [
    project.github && { href: project.github, icon: <GithubGlyph />, iconClass: 'bg-white text-[#14181c]', name: 'GitHub', tag: 'Source' },
    project.website && { href: project.website, icon: <GlobeGlyph />, iconClass: 'bg-lb-blue text-[#14181c]', name: hostOf(project.website), tag: 'Play' },
  ].filter(Boolean);

  // Measurements below are taken from a real Letterboxd film page.
  return (
    <div className="lb-film">
      {backdrop && (
        <div className="relative -mx-4 h-[380px] overflow-hidden md:-mx-[calc((100vw-950px)/2)]">
          <img src={backdrop} alt="" className={`h-full w-full object-cover ${project.backdropUrl ? '' : 'scale-110 blur-2xl opacity-70'}`} />
          <div className="absolute inset-0 bg-gradient-to-b from-lb-bg/30 via-lb-bg/50 to-lb-bg" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-lb-bg to-transparent" />
        </div>
      )}

      {/* Letterboxd's 950px content: 230 / 390 / 230 columns, 50px apart. */}
      <div className={`relative grid grid-cols-[230px_minmax(0,1fr)_230px] grid-rows-[auto_auto_1fr] gap-x-[50px] min-[982px]:-mx-4 ${backdrop ? '-mt-[150px]' : 'mt-8'}`}>
        {/* Poster column */}
        <div className="row-span-3">
          <div className="lb-poster shadow-2xl">
            <PosterImage project={project} />
          </div>
          <div className="mt-[14px] flex items-center justify-center gap-[10px] text-[12.5px] leading-[16px] text-lb-muted">
            <span className="inline-flex items-center gap-[4px] tabular-nums" title="Views"><EyeIcon size={16} className="text-lb-green" />{formatCount(project.views)}</span>
            {summary.count > 0 && <span className="inline-flex items-center gap-[4px] tabular-nums" title="Ratings"><Star size={13} fill={1} />{formatCount(summary.count)}</span>}
          </div>

          <section className="lb-watch" data-testid="lb-where-to-watch">
            <h2 className="lb-watch-heading">Where to watch</h2>
            {links.length > 0
              ? links.map((link) => <WatchRow key={link.href} {...link} />)
              : <p className="px-[10px] py-3 text-[13px] text-lb-muted">Not streaming.</p>}
          </section>
        </div>

        {/* Title line spans the middle and right columns. */}
        <div className="col-span-2 col-start-2 row-start-1 -mt-[5px] flex flex-wrap items-baseline gap-x-[14px]">
          <h1 className="lb-serif text-[38px] font-bold leading-[42px] tracking-[-0.02em] text-white">{project.title}</h1>
          <p className="text-[18px] leading-[26px] text-lb-text">
            <span className="mr-[10px] text-lb-heading underline decoration-lb-line underline-offset-[3px]">{project.year}</span>
            Directed by <a href={lbHref.home()} className="text-lb-heading underline decoration-lb-line underline-offset-[3px] hover:decoration-lb-heading">{KAI.name}</a>
          </p>
        </div>

        {/* Tagline, synopsis and the stack */}
        <div className="col-start-2 row-start-2 pt-[28px]">
          {project.tagline && (
            <p className="mb-[9px] text-[13px] uppercase leading-[18px] tracking-[0.05em] text-lb-text" data-testid="lb-tagline">{project.tagline}</p>
          )}
          <p className="lb-serif text-[17px] leading-[26.5px] text-lb-text">{project.description}</p>

          <div className="mt-[56px] flex border-b border-lb-line text-[14px] uppercase leading-[18px] tracking-[0.075em]">
            <h2 className="-mb-px border-b border-white pb-[6px] text-white">Cast</h2>
          </div>
          <div className="pt-[16px]">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-x-[4px] gap-y-[6px]" data-testid="lb-cast">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-[3px] bg-lb-chip px-[6px] py-[3px] text-[13.5px] leading-[19px] text-lb-text shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">{tag}</span>
                ))}
              </div>
            ) : <p className="text-[13px] text-lb-muted">No credits listed.</p>}
          </div>

        </div>

        {/* Sidebar: rating box + ratings histogram */}
        <aside className="col-start-3 row-start-2 pt-[30px]">
          <div className="overflow-hidden rounded-[4px] bg-lb-action text-center" data-testid="lb-action-box">
            <div className="flex flex-col items-center pb-[13px] pt-[14px]">
              <RatingInput value={myRating} onChange={handleRate} disabled={ratingBusy} />
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="block h-[39px] w-full border-t border-[#2c3440] text-[14px] text-[#bcd] hover:text-white"
            >
              {copied ? 'Link copied' : 'Share'}
            </button>
          </div>

          <div className="mt-[34px]">
            <RatingsPanel summary={summary} />
          </div>
        </aside>

        {/* The README, one review per section, in line with the cast heading. */}
        {readmeReady && (
          <div className="col-span-2 col-start-2 row-start-3 mt-[40px]">
            <ReadmeReviews project={project} />
          </div>
        )}
      </div>
    </div>
  );
}

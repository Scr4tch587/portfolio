import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useProcessedReadme } from '../hooks/useProcessedReadme';
import { useSiteProfile } from '../hooks/useSiteProfile';
import { HeartIcon } from './Poster';
import { lbHref } from './lbRoute';
import { KAI, projectSlug } from './lbData';
import { buildReadmeReviews } from './readmeSections';

const LIKES_KEY = 'likedReadmeReviews';
// Reviews taller than this collapse behind a "more" link, as on Letterboxd.
const COLLAPSE_OVER_PX = 720;
const COLLAPSED_PX = 460;

function readLikes() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIKES_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

const components = {
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  img: ({ src, alt }) => (src ? <img src={src} alt={alt || ''} loading="lazy" /> : null),
  table: ({ children }) => <div className="lb-review-table"><table>{children}</table></div>,
};

function Review({ review, liked, onToggleLike, avatar }) {
  const bodyRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);

  // Measure once laid out, and again as images load in.
  useLayoutEffect(() => {
    const node = bodyRef.current;
    if (!node) return undefined;
    const measure = () => setIsLong(node.scrollHeight > COLLAPSE_OVER_PX);
    measure();
    const observer = new ResizeObserver(measure);
    Array.from(node.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [review.markdown]);

  const collapsed = isLong && !expanded;

  return (
    <li className="flex gap-5 border-b border-lb-line/50 pb-[22px] pt-[17px]" data-testid="lb-review">
      <a href={lbHref.home()} className="shrink-0" aria-hidden="true" tabIndex={-1}>
        <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20" />
      </a>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[20px] text-lb-muted">
          Review by{' '}
          <a href={lbHref.home()} className="font-bold text-lb-text hover:text-lb-blue">{KAI.name}</a>
        </p>
        <div
          ref={bodyRef}
          className={`lb-review-body mt-[10px] ${collapsed ? 'lb-review-collapsed' : ''}`}
          style={collapsed ? { maxHeight: COLLAPSED_PX } : undefined}
        >
          {review.title && <p className="lb-review-title">{review.title}</p>}
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{review.markdown}</ReactMarkdown>
        </div>
        {isLong && (
          <button type="button" onClick={() => setExpanded((value) => !value)} className="lb-serif mt-1 text-[16px] font-normal text-white hover:text-lb-blue">
            {expanded ? 'less' : '… more'}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          className="mt-[14px] flex items-center gap-1 text-[12px] font-bold leading-[18px] text-lb-text hover:text-lb-heading"
        >
          <HeartIcon size={15} className={liked ? 'text-lb-orange' : 'text-lb-muted'} filled />
          {liked ? 'Liked' : 'Like review'}
        </button>
      </div>
    </li>
  );
}

/**
 * The project's README on its film page, in the shape of Letterboxd's
 * "Popular reviews": one review per README section, all written by Kai.
 * Review likes are remembered in this browser only.
 */
export default function ReadmeReviews({ project }) {
  const { data, loading } = useProcessedReadme(project);
  const { avatar } = useSiteProfile();
  const reviews = useMemo(() => buildReadmeReviews(data?.chunks), [data?.chunks]);
  const [likes, setLikes] = useState(readLikes);
  const projectKey = String(project.docId ?? project.id);

  useEffect(() => {
    try {
      window.localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]));
    } catch {
      // Private mode: likes just don't persist.
    }
  }, [likes]);

  if (!loading && reviews.length === 0) return null;

  const toggleLike = (id) => setLikes((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <section data-testid="lb-reviews">
      <h2 className="lb-section-heading !mb-0 !pb-[6px] !text-[14px] !font-normal !leading-[18px] !tracking-[0.075em] !text-white">
        <span>Popular reviews</span>
        <a href={lbHref.article(projectSlug(project))} className="text-[11px]">More</a>
      </h2>
      {loading && reviews.length === 0 && <p className="py-4 text-[13px] text-lb-muted">Loading…</p>}
      <ul>
        {reviews.map((review) => {
          const id = `${projectKey}:${review.key}`;
          return <Review key={review.key} avatar={avatar} review={review} liked={likes.has(id)} onToggleLike={() => toggleLike(id)} />;
        })}
      </ul>
    </section>
  );
}

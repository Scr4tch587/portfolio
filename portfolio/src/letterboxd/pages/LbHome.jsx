import React, { useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useMonthlyListeners } from '../../hooks/useMonthlyListeners';
import { DEFAULT_BIO, useSiteProfile } from '../../hooks/useSiteProfile';
import { MAX_FAVORITE_FILMS, favoriteFilmsOf } from '../../lib/favorites';
import { combinedRatingSummary } from '../../lib/ratings';
import Poster from '../Poster';
import RatingsPanel from '../RatingsPanel';
import { lbHref } from '../lbRoute';
import { KAI, byRating, byViews, formatCount } from '../lbData';

function Stat({ value, label }) {
  return (
    <div className="flex flex-col items-center px-[10px] pb-[3px] pt-[2px] first:pl-0 last:pr-0">
      <span className="lb-serif text-[21px] font-bold leading-[24px] text-lb-heading">{value}</span>
      <span className="mt-[2px] text-[10px] font-normal uppercase leading-[12px] tracking-[1px] text-lb-muted">{label}</span>
    </div>
  );
}

function PosterRow({ title, projects, href, showMeta = true }) {
  if (projects.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="lb-section-heading">
        <span>{title}</span>
        {href && <a href={href}>All</a>}
      </h2>
      <div className="grid grid-cols-4 gap-2.5">
        {projects.map((project) => <Poster key={project.docId} project={project} showMeta={showMeta} />)}
      </div>
    </section>
  );
}

/**
 * Home = the owner's member profile, Letterboxd layout: avatar and stats, then favorite / recent / popular poster rows with the ratings
 * histogram in the sidebar.
 */
export default function LbHome() {
  const { allProjectsList } = usePlayer();
  const monthlyVisitors = useMonthlyListeners();
  const { bio, avatar } = useSiteProfile();
  const thisYear = new Date().getFullYear();

  const featured = useMemo(() => {
    const picked = favoriteFilmsOf(allProjectsList);
    return picked.length > 0 ? picked : [...allProjectsList].sort(byViews).slice(0, MAX_FAVORITE_FILMS);
  }, [allProjectsList]);
  const popular = useMemo(() => [...allProjectsList].sort(byViews).slice(0, 4), [allProjectsList]);
  const topRated = useMemo(() => [...allProjectsList].sort(byRating).filter((p) => (p.ratingCount || 0) >= 3).slice(0, 4), [allProjectsList]);
  const ratings = useMemo(() => combinedRatingSummary(allProjectsList), [allProjectsList]);

  return (
    <div>
      {/* Offsets below are measured from a real Letterboxd profile header. */}
      <div className="lb-profile-header flex items-start gap-5 pt-8">
        <img src={avatar} alt={KAI.name} className="h-[100px] w-[100px] shrink-0 rounded-full object-cover ring-1 ring-white/25" />
        <div className="min-w-0 flex-1 pt-[9px]">
          <h1 className="text-[22px] font-bold leading-[26px] text-white">{KAI.name}</h1>
          <p className="mt-[7px] text-[13px] leading-[20px] whitespace-pre-line text-lb-text" data-testid="lb-bio">{bio ?? DEFAULT_BIO}</p>
          <div className="mt-[10px] flex flex-wrap items-center gap-x-5 text-[13px] leading-[20px] text-lb-muted">
            <span className="inline-flex items-center gap-[3px]">
              <svg width="8" height="13" viewBox="0 0 8 13" fill="currentColor" className="opacity-80" aria-hidden="true">
                <path d="M4 0a4 4 0 0 0-.8 7.9v4.3a.8.8 0 0 0 1.6 0V7.9A4 4 0 0 0 4 0z" />
              </svg>
              {KAI.location}
            </span>
            <a href={lbHref.home()} className="inline-flex items-center gap-[5px] hover:text-lb-text">
              <svg width="13" height="13" viewBox="0 0 13 14" fill="currentColor" className="opacity-80" aria-hidden="true">
                <path d="M1 .6 11.6 6 7.3 7.5l3.5 4.6-1.9 1.4-3.5-4.6L2.6 12.6z" />
              </svg>
              {KAI.website}
            </a>
          </div>
        </div>
        <div className="mt-[7px] flex shrink-0 divide-x divide-lb-line/60">
          <Stat value={formatCount(allProjectsList.length)} label="Projects" />
          <Stat value={formatCount(allProjectsList.filter((p) => Number(p.year) === thisYear).length)} label="This year" />
          <Stat value={formatCount(monthlyVisitors)} label="Visitors" />
        </div>
      </div>

      {/* Where Letterboxd lists Activity / Films / Diary…, this lists Kai's links. */}
      <nav className="lb-profile-nav" aria-label="Profile">
        <a href={lbHref.home()} aria-current="page">Profile</a>
        {KAI.links.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
        ))}
      </nav>

      <div className="mt-8 grid grid-cols-[1fr_230px] gap-10">
        <div>
          <PosterRow title="Favorite projects" projects={featured} showMeta={false} />
          <PosterRow title="Popular" projects={popular} href={lbHref.films()} />
          <PosterRow title="Highest rated" projects={topRated} href={lbHref.films()} />
        </div>
        <aside className="space-y-8">
          <RatingsPanel summary={ratings} />
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Play, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import LikeButton from './LikeButton';

function getProjectDate(project) {
  const raw = project?.whatsNewAt || project?.createdAt;
  if (raw?.toDate) return raw.toDate();
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function getRelativeLabelFromDate(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absMs = Math.abs(diffMs);
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  if (absMs < hourMs) return diffMs >= 0 ? 'just now' : 'soon';
  if (absMs < dayMs) {
    const hours = Math.max(1, Math.floor(absMs / hourMs));
    return diffMs >= 0 ? `${hours} hour${hours === 1 ? '' : 's'} ago` : `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  const days = Math.max(1, Math.floor(absMs / dayMs));
  if (days === 1) return diffMs >= 0 ? '1 day ago' : 'in 1 day';
  if (days < 30) return diffMs >= 0 ? `${days} days ago` : `in ${days} days`;

  const months = Math.max(1, Math.floor(days / 30));
  return diffMs >= 0 ? `${months} month${months === 1 ? '' : 's'} ago` : `in ${months} month${months === 1 ? '' : 's'}`;
}

const WhatsNewMenu = () => {
  const { whatsNewOpen, closeWhatsNew, playProject, allProjectsList, toggleLike, isLiked } = usePlayer();
  const [filter, setFilter] = useState('all');

  const handlePlayFromMenu = (project) => {
    playProject(project);
    closeWhatsNew();
  };

  useEffect(() => {
    if (!whatsNewOpen) return undefined;
    setFilter('all');

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeWhatsNew();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [whatsNewOpen, closeWhatsNew]);

  const items = useMemo(() => {
    const latest = [...allProjectsList]
      .map((project) => ({
        project,
        createdAtDate: getProjectDate(project),
      }))
      .filter(({ project, createdAtDate }) => (
        project?.title
        && project?.whatsNewEnabled === true
        && createdAtDate
      ))
      .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime())
      .slice(0, 8)
      .map(({ project, createdAtDate }) => {
        const rawType = String(project.type || 'Single').trim().toLowerCase();
        const normalizedType = rawType === 'album' ? 'album' : rawType === 'ep' ? 'ep' : 'single';
        const displayType = normalizedType === 'album' ? 'Album' : normalizedType === 'ep' ? 'EP' : 'Single';
        return {
        id: project.id,
        title: project.title || 'Untitled',
        artist: 'Kai Zhang',
        type: displayType,
        typeKey: normalizedType,
        image: project.image || null,
        ageLabel: getRelativeLabelFromDate(createdAtDate),
        source: project,
      };
      });

    if (filter === 'albums') {
      return latest.filter((item) => item.typeKey === 'album');
    }
    if (filter === 'singles') {
      return latest.filter((item) => item.typeKey === 'single');
    }
    if (filter === 'eps') {
      return latest.filter((item) => item.typeKey === 'ep');
    }
    return latest;
  }, [allProjectsList, filter]);

  if (!whatsNewOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[2px] flex items-start justify-center p-4 pt-24 md:pt-28" onClick={closeWhatsNew}>
      <div
        className="w-full max-w-xl max-h-[72vh] bg-[#090909] border border-white/10 rounded-xl shadow-2xl overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-white text-4xl leading-tight tracking-tight font-black">What&apos;s New</h2>
            <button type="button" onClick={closeWhatsNew} className="text-gray-400 hover:text-white" aria-label="Close what's new">
              <X size={20} />
            </button>
          </div>
          <p className="mt-2.5 text-base text-[#a7a7a7] leading-relaxed">Latest updates from me.</p>

          <div className="mt-4 flex items-center gap-2.5 flex-wrap">
            {[['all', 'All'], ['albums', 'Albums'], ['singles', 'Singles'], ['eps', 'EPs']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium leading-none border ${filter === key ? 'bg-white text-black border-white' : 'bg-[#232323] text-[#d0d0d0] border-transparent hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pb-4">
          {items.length === 0 ? (
            <div className="mx-2 mt-2 rounded-xl border border-white/10 bg-[#0d0d0d] p-5 text-[#a7a7a7] text-sm">
              No updates in this filter yet.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="mx-2 mt-2 rounded-xl border border-white/10 bg-[#0b0b0b] p-4 min-h-[170px] flex flex-col">
                <div className="flex items-start gap-3.5">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-[72px] h-[72px] rounded object-cover" />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded bg-[#262626] flex items-center justify-center text-2xl font-bold text-gray-300">
                      {item.title[0]}
                    </div>
                  )}
                  <div className="pt-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handlePlayFromMenu(item.source)}
                      className="text-white text-2xl leading-tight font-semibold tracking-tight truncate hover:underline text-left"
                    >
                      {item.title}
                    </button>
                    <p className="text-[#d1d1d1] text-base mt-0.5">{item.artist}</p>
                    <p className="text-[#d1d1d1] text-base mt-3">{item.type} • {item.ageLabel}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between px-1 pt-4">
                  <LikeButton
                    isLiked={isLiked(item.source?.id)}
                    onToggle={() => toggleLike(item.source?.id)}
                    ariaLabel={isLiked(item.source?.id) ? 'Unlike' : 'Like'}
                    size={24}
                  />

                  <button
                    type="button"
                    className="w-[56px] h-[56px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                    aria-label={`Play ${item.title}`}
                    onClick={() => handlePlayFromMenu(item.source)}
                  >
                    <Play size={24} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsNewMenu;

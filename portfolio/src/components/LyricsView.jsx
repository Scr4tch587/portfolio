import { useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useProcessedReadme } from '../hooks/useProcessedReadme';
import { useLyricsPlayback } from '../hooks/useLyricsPlayback';
import { useDominantColor } from '../hooks/useDominantColor';
import { MarkdownBlock } from './lyrics/MarkdownBlock';
import { SpClose } from './icons/SpotifyIcons';

function commitUrlFor(project) {
  const github = String(project?.github || '').replace(/\.git$/, '').replace(/\/+$/, '');
  const sha = project?.processedReadmeRef?.commitSha;
  if (!github || !sha) return null;
  return `${github}/commit/${sha}`;
}

export default function LyricsView({ project }) {
  const { goHome } = usePlayer();
  const { data, loading, error } = useProcessedReadme(project);
  const chunks = useMemo(() => data?.chunks || [], [data?.chunks]);
  const { activeBlockIndex, registerBlockRef } = useLyricsPlayback(chunks);
  const tint = useDominantColor(project?.imageUrl);

  // Escape leaves the lyrics page (playback keeps going), unless the
  // visitor is typing in the search box.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      goHome();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // goHome is recreated each provider render; bind once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pinned to the top-right of the scrolling pane on every state of the page.
  const closeButton = (
    <div className="sticky top-4 z-20 h-0">
      <button
        type="button"
        onClick={goHome}
        aria-label="Close lyrics"
        title="Close (Esc)"
        className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#b3b3b3] transition-all hover:scale-105 hover:bg-black/70 hover:text-white"
      >
        <SpClose size={16} />
      </button>
    </div>
  );

  const backgroundStyle = {
    background: `radial-gradient(circle at top, rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.14), transparent 32%), linear-gradient(180deg, #1b1b1b 0%, #121212 45%, #0b0b0b 100%)`,
  };

  if (project?.processingStatus === 'pending' || project?.processingStatus === 'processing') {
    return (
      <div className="min-h-full px-6 py-12 text-white md:px-10" style={backgroundStyle}>
        {closeButton}
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/20 p-8">
          <div className="mb-4 h-3 w-28 animate-pulse rounded-full bg-green-500/50" />
          <h1 className="text-3xl font-black tracking-tight">Processing README...</h1>
          <p className="mt-3 text-white/70">The project is queued or currently ingesting its README. Playback will switch here automatically once processing completes.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full px-6 py-12 text-white md:px-10" style={backgroundStyle}>
        {closeButton}
        <div className="mx-auto max-w-3xl space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-3xl border border-white/8 bg-white/5 p-6">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full px-6 py-12 text-white md:px-10" style={backgroundStyle}>
        {closeButton}
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black tracking-tight">Couldn’t load the processed README</h1>
          <p className="mt-3 text-white/75">{error}</p>
          <button
            type="button"
            onClick={goHome}
            className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const commitUrl = commitUrlFor(project);
  const shortSha = project?.processedReadmeRef?.commitSha?.slice(0, 7);
  // Hand-written READMEs (no repo) have a content revision, not a commit.
  const isManual = Boolean(project?.processedReadmeRef?.commitSha?.startsWith('manual-'));

  return (
    <div className="min-h-full px-6 py-6 text-white md:px-10" style={backgroundStyle}>
        {closeButton}
      <div className={`mx-auto max-w-3xl px-4 text-xs text-white/40 ${isManual ? 'invisible' : ''}`} aria-hidden={isManual}>
        Streaming from GitHub commit{' '}
        {commitUrl && shortSha ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-white/60 underline decoration-white/30 underline-offset-2 hover:text-white"
          >
            {shortSha}
          </a>
        ) : (
          <span className="font-mono">{shortSha || 'unknown'}</span>
        )}
      </div>

      <div className="mx-auto max-w-3xl pb-[55vh] pt-6">
        {chunks.map((chunk, index) => {
          const prev = chunks[index - 1];
          const isContinuation = Boolean(prev
            && prev.sourceBlockIndex === chunk.sourceBlockIndex
            && prev.type === chunk.type);
          return (
            <div key={chunk.id || `${chunk.type}-${index}`} ref={registerBlockRef(index)}>
              <MarkdownBlock
                chunk={chunk}
                isActive={index === activeBlockIndex}
                isPast={index < activeBlockIndex}
                isContinuation={isContinuation}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

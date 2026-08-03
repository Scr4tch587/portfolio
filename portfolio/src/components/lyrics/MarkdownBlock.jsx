import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MEDIA_TYPES = new Set(['code', 'table', 'image']);

// Spotify shading: already-sung lines fade well back, upcoming lines stay
// clearly more readable than past ones, active line is pure white.
function blockClasses({ isActive, isPast, type }) {
  // Code/table/image chunks carry their own colors (backgrounds, borders,
  // pixels), so wrapper text color won't dim them — fade the whole chunk.
  if (MEDIA_TYPES.has(type)) {
    if (isActive) return 'opacity-100';
    return isPast ? 'opacity-25' : 'opacity-55';
  }
  if (isActive) {
    return 'text-white';
  }
  return isPast ? 'text-white/25' : 'text-white/55';
}

function wrapperClassesForType(chunk, isContinuation) {
  switch (chunk.type) {
    case 'heading':
      return 'px-4 pt-5 pb-2';
    case 'separator':
      return 'px-4 py-1';
    case 'table':
      // Split table rows stack flush so they read as one table.
      return typeof chunk.tableRow === 'number' ? 'px-4 py-0' : 'px-4 py-2.5';
    case 'code':
    case 'image':
      return 'px-4 py-2.5';
    case 'bullet':
    case 'numbered':
      return isContinuation ? 'px-4 py-0.5' : 'px-4 pt-2 pb-0.5';
    default:
      // Sentence chunks of the same paragraph sit close together.
      return isContinuation ? 'px-4 pt-0 pb-1' : 'px-4 pt-2 pb-1';
  }
}

function proseClassesForType(type, depth) {
  if (type === 'heading') {
    if (depth === 1) return 'lyric-markdown lyric-heading-1';
    if (depth === 2) return 'lyric-markdown lyric-heading-2';
    return 'lyric-markdown lyric-heading-3';
  }
  if (type === 'bullet' || type === 'numbered') return 'lyric-markdown lyric-list';
  if (type === 'blockquote') return 'lyric-markdown lyric-quote';
  if (type === 'code') return 'lyric-markdown lyric-code';
  if (type === 'table') return 'lyric-markdown lyric-table';
  if (type === 'image') return 'lyric-markdown lyric-image';
  return 'lyric-markdown lyric-paragraph';
}

const markdownComponents = {
  h1: ({ children }) => <h1 className="border-b border-white/10 pb-2 text-[2rem] font-semibold leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="border-b border-white/10 pb-1.5 text-2xl font-semibold leading-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold leading-tight">{children}</h3>,
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-inherit underline decoration-green-400/70 underline-offset-4 hover:decoration-green-300">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="border-l-4 border-green-500 pl-4">{children}</blockquote>,
  ul: ({ children }) => <ul className="list-disc pl-6">{children}</ul>,
  ol: ({ children, start }) => <ol start={start} className="list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ inline, children }) => (
    inline
      ? <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.92em]">{children}</code>
      : <code className="font-mono">{children}</code>
  ),
  pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-[#161616] p-4 text-[13px] leading-relaxed text-white/90">{children}</pre>,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      className="max-h-[420px] w-auto max-w-full rounded-lg border border-white/10 object-contain"
    />
  ),
  hr: () => <hr className="border-white/10" />,
  table: ({ children }) => <div className="overflow-x-auto rounded-lg border border-white/10"><table className="min-w-full border-collapse text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-white/5 text-white">{children}</thead>,
  th: ({ children }) => <th className="border-b border-green-500/60 px-4 py-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-white/10 px-4 py-3 text-white/85">{children}</td>,
};

// Table-row chunks each carry the header so their markdown parses as valid
// GFM, but only the first row shows it; table-fixed keeps columns aligned
// across the stacked per-row tables.
function componentsForChunk(chunk) {
  if (chunk.type !== 'table' || typeof chunk.tableRow !== 'number') {
    return markdownComponents;
  }
  const isFirst = chunk.tableRow === 1;
  const isLast = chunk.tableRow === chunk.tableRows;
  return {
    ...markdownComponents,
    table: ({ children }) => (
      <div className={`overflow-x-auto border-x border-white/10 ${isFirst ? 'rounded-t-lg border-t' : ''} ${isLast ? 'rounded-b-lg border-b' : ''}`}>
        <table className="w-full table-fixed border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    ...(isFirst ? {} : { thead: () => null }),
  };
}

function MarkdownBlockComponent({ chunk, isActive, isPast, isContinuation }) {
  const wrapperClass = `rounded-3xl transition-[color,opacity] duration-300 ease-out ${wrapperClassesForType(chunk, isContinuation)} ${blockClasses({ isActive, isPast, type: chunk.type })}`;

  return (
    <section className={wrapperClass}>
      <div className={proseClassesForType(chunk.type, chunk.depth)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsForChunk(chunk)}>
          {chunk.markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}

export const MarkdownBlock = memo(MarkdownBlockComponent);

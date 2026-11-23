import { slugify } from './lbData';

// Headings at or above this depth start a new review.
const SPLIT_DEPTH = 3;

const lastLine = (text) => String(text || '').trimEnd().split('\n').pop();

/**
 * The processed README arrives as lyric-sized chunks (a sentence, a list
 * item, a table row). Stitch those back into whole markdown blocks.
 */
function blocksToMarkdown(chunks) {
  const blocks = [];
  let previous = null;

  chunks.forEach((chunk) => {
    if (chunk.type === 'separator' || chunk.type === 'blank') {
      previous = null;
      return;
    }
    const continues = previous
      && previous.sourceBlockIndex === chunk.sourceBlockIndex
      && previous.type === chunk.type;
    const isTableRow = chunk.type === 'table' && typeof chunk.tableRow === 'number';

    if (continues && chunk.type === 'paragraph') {
      blocks[blocks.length - 1] += ` ${chunk.markdown}`;
    } else if (continues && (chunk.type === 'bullet' || chunk.type === 'numbered')) {
      blocks[blocks.length - 1] += `\n${chunk.markdown}`;
    } else if (continues && isTableRow) {
      // Every row chunk repeats the header; keep only its own row.
      blocks[blocks.length - 1] += `\n${lastLine(chunk.markdown)}`;
    } else {
      blocks.push(chunk.markdown);
    }
    previous = chunk;
  });

  return blocks.join('\n\n');
}

/**
 * Split a processed README into review-sized pieces, one per heading:
 * [{ key, title, markdown }]. Text before the first heading is its own piece.
 */
export function buildReadmeReviews(chunks) {
  const pieces = [];
  let current = { title: '', chunks: [] };

  (chunks || []).forEach((chunk) => {
    if (chunk.type === 'heading' && (chunk.depth || 1) <= SPLIT_DEPTH) {
      if (current.title || current.chunks.length > 0) pieces.push(current);
      current = { title: chunk.plainText || '', chunks: [] };
    } else {
      current.chunks.push(chunk);
    }
  });
  if (current.title || current.chunks.length > 0) pieces.push(current);

  const usedKeys = new Map();
  return pieces
    .map((piece) => ({ title: piece.title, markdown: blocksToMarkdown(piece.chunks) }))
    .filter((piece) => piece.title || piece.markdown.trim())
    .map((piece) => {
      const base = slugify(piece.title || 'intro');
      const seen = usedKeys.get(base) || 0;
      usedKeys.set(base, seen + 1);
      return { ...piece, key: seen ? `${base}-${seen + 1}` : base };
    });
}

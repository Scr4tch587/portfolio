const { toString } = require('mdast-util-to-string');
const { toMarkdown } = require('mdast-util-to-markdown');
const { gfmToMarkdown } = require('mdast-util-gfm');

// The parse side uses remark-gfm, so trees contain GFM nodes (table, delete,
// task-list items) that plain toMarkdown cannot serialize.
const TO_MARKDOWN_OPTIONS = { extensions: [gfmToMarkdown()] };

// Granularity: one chunk per "attention unit" — a sentence of prose, a list
// item, a table row, a whole code block. Blocks render exactly as GitHub
// would; only the highlight/scroll timing is chunked.
const MIN_CHUNK_MS = 1100;
const MAX_CHUNK_MS = 10000;
const MIN_SENTENCE_WORDS = 5;

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

function createChunkId(index) {
  return `c-${String(index).padStart(4, '0')}`;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseDurationSeconds(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration > 0 ? duration : 0;
  }

  if (typeof duration !== 'string') return 0;
  const parts = duration.trim().split(':').map((value) => Number.parseInt(value, 10));
  if (parts.length !== 2 || parts.some((value) => Number.isNaN(value))) {
    return 0;
  }
  return (parts[0] * 60) + parts[1];
}

function wordCount(text) {
  return normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function withAssetUrls(node, assetMap) {
  const next = cloneNode(node);

  function rewrite(current) {
    if (!current || typeof current !== 'object') return;

    if (current.type === 'image') {
      const asset = assetMap.get(current.url);
      if (asset) {
        current.url = asset.downloadUrl;
      } else {
        current.url = '';
        current.alt = current.alt || 'Image unavailable';
      }
    }

    if (Array.isArray(current.children)) {
      current.children.forEach(rewrite);
    }
  }

  rewrite(next);
  return next;
}

function serializeBlockMarkdown(node) {
  return toMarkdown(node, TO_MARKDOWN_OPTIONS).trim();
}

function createChunkBase(node, type, sourceBlockIndex, chunkIndex, overrides = {}) {
  return {
    id: createChunkId(chunkIndex),
    type,
    depth: overrides.depth,
    markdown: overrides.markdown || '',
    plainText: overrides.plainText || '',
    startMs: 0,
    endMs: 0,
    durationMs: 0,
    sourceBlockIndex,
    sourceLineStart: node?.position?.start?.line || null,
    sourceLineEnd: node?.position?.end?.line || null,
    ...(overrides.extra || {}),
  };
}

// Split a paragraph's inline children into sentence groups. Text nodes split
// only at sentence-ending punctuation followed by whitespace; other inline
// nodes (links, code, emphasis) stay attached to the sentence in progress.
function splitParagraphSentences(node) {
  const groups = [];
  let current = [];

  const endGroup = () => {
    if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  };

  for (const child of node.children || []) {
    if (child.type === 'text') {
      const parts = String(child.value).split(/(?<=[.!?])\s+/);
      parts.forEach((part, index) => {
        if (part) {
          current.push({ type: 'text', value: part });
        }
        const isLast = index === parts.length - 1;
        if (!isLast || (part && /[.!?]$/.test(part.trimEnd()))) {
          endGroup();
        }
      });
    } else {
      current.push(cloneNode(child));
    }
  }
  endGroup();

  // Merge fragments too short to stand alone ("e.g.", trailing stubs).
  const merged = [];
  for (const group of groups) {
    const words = wordCount(toString({ type: 'paragraph', children: group }));
    if (merged.length > 0 && words < MIN_SENTENCE_WORDS) {
      merged[merged.length - 1].push(...group);
    } else if (merged.length > 0 && wordCount(toString({ type: 'paragraph', children: merged[merged.length - 1] })) < MIN_SENTENCE_WORDS) {
      merged[merged.length - 1].push(...group);
    } else {
      merged.push(group);
    }
  }

  return merged.map((children) => {
    if (children[0]?.type === 'text') {
      children[0].value = children[0].value.replace(/^\s+/, '');
    }
    return children;
  });
}

function pushParagraphChunks(node, sourceBlockIndex, nextChunkIndexRef, chunks) {
  splitParagraphSentences(node).forEach((children) => {
    const paragraphNode = { type: 'paragraph', children };
    chunks.push(createChunkBase(node, 'paragraph', sourceBlockIndex, nextChunkIndexRef.value++, {
      markdown: serializeBlockMarkdown(paragraphNode),
      plainText: normalizeWhitespace(toString(paragraphNode)),
    }));
  });
}

function pushTableChunks(node, assetMap, sourceBlockIndex, nextChunkIndexRef, chunks) {
  const rewritten = withAssetUrls(node, assetMap);
  const [headerRow, ...dataRows] = rewritten.children || [];

  if (!headerRow || dataRows.length === 0) {
    chunks.push(createChunkBase(node, 'table', sourceBlockIndex, nextChunkIndexRef.value++, {
      markdown: serializeBlockMarkdown(rewritten),
      plainText: normalizeWhitespace(toString(rewritten)),
    }));
    return;
  }

  dataRows.forEach((row, index) => {
    // Every mini-table carries the header so it parses as valid GFM; the
    // renderer hides the header on every chunk after the first.
    const miniTable = {
      type: 'table',
      align: rewritten.align || [],
      children: [headerRow, row],
    };
    chunks.push(createChunkBase(node, 'table', sourceBlockIndex, nextChunkIndexRef.value++, {
      markdown: serializeBlockMarkdown(miniTable),
      plainText: normalizeWhitespace(toString(row)),
      extra: { tableRow: index + 1, tableRows: dataRows.length },
    }));
  });
}

function headingWeight(depth, plainText) {
  const base = depth === 1 ? 1800 : depth === 2 ? 1500 : 1300;
  return base + (wordCount(plainText) * 90);
}

function chunkWeight(chunk) {
  switch (chunk.type) {
    case 'heading':
      return headingWeight(chunk.depth || 3, chunk.plainText);
    case 'paragraph':
      return 900 + (wordCount(chunk.plainText) * 140);
    case 'bullet':
    case 'numbered':
      return 1000 + (wordCount(chunk.plainText) * 140);
    case 'blockquote':
      return 1200 + (wordCount(chunk.plainText) * 150);
    case 'code':
      return 1400 + ((chunk.markdown.split('\n').length - 2) * 220);
    case 'table':
      if (typeof chunk.tableRow === 'number') {
        return (chunk.tableRow === 1 ? 1200 : 700) + (wordCount(chunk.plainText) * 110);
      }
      return 2000 + (wordCount(chunk.plainText) * 95);
    case 'image': {
      // Bigger images earn more dwell time; the renderer caps display height,
      // so intrinsic height is capped too before it buys duration.
      const height = Number.isFinite(chunk.imageHeight) ? chunk.imageHeight : 320;
      return 1300 + (Math.min(height, 480) * 3.5);
    }
    case 'separator':
    case 'blank':
      return 0;
    default:
      return 1200 + (wordCount(chunk.plainText) * 140);
  }
}

function assignChunkTiming(chunks, targetDurationSec) {
  const positiveChunks = chunks.filter((chunk) => chunk.type !== 'separator' && chunk.type !== 'blank');
  if (positiveChunks.length === 0) {
    return chunks;
  }

  const targetMs = Math.max(0, Math.round(targetDurationSec * 1000));
  const weights = positiveChunks.map((chunk) => clamp(chunkWeight(chunk), MIN_CHUNK_MS, MAX_CHUNK_MS));
  const rawTotal = weights.reduce((total, value) => total + value, 0) || 1;
  const effectiveTargetMs = targetMs > 0 ? targetMs : rawTotal;
  const scale = effectiveTargetMs / rawTotal;

  let cursor = 0;
  let weightIndex = 0;

  chunks.forEach((chunk) => {
    if (chunk.type === 'separator' || chunk.type === 'blank') {
      chunk.startMs = cursor;
      chunk.endMs = cursor;
      chunk.durationMs = 0;
      return;
    }

    const scaled = Math.round(weights[weightIndex] * scale);
    chunk.durationMs = scaled;
    chunk.startMs = cursor;
    chunk.endMs = cursor + scaled;
    cursor += scaled;
    weightIndex += 1;
  });

  if (targetMs > 0 && positiveChunks.length > 0) {
    const lastTimedChunk = [...chunks].reverse().find((chunk) => chunk.durationMs > 0);
    if (lastTimedChunk) {
      const diff = targetMs - lastTimedChunk.endMs;
      lastTimedChunk.durationMs += diff;
      lastTimedChunk.endMs += diff;
    }
  }

  return chunks;
}

function createFallbackChunks(markdown, targetDurationSec) {
  const source = String(markdown || '');
  if (!normalizeWhitespace(source)) {
    return [];
  }

  const nextChunkIndexRef = { value: 1 };
  const chunks = source
    .split(/\n{2,}/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => createChunkBase(null, 'paragraph', 0, nextChunkIndexRef.value++, {
      markdown: piece,
      plainText: normalizeWhitespace(piece),
    }));

  return assignChunkTiming(chunks, targetDurationSec);
}

function buildReadmeLyricChunks({ tree, assetMap, targetDurationSec = 0 }) {
  const nextChunkIndexRef = { value: 1 };
  const chunks = [];

  (tree.children || []).forEach((node, sourceBlockIndex) => {
    switch (node.type) {
      case 'heading': {
        const rewritten = withAssetUrls(node, assetMap);
        chunks.push(createChunkBase(node, 'heading', sourceBlockIndex, nextChunkIndexRef.value++, {
          depth: node.depth,
          markdown: serializeBlockMarkdown(rewritten),
          plainText: normalizeWhitespace(toString(node)),
        }));
        break;
      }
      case 'paragraph': {
        const isImageOnly = node.children?.length === 1 && node.children[0]?.type === 'image';
        if (isImageOnly) {
          const asset = assetMap.get(node.children[0].url);
          const rewritten = withAssetUrls(node.children[0], assetMap);
          chunks.push(createChunkBase(node, 'image', sourceBlockIndex, nextChunkIndexRef.value++, {
            markdown: serializeBlockMarkdown(rewritten),
            plainText: normalizeWhitespace(rewritten.alt || 'Image'),
            extra: {
              imageWidth: asset?.width || null,
              imageHeight: asset?.height || null,
            },
          }));
          break;
        }

        pushParagraphChunks(withAssetUrls(node, assetMap), sourceBlockIndex, nextChunkIndexRef, chunks);
        break;
      }
      case 'list': {
        (node.children || []).forEach((item, itemIndex) => {
          const listNode = {
            type: 'list',
            ordered: Boolean(node.ordered),
            spread: false,
            start: (node.start || 1) + itemIndex,
            children: [withAssetUrls(item, assetMap)],
          };
          chunks.push(createChunkBase(item, node.ordered ? 'numbered' : 'bullet', sourceBlockIndex, nextChunkIndexRef.value++, {
            markdown: serializeBlockMarkdown(listNode),
            plainText: normalizeWhitespace(toString(item)),
          }));
        });
        break;
      }
      case 'blockquote': {
        const rewritten = withAssetUrls(node, assetMap);
        chunks.push(createChunkBase(node, 'blockquote', sourceBlockIndex, nextChunkIndexRef.value++, {
          markdown: serializeBlockMarkdown(rewritten),
          plainText: normalizeWhitespace(toString(rewritten)),
        }));
        break;
      }
      case 'code':
        chunks.push(createChunkBase(node, 'code', sourceBlockIndex, nextChunkIndexRef.value++, {
          markdown: serializeBlockMarkdown(node),
          plainText: normalizeWhitespace(node.value),
        }));
        break;
      case 'table':
        pushTableChunks(node, assetMap, sourceBlockIndex, nextChunkIndexRef, chunks);
        break;
      case 'thematicBreak':
        chunks.push(createChunkBase(node, 'separator', sourceBlockIndex, nextChunkIndexRef.value++, {
          markdown: '---',
          plainText: '',
        }));
        break;
      default:
        break;
    }
  });

  return assignChunkTiming(chunks, targetDurationSec);
}

function buildLegacyTimeline(chunks) {
  return chunks.map((chunk, index) => ({
    blockIndex: index,
    startMs: chunk.startMs,
    endMs: chunk.endMs,
    costMs: chunk.durationMs,
  }));
}

module.exports = {
  buildReadmeLyricChunks,
  buildLegacyTimeline,
  createFallbackChunks,
  parseDurationSeconds,
};

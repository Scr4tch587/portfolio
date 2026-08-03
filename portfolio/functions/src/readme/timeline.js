const MIN_BLOCK_MS = 900;
const MAX_BLOCK_MS = 30000;
const MAX_TOTAL_MS = 1500000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function getInlineText(nodes = []) {
  return nodes.map((node) => {
    if (!node) return '';
    if (node.type === 'text' || node.type === 'code') return node.value || '';
    if (node.type === 'link' || node.type === 'strong' || node.type === 'em' || node.type === 'del') {
      return getInlineText(node.children || []);
    }
    if (node.type === 'image') return node.alt || '';
    if (node.type === 'br') return ' ';
    return '';
  }).join('');
}

function getBlockCostSeconds(block) {
  switch (block.type) {
    case 'heading':
      if (block.level === 1) return 1.8;
      if (block.level === 2) return 1.4;
      return 1.1;
    case 'paragraph':
      return Math.max(0.85, countWords(getInlineText(block.inlines)) / 5.8);
    case 'list':
      return Math.max(1.8, (block.items || []).reduce((total, item) => (
        total + Math.max(0.75, countWords(getInlineText(item.inlines)) / 5)
      ), 0));
    case 'code':
      return Math.max(2, Math.min(18, (block.lineCount || 0) * 0.65));
    case 'blockquote':
      return Math.max(1.5, countWords(getInlineText(block.inlines)) / 4.5) * 1.05;
    case 'image':
      return 2.2;
    case 'table':
      return 1.8 + ((block.rows || []).length * 1);
    case 'hr':
      return 0;
    default:
      return 1.5;
  }
}

function buildTimeline(blocks) {
  const timeline = [];
  let cursor = 0;

  blocks.forEach((block, index) => {
    const rawMs = getBlockCostSeconds(block) * 1000;
    const costMs = rawMs <= 0 ? 0 : clamp(rawMs, MIN_BLOCK_MS, MAX_BLOCK_MS);
    timeline.push({
      blockIndex: index,
      startMs: cursor,
      endMs: cursor + costMs,
      costMs,
    });
    cursor += costMs;
  });

  if (timeline.length === 0) {
    return { timeline: [], durationSec: 0 };
  }

  const rawTotal = timeline[timeline.length - 1].endMs;
  const scale = rawTotal > MAX_TOTAL_MS ? MAX_TOTAL_MS / rawTotal : 1;

  if (scale !== 1) {
    timeline.forEach((entry) => {
      entry.startMs = Math.round(entry.startMs * scale);
      entry.endMs = Math.round(entry.endMs * scale);
      entry.costMs = entry.endMs - entry.startMs;
    });
  }

  return {
    timeline,
    durationSec: Math.max(1, Math.round(timeline[timeline.length - 1].endMs / 1000)),
  };
}

module.exports = {
  buildTimeline,
  getInlineText,
};

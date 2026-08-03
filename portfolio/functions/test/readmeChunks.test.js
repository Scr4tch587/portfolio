const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReadmeMarkdown } = require('../src/readme/parseReadme');
const {
  buildReadmeLyricChunks,
  createFallbackChunks,
  parseDurationSeconds,
} = require('../src/readme/readmeChunks');

function buildChunks(markdown, targetDurationSec = 30) {
  const parsed = parseReadmeMarkdown(markdown);
  return buildReadmeLyricChunks({
    tree: parsed.tree,
    assetMap: new Map(),
    targetDurationSec,
  });
}

test('large paragraphs split into manageable chunks', () => {
  const markdown = 'Tally ingests transaction events from multiple independent sources, matches them using a weighted scoring function within a configurable time window, and surfaces discrepancies in near-real-time — with a benchmark harness that proves throughput, latency, and correctness under failure injection.';
  const chunks = buildChunks(markdown, 20);

  assert.ok(chunks.length >= 3);
  chunks.forEach((chunk) => {
    assert.equal(chunk.type, 'paragraph');
    assert.ok(chunk.plainText.length <= 130);
  });
});

test('headings are preserved as heading chunks with clear depth', () => {
  const chunks = buildChunks('# Top Level\n\n## Section\n\n### Subsection', 12);
  assert.deepEqual(chunks.map((chunk) => chunk.type), ['heading', 'heading', 'heading']);
  assert.deepEqual(chunks.map((chunk) => chunk.depth), [1, 2, 3]);
});

test('bullet and numbered list items remain individual chunks', () => {
  const chunks = buildChunks('- First bullet\n- Second bullet\n\n1. Step one\n2. Step two', 16);
  assert.deepEqual(chunks.map((chunk) => chunk.type), ['bullet', 'bullet', 'numbered', 'numbered']);
});

test('blockquotes are preserved as quoted chunks', () => {
  const chunks = buildChunks('> The system should fail loudly.\n>\n> Then recover cleanly.', 12);
  assert.ok(chunks.every((chunk) => chunk.type === 'blockquote'));
  assert.ok(chunks.every((chunk) => chunk.markdown.startsWith('>')));
});

test('inline links, bold, italic, and code remain intact in markdown output', () => {
  const chunks = buildChunks('This **bold** statement links to [docs](https://example.com), uses `code`, and keeps *emphasis*.', 16);
  const combinedMarkdown = chunks.map((chunk) => chunk.markdown).join(' ');
  assert.match(combinedMarkdown, /\*\*bold\*\*/);
  assert.match(combinedMarkdown, /\[docs\]\(https:\/\/example\.com\)/);
  assert.match(combinedMarkdown, /`code`/);
  assert.match(combinedMarkdown, /\*emphasis\*/);
});

test('code blocks are preserved and long code blocks are grouped instead of wrapped', () => {
  const chunks = buildChunks('```js\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\n```', 24);
  assert.ok(chunks.every((chunk) => chunk.type === 'code'));
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((chunk) => chunk.markdown.startsWith('```js')));
});

test('total timing is normalized to the project song length', () => {
  const chunks = buildChunks('# Intro\n\nThis is a paragraph that should split into multiple chunks for timing normalization.', 42);
  const lastChunk = chunks.at(-1);
  assert.equal(lastChunk.endMs, 42000);
});

test('empty/private fallback still works via manual or description-derived content', () => {
  const fallbackChunks = createFallbackChunks('Manual fallback content for a private repo.', 18);
  assert.ok(fallbackChunks.length > 0);
  assert.equal(fallbackChunks.at(-1).endMs, 18000);
});

test('parseDurationSeconds supports standard MM:SS durations', () => {
  assert.equal(parseDurationSeconds('3:45'), 225);
  assert.equal(parseDurationSeconds('00:59'), 59);
  assert.equal(parseDurationSeconds(null), 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReadmeMarkdown } = require('../src/readme/parseReadme');
const { buildReadmeLyricChunks } = require('../src/readme/readmeChunks');
const { readGifInfo } = require('../src/readme/gifInfo');

// Minimal GIF89a: 1x1 canvas, 2-colour global table, one frame per delay.
function buildGif(delaysCs) {
  const parts = [
    Buffer.from('GIF89a', 'latin1'),
    Buffer.from([1, 0, 1, 0, 0x80, 0, 0]),
    Buffer.from([0, 0, 0, 255, 255, 255]),
  ];
  delaysCs.forEach((delay) => {
    parts.push(Buffer.from([0x21, 0xf9, 4, 0, delay & 0xff, delay >> 8, 0, 0]));
    parts.push(Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0]));
    parts.push(Buffer.from([2, 2, 0x44, 0x01, 0]));
  });
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

test('gif duration is the sum of its frame delays', () => {
  assert.deepEqual(readGifInfo(buildGif([5, 20, 300])), { frameCount: 3, durationMs: 3250 });
});

test('near-zero frame delays count as the 100ms browsers use', () => {
  assert.deepEqual(readGifInfo(buildGif([0, 1, 10])), { frameCount: 3, durationMs: 300 });
});

test('non-gif and truncated buffers are handled', () => {
  assert.equal(readGifInfo(Buffer.from('not a gif at all')), null);
  const gif = buildGif([10, 10]);
  assert.equal(readGifInfo(gif.subarray(0, gif.length - 8)).frameCount, 1);
});

test('animated gif chunks last one playthrough plus the lead-in', () => {
  const parsed = parseReadmeMarkdown('# Demo\n\n![clip](clip.gif)\n\n![still](still.png)\n\nDone.');
  const assetMap = new Map([
    ['clip.gif', { downloadUrl: 'https://cdn/clip.gif', width: 800, height: 475, animationMs: 19000 }],
    ['still.png', { downloadUrl: 'https://cdn/still.png', width: 800, height: 475, animationMs: null }],
  ]);
  const chunks = buildReadmeLyricChunks({ tree: parsed.tree, assetMap, targetDurationSec: 0 });
  const [clip, still] = chunks.filter((chunk) => chunk.type === 'image');

  assert.equal(clip.animationMs, 19000);
  assert.equal(clip.imageUrl, 'https://cdn/clip.gif');
  assert.equal(clip.durationMs, 19000 + clip.animationLeadMs);
  assert.equal(still.animationMs, undefined);
  assert.ok(still.durationMs <= 10000);
});

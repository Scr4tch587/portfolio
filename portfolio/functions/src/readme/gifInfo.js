// Reads just enough of a GIF to know how long one playthrough lasts: walks the
// block structure and sums each frame's delay. No pixel data is decoded.

// Browsers play frames with a delay of 0 or 1 centisecond at 100ms.
const MIN_BROWSER_DELAY_CS = 2;
const FALLBACK_DELAY_MS = 100;

function skipSubBlocks(buffer, offset) {
  let cursor = offset;
  while (cursor < buffer.length) {
    const size = buffer[cursor];
    cursor += 1;
    if (size === 0) return cursor;
    cursor += size;
  }
  return -1;
}

function colorTableBytes(packed) {
  return (packed & 0x80) ? 3 * (2 ** ((packed & 0x07) + 1)) : 0;
}

// Returns { frameCount, durationMs } or null when the buffer is not a GIF. A
// truncated file reports whatever frames were readable.
function readGifInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 13) return null;
  const signature = buffer.toString('latin1', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;

  let cursor = 13 + colorTableBytes(buffer[10]);
  let frameCount = 0;
  let durationMs = 0;
  let pendingDelayCs = null;

  while (cursor < buffer.length) {
    const marker = buffer[cursor];
    cursor += 1;

    if (marker === 0x3b) break; // trailer

    if (marker === 0x21) {
      const label = buffer[cursor];
      cursor += 1;
      if (label === 0xf9 && buffer[cursor] === 4 && cursor + 5 < buffer.length) {
        pendingDelayCs = buffer.readUInt16LE(cursor + 2);
      }
      cursor = skipSubBlocks(buffer, cursor);
      if (cursor < 0) break;
      continue;
    }

    if (marker === 0x2c) {
      if (cursor + 9 > buffer.length) break;
      const packed = buffer[cursor + 8];
      cursor += 9 + colorTableBytes(packed);
      cursor += 1; // LZW minimum code size
      cursor = skipSubBlocks(buffer, cursor);
      frameCount += 1;
      durationMs += (pendingDelayCs !== null && pendingDelayCs >= MIN_BROWSER_DELAY_CS)
        ? pendingDelayCs * 10
        : FALLBACK_DELAY_MS;
      pendingDelayCs = null;
      if (cursor < 0) break;
      continue;
    }

    break; // unknown block: stop rather than misread the rest
  }

  if (frameCount === 0) return null;
  return { frameCount, durationMs };
}

module.exports = {
  readGifInfo,
};

import { useEffect, useMemo, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

function findActiveBlockIndex(chunks, currentTimeMs) {
  if (!Array.isArray(chunks) || chunks.length === 0) return 0;
  let low = 0;
  let high = chunks.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const entry = chunks[mid];
    if (currentTimeMs < entry.startMs) {
      high = mid - 1;
    } else if (currentTimeMs >= entry.endMs) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, Math.min(chunks.length - 1, low));
}

function getNearestPlayableIndex(chunks, index) {
  if (!Array.isArray(chunks) || chunks.length === 0) return 0;
  for (let cursor = Math.max(0, index); cursor < chunks.length; cursor += 1) {
    if ((chunks[cursor]?.durationMs || 0) > 0) {
      return cursor;
    }
  }
  for (let cursor = Math.max(0, index - 1); cursor >= 0; cursor -= 1) {
    if ((chunks[cursor]?.durationMs || 0) > 0) {
      return cursor;
    }
  }
  return 0;
}

// Fraction of the scroll container's height where the active chunk's midpoint
// is pinned, Spotify-style. Every active-index change scrolls to this anchor
// so playback reads as a steady crawl rather than stillness followed by jumps.
const ANCHOR_RATIO = 0.4;

// Chunks taller than this fraction of the viewport (big code blocks, images)
// can't be anchored — they instead scroll progressively across their duration,
// from their top parked at TALL_TOP_RATIO to their bottom at TALL_BOTTOM_RATIO.
const TALL_BLOCK_RATIO = 0.6;
const TALL_TOP_RATIO = 0.12;
const TALL_BOTTOM_RATIO = 0.78;

function isTallBlock(node, container) {
  return node.offsetHeight > container.clientHeight * TALL_BLOCK_RATIO;
}

export function useLyricsPlayback(chunks, scrollContainerRef) {
  const { currentTime } = usePlayer();
  const blockRefs = useRef(new Map());
  const scrollTimeoutRef = useRef(null);
  const timeBucket = Math.floor(currentTime * 4);

  const activeBlockIndex = useMemo(() => {
    const rawIndex = findActiveBlockIndex(chunks, (timeBucket / 4) * 1000);
    return getNearestPlayableIndex(chunks, rawIndex);
  }, [timeBucket, chunks]);

  useEffect(() => {
    const node = blockRefs.current.get(activeBlockIndex);
    const container = node?.closest('main') || scrollContainerRef?.current;
    if (!node || !container) return undefined;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (isTallBlock(node, container)) return; // progressive effect owns tall blocks

      const containerRect = container.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const nodeMidpoint = nodeRect.top - containerRect.top + (nodeRect.height / 2);
      const anchor = containerRect.height * ANCHOR_RATIO;
      const delta = nodeMidpoint - anchor;

      if (Math.abs(delta) < 2) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({
        top: container.scrollTop + delta,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }, 80);
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [activeBlockIndex, scrollContainerRef]);

  // Progressive scroll for taller-than-viewport chunks: map playback progress
  // through the chunk onto a scroll range spanning the whole block, easing
  // toward the target each 50ms player tick so entry and crawl stay smooth.
  useEffect(() => {
    const chunk = Array.isArray(chunks) ? chunks[activeBlockIndex] : null;
    if (!chunk || !(chunk.durationMs > 0)) return;
    const node = blockRefs.current.get(activeBlockIndex);
    const container = node?.closest('main') || scrollContainerRef?.current;
    if (!node || !container || !isTallBlock(node, container)) return;

    const containerHeight = container.clientHeight;
    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const nodeTop = container.scrollTop + (nodeRect.top - containerRect.top);
    const startTop = nodeTop - (containerHeight * TALL_TOP_RATIO);
    const endTop = nodeTop + node.offsetHeight - (containerHeight * TALL_BOTTOM_RATIO);
    if (endTop <= startTop) return;

    const progress = Math.max(0, Math.min(1, ((currentTime * 1000) - chunk.startMs) / chunk.durationMs));
    const target = startTop + ((endTop - startTop) * progress);
    const delta = target - container.scrollTop;
    if (Math.abs(delta) < 1) return;
    container.scrollTop += delta * 0.18;
  }, [currentTime, activeBlockIndex, chunks, scrollContainerRef]);

  const registerBlockRef = (index) => (node) => {
    if (!node) {
      blockRefs.current.delete(index);
      return;
    }
    blockRefs.current.set(index, node);
  };

  return {
    activeBlockIndex,
    registerBlockRef,
  };
}

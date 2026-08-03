import { useEffect, useState } from 'react';

// Spotify-green fallback while the cover loads (or if pixel access fails).
const FALLBACK_COLOR = { r: 34, g: 197, b: 94 };
const SAMPLE_SIZE = 24;

const colorCache = new Map();

function extractDominantColor(img) {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  // Saturation-weighted average so near-black/near-white areas of the cover
  // don't wash the tint out to gray.
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = (data[i] + data[i + 1] + data[i + 2]) / 765;
    const isExtreme = luminance > 0.92 || luminance < 0.08;
    const weight = 0.03 + (saturation * (isExtreme ? 0.1 : 1));
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    total += weight;
  }
  if (total === 0) return FALLBACK_COLOR;
  return {
    r: Math.round(r / total),
    g: Math.round(g / total),
    b: Math.round(b / total),
  };
}

export function useDominantColor(imageUrl) {
  const [color, setColor] = useState(() => colorCache.get(imageUrl) || FALLBACK_COLOR);

  useEffect(() => {
    if (!imageUrl) {
      setColor(FALLBACK_COLOR);
      return undefined;
    }
    if (colorCache.has(imageUrl)) {
      setColor(colorCache.get(imageUrl));
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let extracted = FALLBACK_COLOR;
      try {
        extracted = extractDominantColor(img);
      } catch {
        // Canvas readback blocked (CORS) — keep the fallback tint.
      }
      colorCache.set(imageUrl, extracted);
      if (!cancelled) setColor(extracted);
    };
    img.onerror = () => {
      if (!cancelled) setColor(FALLBACK_COLOR);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}

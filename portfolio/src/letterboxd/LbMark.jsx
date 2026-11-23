import React from 'react';

/**
 * Letterboxd's mark: three overlapping dots (orange, green, blue) whose
 * overlaps are white lenses. Geometry measured from the app icon: radius 12,
 * centres 20.4 apart, so the mark is 64.8 x 24. `size` is the height.
 */
export default function LbMark({ size = 24, className = '' }) {
  return (
    <svg
      width={(size * 64.8) / 24}
      height={size}
      viewBox="0 0 64.8 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#ff8000" />
      <circle cx="32.4" cy="12" r="12" fill="#00e054" />
      <circle cx="52.8" cy="12" r="12" fill="#40bcf4" />
      <path d="M22.2 5.679a12 12 0 0 1 0 12.642a12 12 0 0 1 0-12.642z" fill="#fff" />
      <path d="M42.6 5.679a12 12 0 0 1 0 12.642a12 12 0 0 1 0-12.642z" fill="#fff" />
    </svg>
  );
}

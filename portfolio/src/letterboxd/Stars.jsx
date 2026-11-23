import React from 'react';

const STAR_PATH = 'M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z';

function Star({ size, fill, className = '', offClass = 'text-lb-star-off' }) {
  // fill: 0 | 0.5 | 1
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={fill >= 1 ? 24 : fill > 0 ? 12 : 0} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="currentColor" className={offClass} />
      <path d={STAR_PATH} fill="currentColor" className="text-lb-green" clipPath={`url(#${id})`} />
    </svg>
  );
}

/**
 * Read-only Letterboxd stars. `value` is in stars (0–5, halves allowed).
 * Renders nothing for 0 unless `showEmpty`.
 */
export default function Stars({ value = 0, size = 12, showEmpty = false, className = '' }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  if (v === 0 && !showEmpty) return null;
  return (
    <span className={`inline-flex items-center gap-px ${className}`} aria-label={v ? `${v} out of 5 stars` : 'Unrated'}>
      {[0, 1, 2, 3, 4].map((index) => {
        const remaining = v - index;
        const fill = remaining >= 1 ? 1 : remaining >= 0.5 ? 0.5 : 0;
        return <Star key={index} size={size} fill={fill} />;
      })}
    </span>
  );
}

export { Star };

import React, { useState } from 'react';
import { Star } from './Stars';

const LABELS = ['', '½', '★', '★½', '★★', '★★½', '★★★', '★★★½', '★★★★', '★★★★½', '★★★★★'];

/**
 * Interactive half-star rater. `value`/`onChange` are in half-stars (0..10).
 * Hovering previews; clicking sets; clicking the current value clears. The
 * label reads "Rate", then "Rated" once a rating is saved.
 */
export default function RatingInput({ value = 0, onChange, size = 34, disabled = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      className={`flex flex-col items-center ${disabled ? 'opacity-60' : ''}`}
      onMouseLeave={() => setHover(0)}
      role="radiogroup"
      aria-label="Rate"
    >
      <span className="mb-[7px] text-[13px] leading-[18px] text-[#bcd]" aria-live="polite" data-testid="lb-rate-label">
        {value ? 'Rated' : 'Rate'}
      </span>
      <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const remaining = shown - (star - 1) * 2;
        const fill = remaining >= 2 ? 1 : remaining >= 1 ? 0.5 : 0;
        return (
          <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} fill={fill} offClass="text-[#2c3440]" className="transition-transform duration-100" />
            {[1, 2].map((half) => {
              const halfStars = (star - 1) * 2 + half;
              return (
                <button
                  key={half}
                  type="button"
                  disabled={disabled}
                  className="absolute top-0 h-full w-1/2 cursor-pointer"
                  style={{ left: half === 1 ? 0 : '50%' }}
                  aria-label={`Rate ${LABELS[halfStars]}`}
                  aria-pressed={value === halfStars}
                  onMouseEnter={() => setHover(halfStars)}
                  onFocus={() => setHover(halfStars)}
                  onClick={() => onChange?.(value === halfStars ? 0 : halfStars)}
                />
              );
            })}
          </span>
        );
      })}
      </div>
    </div>
  );
}

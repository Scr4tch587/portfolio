import React from 'react';
import { formatCount } from './lbData';

/** Half-star steps (1..10) as Letterboxd writes them: ½, ★, ★½, … ★★★★★. */
const starLabel = (halfStars) => `${'★'.repeat(Math.floor(halfStars / 2))}${halfStars % 2 ? '½' : ''}`;

const STAR_PATH = 'M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z';

/** The chart's fixed axis markers: one star on the left, five on the right. */
function GreenStars({ count }) {
  return (
    <span className="flex shrink-0 text-[#00c030]" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <svg key={index} width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d={STAR_PATH} /></svg>
      ))}
    </span>
  );
}

/** Whole percent, but never "0%" for a bar that has ratings. */
function percentOf(n, total) {
  if (!total || !n) return 0;
  const percent = Math.round((n / total) * 100);
  return percent === 0 ? '<1' : percent;
}

/**
 * Letterboxd's ratings histogram: ten bars (½ .. ★★★★★), the average on the
 * right over five green stars, a single green star on the left, the count
 * in the heading. Sizes are measured from a real Letterboxd film page.
 */
export default function RatingsPanel({ summary, title = 'Ratings' }) {
  const { count, average, histogram } = summary;
  const max = Math.max(1, ...histogram);

  return (
    <section>
      <h2 className="lb-section-heading">
        <span>{title}</span>
        {count > 0 && <span className="text-[13px] font-normal tracking-normal text-lb-muted" data-testid="lb-rating-count">{formatCount(count)}</span>}
      </h2>
      <div className="flex h-[52px] items-end gap-[7px] pt-[8px]">
        <GreenStars count={1} />
        <div className="flex h-full flex-1 items-end gap-px" aria-label="Rating histogram">
          {histogram.map((n, index) => {
            const label = `${formatCount(n)} ${starLabel(index + 1)} ${n === 1 ? 'rating' : 'ratings'} (${percentOf(n, count)}%)`;
            return (
              // The whole column is the hover target, so empty bars are reachable too.
              <div key={index} className="lb-histogram-bar group relative flex h-full flex-1 items-end" aria-label={label}>
                <div
                  className="w-full rounded-t-[2px] bg-[#456] transition-[height] duration-300 group-hover:bg-[#9ab]"
                  style={{ height: n > 0 ? `${Math.max(4, (n / max) * 100)}%` : '1px' }}
                />
                <span className="lb-histogram-tip" role="tooltip">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex h-full w-[50px] flex-col items-center justify-between">
          <span className="lb-average text-[20px] font-light leading-[26px] text-[#789] tabular-nums" data-testid="lb-average">
            {count > 0 ? average.toFixed(1) : ''}
          </span>
          <GreenStars count={5} />
        </div>
      </div>
    </section>
  );
}

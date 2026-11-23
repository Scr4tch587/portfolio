import React from 'react';
import { lbHref } from '../lbRoute';

/** Journal placeholder until there is writing to put here. */
export default function LbJournal() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="text-[32px] font-bold leading-tight text-white">Coming soon</h1>
      <a href={lbHref.home()} className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-lb-text hover:text-white">Back to profile</a>
    </div>
  );
}

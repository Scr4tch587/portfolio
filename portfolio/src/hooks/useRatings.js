import { useEffect, useState } from 'react';
import { MY_RATINGS_EVENT, getMyRating } from '../lib/ratings';

/** This browser's half-star rating (1..10, or 0 when unrated) for a project. */
export function useMyRating(projectId) {
  const [halfStars, setHalfStars] = useState(() => (projectId == null ? 0 : getMyRating(projectId)));

  useEffect(() => {
    const sync = () => setHalfStars(projectId == null ? 0 : getMyRating(projectId));
    sync();
    window.addEventListener(MY_RATINGS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MY_RATINGS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [projectId]);

  return halfStars;
}

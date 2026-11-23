/**
 * The "Favorite films" row on the Letterboxd profile: up to four hand-picked
 * projects, ordered by `favoriteRank` (lower first). Projects that only carry
 * the older `featured` flag still count, after the ranked ones.
 */
import { byPriority } from './discography';

export const MAX_FAVORITE_FILMS = 4;

const hasRank = (project) => Number.isFinite(project?.favoriteRank);

export const favoriteFilmsOf = (projects) => projects
  .filter((project) => hasRank(project) || project?.featured === true)
  .sort((a, b) => (hasRank(a) ? a.favoriteRank : Infinity) - (hasRank(b) ? b.favoriteRank : Infinity) || byPriority(a, b))
  .slice(0, MAX_FAVORITE_FILMS);

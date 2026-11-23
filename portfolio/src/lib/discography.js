/**
 * Discography curation, shared by the site and the admin panel.
 *
 * Every project sits in exactly one type section (Albums, or Singles and
 * EPs); its place there comes from `orderingPriority` (lower first).
 * "Popular releases" is a hand-picked list: a project is in it only when it
 * has a numeric `popularRank` (lower first).
 */
export const SECTION_POPULAR = 'popular';
export const SECTION_ALBUMS = 'albums';
export const SECTION_SINGLES = 'singles';

export const SECTION_LABELS = {
  [SECTION_POPULAR]: 'Popular releases',
  [SECTION_ALBUMS]: 'Albums',
  [SECTION_SINGLES]: 'Singles and EPs',
};

export const byPriority = (a, b) => (a.orderingPriority ?? 999) - (b.orderingPriority ?? 999);

export const isAlbum = (project) => project?.type === 'Album';

const hasPopularRank = (project) => Number.isFinite(project?.popularRank);

export const albumsOf = (projects) => projects.filter(isAlbum).sort(byPriority);
export const singlesAndEpsOf = (projects) => projects.filter((project) => !isAlbum(project)).sort(byPriority);
export const popularReleasesOf = (projects) => projects
  .filter(hasPopularRank)
  .sort((a, b) => a.popularRank - b.popularRank || byPriority(a, b));

export function sectionItems(section, projects) {
  if (section === SECTION_POPULAR) return popularReleasesOf(projects);
  if (section === SECTION_ALBUMS) return albumsOf(projects);
  return singlesAndEpsOf(projects);
}

/**
 * Reordering one type section must not disturb the other: the section's
 * projects keep the same slots in the overall order, refilled in the new
 * sequence. Returns the full list in its new overall order.
 */
export function mergeSectionOrder(allProjects, reorderedSection, inSection) {
  const queue = [...reorderedSection];
  return [...allProjects].sort(byPriority).map((project) => (inSection(project) ? queue.shift() : project));
}

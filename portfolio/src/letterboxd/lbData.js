
/** Static facts about the site owner, the "member" whose profile is home. */
export const KAI = {
  name: 'Kai Zhang',
  handle: 'kaizhang',
  location: 'University of Waterloo',
  website: 'kaizhang.ca',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kai-zhang-waterloo/' },
    { label: 'GitHub', href: 'https://github.com/Scr4tch587' },
    { label: 'Instagram', href: 'https://www.instagram.com/scr4tchman/' },
    { label: 'Substack', href: 'https://kaizhang.substack.com/' },
    { label: 'Devpost', href: 'https://devpost.com/Scr4tch587' },
    { label: 'Email', href: 'mailto:k466zhang@uwaterloo.ca' },
    { label: 'SE Webring', href: 'https://se-webring.xyz/' },
  ],
};

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

export const projectSlug = (project) => slugify(project?.title);

/**
 * Cover art that sits on a flat colour: on its 2:3 poster the colour is
 * carried to the edges instead of the blurred-copy surround. Values are
 * sampled from each image's border. `scale` is the art's width on the poster.
 */
const FLAT_ART_SCALE = '92%';
const DEFAULT_ART_SCALE = '82%';

const POSTER_BACKGROUNDS = {
  shopify: { background: '#ffffff' },
  'super-com': { background: '#fd0099' },
  reeljobs: { background: '#2469ae' },
  tally: { background: '#000000', scale: DEFAULT_ART_SCALE },
  'wat-street': { background: '#000000' },
  wisp: { background: '#000000' },
  rootify: { background: '#1f1d1e' },
  sonify: { background: '#ffffff' },
  'the-daily': { background: '#ffffff' },
  docbot: { background: '#fefefe' },
  waypost: { background: '#262626' },
  'kaizhang-ca': { background: '#1db954' },
  'wat-ai': { background: '#000000' },
  'leetcode-police': { background: '#ffffff' },
  prospector: { background: '#017693' },
  // Quip's art is a top-to-bottom gradient; carry each end outwards.
  quip: { background: 'linear-gradient(#4635a5 0 20%, #868bf2 80% 100%)' },
};

/** `{ background, scale }` for flat-colour cover art, else null. */
export function posterBackground(project) {
  const entry = POSTER_BACKGROUNDS[projectSlug(project)];
  return entry ? { scale: FLAT_ART_SCALE, ...entry } : null;
}

/** Slug first (pretty URLs), then raw id, so old links keep working. */
export function findProjectBySlug(projects, slug) {
  if (!slug) return null;
  return projects.find((project) => projectSlug(project) === slug)
    || projects.find((project) => String(project.id) === slug || String(project.docId) === slug)
    || null;
}

/** Spotify release types become film formats. */
export function filmType(type) {
  switch (String(type || '').toLowerCase()) {
    case 'single': return 'Short';
    case 'ep': return 'Featurette';
    default: return 'Feature';
  }
}

export const formatCount = (n) => (Number(n) || 0).toLocaleString();

export const isReadmeReady = (project) => (
  (project?.processingStatus === 'ready' || project?.processingStatus === 'asset_error')
  && Boolean(project?.processedReadmeRef?.downloadUrl)
);

export const timestampMs = (value) => (value?.toMillis ? value.toMillis() : (value?.seconds ? value.seconds * 1000 : 0));

export const byViews = (a, b) => (b.views || 0) - (a.views || 0);
export const byNewest = (a, b) => (b.year || 0) - (a.year || 0) || (a.orderingPriority ?? 999) - (b.orderingPriority ?? 999);
export const byName = (a, b) => String(a.title).localeCompare(String(b.title));
export const byRecentlyUpdated = (a, b) => timestampMs(b.whatsNewAt) - timestampMs(a.whatsNewAt);

/** Average rating in stars (0 when unrated or below the display threshold). */
export function ratingOf(project) {
  const count = Number(project?.ratingCount) || 0;
  if (count < 3) return 0;
  return Math.round(((Number(project?.ratingSum) || 0) / count / 2) * 2) / 2;
}
export const byRating = (a, b) => ratingOf(b) - ratingOf(a) || byViews(a, b);

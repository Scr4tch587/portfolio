import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Ratings are whole half-stars (1..10; 7 = 3½ stars) and anonymous: this
 * browser keeps a random clientId and its own ratings in localStorage, and
 * the rateProject function keeps the per-project aggregates.
 */
export const MAX_HALF_STARS = 10;

const CLIENT_ID_KEY = 'ratingClientId';
const MY_RATINGS_KEY = 'myRatings';
export const MY_RATINGS_EVENT = 'myRatingsChanged';

let sessionClientId = null;

function newClientId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function getClientId() {
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = newClientId();
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // Private windows / blocked storage: one identity per page load.
    sessionClientId = sessionClientId || newClientId();
    return sessionClientId;
  }
}

function readMyRatings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MY_RATINGS_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

/** This browser's rating for a project in half-stars (0 = unrated). */
export function getMyRating(projectId) {
  return Number(readMyRatings()[String(projectId)]) || 0;
}

function storeMyRating(projectId, halfStars) {
  const ratings = readMyRatings();
  if (halfStars > 0) ratings[String(projectId)] = halfStars;
  else delete ratings[String(projectId)];
  try {
    window.localStorage.setItem(MY_RATINGS_KEY, JSON.stringify(ratings));
  } catch {
    // The server still has the vote; only the local highlight is lost.
  }
  window.dispatchEvent(new Event(MY_RATINGS_EVENT));
}

/** Rate a project (halfStars 1..10) or clear the rating (0). Optimistic. */
export async function rateProject(projectId, halfStars) {
  const value = Math.round(Number(halfStars)) || 0;
  if (!(value >= 0 && value <= MAX_HALF_STARS)) throw new Error('Rating must be between ½ and 5 stars.');
  const previous = getMyRating(projectId);
  storeMyRating(projectId, value);
  try {
    await httpsCallable(functions, 'rateProject')({
      projectId: String(projectId),
      clientId: getClientId(),
      halfStars: value,
    });
  } catch (error) {
    storeMyRating(projectId, previous);
    throw error;
  }
}

/** Histogram buckets h1..h10 on the project doc -> array of 10 counts. */
export function histogramOf(project) {
  const hist = project?.ratingHist || {};
  return Array.from({ length: MAX_HALF_STARS }, (_, index) => Math.max(0, Number(hist[`h${index + 1}`]) || 0));
}

export function ratingSummary(project) {
  const count = Math.max(0, Number(project?.ratingCount) || 0);
  const sum = Number(project?.ratingSum) || 0; // in half-stars
  const average = count > 0 ? sum / count / 2 : 0;
  return { count, average, histogram: histogramOf(project) };
}

/** Combine several projects' histograms (e.g. for the home page panel). */
export function combinedRatingSummary(projects) {
  const histogram = Array.from({ length: MAX_HALF_STARS }, () => 0);
  let count = 0;
  let sum = 0;
  (projects || []).forEach((project) => {
    const summary = ratingSummary(project);
    count += summary.count;
    sum += (Number(project?.ratingSum) || 0);
    summary.histogram.forEach((n, index) => {
      histogram[index] += n;
    });
  });
  return { count, average: count > 0 ? sum / count / 2 : 0, histogram };
}

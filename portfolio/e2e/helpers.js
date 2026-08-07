import { expect } from '@playwright/test';

const FIREBASE_PROJECT_ID = 'portfolio-d996c';

/**
 * Read the public `projects` collection straight from Firestore REST so tests
 * can assert against the same live data the app renders.
 */
export async function fetchProjects(request) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/projects?pageSize=300`;
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const docs = body.documents || [];
  return docs.map((docEntry) => {
    const id = docEntry.name.split('/').pop();
    const fields = docEntry.fields || {};
    return { docId: id, ...decodeFields(fields) };
  });
}

function decodeValue(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

/** Sorted the same way Home.jsx sorts the discography/popular lists. */
export function sortByPriority(projects) {
  return [...projects]
    .filter((p) => p.title)
    .sort((a, b) => (a.orderingPriority || 999) - (b.orderingPriority || 999));
}

export function popularOf(projects) {
  return [...projects]
    .filter((p) => (p.views || 0) > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0));
}

/** Rows of the Popular track list (grid layout with the numbered column). */
export function popularRows(page) {
  return page.locator('[class*="grid-cols-[16px"]');
}

/**
 * Load the home page and wait for the loading overlay to clear and Firestore
 * data to arrive (the Popular section only renders with data).
 */
export async function gotoHome(page) {
  await page.goto('/');
  // The loading screen renders content behind an opaque overlay for up to 8s
  // while images preload; opacity does not affect Playwright visibility, so
  // wait for the overlay to be removed from the DOM before interacting.
  await expect(page.locator('div.z-\\[9999\\]')).toHaveCount(0, { timeout: 25_000 });
  await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Popular' })).toBeVisible({ timeout: 20_000 });
  // Wait for at least one popular row so project-dependent tests never race
  // the Firestore snapshot.
  await expect(popularRows(page).first()).toBeVisible({ timeout: 20_000 });
}

/** The player bar (fixed bottom bar) — present once a project is auto-selected. */
export function playerBar(page) {
  return page.locator('div.h-\\[72px\\].bg-black.fixed');
}

/**
 * Sign in as the admin. The dev page is Google-only (popups can't be
 * automated), so tests sign in as the dedicated admin-claim email/password
 * account through the app's DEV-only sign-in hook.
 */
export async function loginAsAdmin(page) {
  const { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } = await import('./adminRest.js');
  await page.goto('/dev');
  await page.waitForFunction(() => typeof window.__testSignInWithEmailPassword === 'function');
  await page.evaluate(
    ([email, password]) => window.__testSignInWithEmailPassword(email, password),
    [E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD],
  );
  await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 30_000 });
}

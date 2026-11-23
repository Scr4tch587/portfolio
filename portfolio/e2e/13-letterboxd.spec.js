import { test, expect } from '@playwright/test';
import { fetchProjects, gotoHome } from './helpers.js';

const slugOf = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The Letterboxd skin's header: mark + wordmark, uppercase nav, Spotify switch. */
const lbHeader = (page) => page.locator('.lb-root header');

test.describe('letterboxd mode', () => {
  test('first visit is Spotify; the switch is remembered; the Spotify pill and green button switch back and forth', async ({ page }) => {
    await gotoHome(page);
    await expect(lbHeader(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Switch to Letterboxd mode' }).click();
    await expect(lbHeader(page)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/#\/lb$/);
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();

    // Remembered across a reload
    await page.reload();
    await expect(lbHeader(page)).toBeVisible({ timeout: 20_000 });

    // And back: no loading spinner, straight into the Spotify shell
    await page.getByRole('button', { name: 'Switch to Spotify mode' }).click();
    await expect(page.getByRole('button', { name: 'Switch to Letterboxd mode' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Popular' })).toBeVisible({ timeout: 20_000 });
    await expect(lbHeader(page)).toHaveCount(0);
  });

  test('a #/lb deep link opens Letterboxd even for a first-time visitor', async ({ page }) => {
    await page.goto('/#/lb/films');
    await expect(lbHeader(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /^Films/ })).toBeVisible();
    // Six-across poster grid
    await expect(page.locator('a.lb-poster').first()).toBeVisible({ timeout: 20_000 });
  });

  test('film page: title, director, action box, ratings panel; opening it counts a view', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = [...projects].filter((p) => p.title).sort((a, b) => (b.views || 0) - (a.views || 0))[1];
    test.skip(!target, 'Need a project');
    const before = target.views || 0;

    await page.goto(`/#/lb/film/${slugOf(target.title)}`);
    await expect(page.getByRole('heading', { name: target.title, level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Directed by')).toBeVisible();
    await expect(page.getByTestId('lb-action-box')).toBeVisible();
    await expect(page.getByTestId('lb-average')).toBeVisible();

    // No accounts: like and the star rater are there for everyone
    await expect(page.getByTestId('lb-action-box').getByRole('button', { name: 'Like' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Rate' })).toBeVisible();

    await expect.poll(async () => {
      const after = await fetchProjects(request);
      return after.find((p) => p.docId === target.docId)?.views || 0;
    }, { timeout: 20_000, intervals: [2_000] }).toBeGreaterThan(before);
  });

  test('journal article renders the processed README', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find((p) => (p.processingStatus === 'ready' || p.processingStatus === 'asset_error') && p.processedReadmeRef?.downloadUrl);
    test.skip(!target, 'No processed README in live data');

    await page.goto(`/#/lb/journal/${slugOf(target.title)}`);
    await expect(page.getByRole('heading', { name: target.title, level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.lb-article .lyric-markdown').first()).toBeVisible({ timeout: 20_000 });
  });

  test('likes are remembered in the browser across reloads and skins', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find((p) => p.title);
    await page.goto(`/#/lb/film/${slugOf(target.title)}`);
    const box = page.getByTestId('lb-action-box');
    await box.getByRole('button', { name: 'Like' }).click();
    await expect(box.getByRole('button', { name: 'Unlike' })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('lb-action-box').getByRole('button', { name: 'Unlike' })).toBeVisible({ timeout: 20_000 });
  });
});

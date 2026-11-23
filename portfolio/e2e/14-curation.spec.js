import { test, expect } from '@playwright/test';
import { fetchProjects, gotoHome, loginAsAdmin, sortByPriority } from './helpers.js';
import { setProjectField } from './adminRest.js';

/**
 * The dev window's "Discography order" panel drives what the Spotify
 * discography shows. This edits live ordering data, so everything it
 * touches is snapshotted first and put back afterwards.
 */
test.describe('discography curation', () => {
  test('reorder a type section and curate Popular releases from the dev window', async ({ page, request }) => {
    test.setTimeout(180_000);
    const before = await fetchProjects(request);
    const sorted = sortByPriority(before);
    const albums = sorted.filter((p) => p.type === 'Album');
    const others = sorted.filter((p) => p.type !== 'Album');
    test.skip(albums.length < 2 || others.length < 1, 'Need two albums and one single/EP');

    const live = async () => sortByPriority(await fetchProjects(request));
    const candidate = sorted.find((p) => !Number.isFinite(p.popularRank));

    try {
      await loginAsAdmin(page);
      await expect(page.getByRole('heading', { name: 'Discography order' })).toBeVisible();

      // ---- Albums: move the second album to the top ----
      await page.getByRole('button', { name: `Move ${albums[1].title} up in Albums` }).click();
      await expect.poll(async () => (await live()).filter((p) => p.type === 'Album')[0]?.title, { timeout: 20_000 })
        .toBe(albums[1].title);
      // The other section's order is untouched.
      expect((await live()).filter((p) => p.type !== 'Album').map((p) => p.docId)).toEqual(others.map((p) => p.docId));

      // ---- Popular releases: add a project, see it on the site, remove it ----
      if (candidate) {
        await page.getByLabel('Add a project to Popular releases').selectOption(candidate.docId);
        await expect.poll(async () => Number.isFinite((await live()).find((p) => p.docId === candidate.docId)?.popularRank), { timeout: 20_000 })
          .toBe(true);

        await gotoHome(page);
        await page.getByRole('button', { name: 'Albums', exact: true }).click();
        await expect(page.locator('.w-\\[212px\\]').first().getByRole('heading', { level: 3 })).toHaveText(albums[1].title);
        await page.getByRole('button', { name: 'Popular releases', exact: true }).click();
        await expect(page.locator('.w-\\[212px\\]').getByRole('heading', { name: candidate.title, level: 3 })).toBeVisible();

        await page.goto('/dev/admin');
        await page.getByRole('button', { name: `Remove ${candidate.title} from Popular releases` }).click();
        await expect.poll(async () => Number.isFinite((await live()).find((p) => p.docId === candidate.docId)?.popularRank), { timeout: 20_000 })
          .toBe(false);
      }
    } finally {
      // Put every ordering field back exactly as it was.
      const after = await fetchProjects(request);
      for (const original of before) {
        const current = after.find((p) => p.docId === original.docId);
        if (!current) continue;
        if (current.orderingPriority !== original.orderingPriority && Number.isFinite(original.orderingPriority)) {
          await setProjectField(request, original.docId, 'orderingPriority', original.orderingPriority);
        }
        const originalRank = Number.isFinite(original.popularRank) ? original.popularRank : null;
        const currentRank = Number.isFinite(current.popularRank) ? current.popularRank : null;
        if (currentRank !== originalRank) {
          await setProjectField(request, original.docId, 'popularRank', originalRank);
        }
      }
    }
  });
});

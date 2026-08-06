import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, popularRows } from './helpers.js';

test.describe('stream counting', () => {
  test('5s of continuous playback confirms a stream: toast and server count', async ({ page, request }) => {
    await gotoHome(page);

    const rows = popularRows(page);
    const firstRow = rows.first();
    const rowTitle = (await firstRow.locator('span.font-normal.text-base').textContent()).trim();

    const before = await fetchProjects(request);
    const targetBefore = before.find((p) => p.title === rowTitle);
    expect(targetBefore).toBeTruthy();

    await firstRow.click(); // starts playback

    // Toast appears once the 5s continuous threshold passes
    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 12_000 });

    // Server-side views increment lands back via onSnapshot; poll Firestore
    await expect.poll(async () => {
      const after = await fetchProjects(request);
      const target = after.find((p) => p.docId === targetBefore.docId);
      return target?.views || 0;
    }, { timeout: 20_000, intervals: [2_000] }).toBeGreaterThan(targetBefore.views || 0);

    // Toast auto-dismisses
    await expect(page.getByText('Project streamed!')).toBeHidden({ timeout: 5_000 });
  });

  test('a second playthrough of the same project does not double-arm within one play', async ({ page }) => {
    await gotoHome(page);
    const rows = popularRows(page);
    await rows.first().click();

    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText('Project streamed!')).toBeHidden({ timeout: 5_000 });

    // Keep playing: no second toast during the same playthrough
    await page.waitForTimeout(6_000);
    await expect(page.getByText('Project streamed!')).toBeHidden();
  });
});

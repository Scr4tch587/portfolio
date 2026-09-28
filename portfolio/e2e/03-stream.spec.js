import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, popularRows } from './helpers.js';

const rowTitle = async (row) => (await row.locator('span.font-normal.text-base').textContent()).trim();

// registerStream throttles repeat hits on the same project from one IP for
// 4s. Tests that assert the server count may target a project the previous
// test just streamed, so let that window lapse first.
const waitOutThrottle = (page) => page.waitForTimeout(4_500);

test.describe('stream counting', () => {
  test('playing a project streams it immediately: toast and server count', async ({ page, request }) => {
    await gotoHome(page);

    const firstRow = popularRows(page).first();
    const title = await rowTitle(firstRow);

    const before = await fetchProjects(request);
    const targetBefore = before.find((p) => p.title === title);
    expect(targetBefore).toBeTruthy();

    await waitOutThrottle(page);
    await firstRow.click(); // starts playback

    // Toast appears right away — no playback threshold
    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 3_000 });

    // Server-side views increment lands back via onSnapshot; poll Firestore
    await expect.poll(async () => {
      const after = await fetchProjects(request);
      const target = after.find((p) => p.docId === targetBefore.docId);
      return target?.views || 0;
    }, { timeout: 20_000, intervals: [2_000] }).toBeGreaterThan(targetBefore.views || 0);

    // Toast auto-dismisses
    await expect(page.getByText('Project streamed!')).toBeHidden({ timeout: 5_000 });
  });

  test('the auto-selected project streams only once the visitor presses play', async ({ page }) => {
    await gotoHome(page);
    await page.waitForTimeout(1_000);
    await expect(page.getByText('Project streamed!')).toBeHidden();

    await page.keyboard.press('Space');
    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Project streamed!')).toBeHidden({ timeout: 5_000 });

    // Pause + resume of that same project is not another stream
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.waitForTimeout(800);
    await expect(page.getByText('Project streamed!')).toBeHidden();
  });

  test('pausing and resuming does not stream again', async ({ page }) => {
    await gotoHome(page);
    const firstRow = popularRows(page).first();
    await firstRow.click();
    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Project streamed!')).toBeHidden({ timeout: 5_000 });

    // Lyrics-ready projects switch the main view; get the rows back.
    if (await page.getByRole('heading', { name: 'Kai Zhang', level: 1 }).isHidden()) {
      await page.getByRole('button', { name: 'Toggle lyrics view' }).click();
    }
    await firstRow.click(); // pause
    await firstRow.click(); // resume
    await page.waitForTimeout(800);
    await expect(page.getByText('Project streamed!')).toBeHidden();

    // Looping playback never re-streams either: nothing to wait on, the clock
    // is cosmetic, so just confirm no toast shows up over a few seconds.
    await page.waitForTimeout(3_000);
    await expect(page.getByText('Project streamed!')).toBeHidden();
  });

  test('clicking several projects in quick succession streams each one', async ({ page, request }) => {
    await gotoHome(page);
    const rows = popularRows(page);
    const before = await fetchProjects(request);
    test.skip(before.filter((p) => p.title).length < 2, 'Need at least two projects');

    // Row click, then the player bar's Next button (which walks the full
    // catalog): two plays back to back, each one streams.
    const firstTitle = await rowTitle(rows.first());
    await waitOutThrottle(page);
    await rows.first().click();
    await page.getByRole('button', { name: 'Next project' }).click();
    await expect(page.getByText('Project streamed!')).toBeVisible({ timeout: 3_000 });

    const barTitle = page.locator('div.h-\\[72px\\].bg-black.fixed span.font-medium.text-sm');
    await expect(barTitle).not.toHaveText(firstTitle);
    const secondTitle = (await barTitle.textContent()).trim();

    const targets = [firstTitle, secondTitle].map((t) => before.find((p) => p.title === t));
    targets.forEach((t) => expect(t).toBeTruthy());

    await expect.poll(async () => {
      const after = await fetchProjects(request);
      return targets.every((t) => {
        const fresh = after.find((p) => p.docId === t.docId);
        return (fresh?.views || 0) > (t.views || 0);
      });
    }, { timeout: 20_000, intervals: [2_000] }).toBe(true);
  });
});

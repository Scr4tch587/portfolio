import { test, expect } from '@playwright/test';
import { gotoHome, playerBar, popularRows } from './helpers.js';

test.describe('player bar', () => {
  test('auto-selects a project on load, paused', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    await expect(bar).toBeVisible();
    // Paused: the main control shows Play (aria on the sibling buttons)
    await expect(bar.getByRole('button', { name: 'Previous project' })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Next project' })).toBeVisible();
    await expect(bar.getByText('0:00').first()).toBeVisible();
  });

  test('play/pause toggles and time advances', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    // The white circular button is the play/pause control
    const playPause = bar.locator('button.bg-white.rounded-full');
    await playPause.click();
    // Time should advance past 0:01
    await expect(bar.locator('span.tabular-nums').first()).not.toHaveText('0:00', { timeout: 5_000 });
    await playPause.click();
    const frozen = await bar.locator('span.tabular-nums').first().textContent();
    await page.waitForTimeout(1_200);
    await expect(bar.locator('span.tabular-nums').first()).toHaveText(frozen);
  });

  test('next/previous change the current project', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    const title = bar.locator('span.font-medium.text-sm');
    const initial = await title.textContent();

    await bar.getByRole('button', { name: 'Next project' }).click();
    await expect(title).not.toHaveText(initial);
    const second = await title.textContent();

    await bar.getByRole('button', { name: 'Previous project' }).click();
    await expect(title).not.toHaveText(second);
  });

  test('shuffle toggles on and off', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    const shuffleOn = bar.getByRole('button', { name: 'Enable shuffle' });
    await shuffleOn.click();
    await expect(bar.getByRole('button', { name: 'Disable shuffle' })).toBeVisible();
    await bar.getByRole('button', { name: 'Disable shuffle' }).click();
    await expect(bar.getByRole('button', { name: 'Enable shuffle' })).toBeVisible();
  });

  test('seek moves the progress position', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    await bar.locator('button.bg-white.rounded-full').click(); // start playback

    const seekBar = bar.getByRole('button', { name: 'Seek playback' });
    const box = await seekBar.boundingBox();
    await seekBar.click({ position: { x: box.width * 0.5, y: box.height / 2 } });

    // Elapsed time should jump well past a couple of seconds
    const elapsedText = await bar.locator('span.tabular-nums').first().textContent();
    const [mins, secs] = elapsedText.split(':').map(Number);
    const totalText = await bar.locator('span.tabular-nums').nth(1).textContent();
    const [tMins, tSecs] = totalText.split(':').map(Number);
    const elapsed = mins * 60 + secs;
    const total = tMins * 60 + tSecs;
    expect(elapsed).toBeGreaterThan(total * 0.3);
    expect(elapsed).toBeLessThan(total * 0.7);
  });

  test('spacebar toggles playback', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    await page.keyboard.press('Space');
    await expect(bar.locator('span.tabular-nums').first()).not.toHaveText('0:00', { timeout: 5_000 });
    await page.keyboard.press('Space');
    const frozen = await bar.locator('span.tabular-nums').first().textContent();
    await page.waitForTimeout(1_100);
    await expect(bar.locator('span.tabular-nums').first()).toHaveText(frozen);
  });

  test('clicking a popular row plays it and shows it in the player bar', async ({ page }) => {
    await gotoHome(page);
    const rows = popularRows(page);
    const firstRow = rows.first();
    const rowTitle = await firstRow.locator('span.font-normal.text-base').textContent();

    await firstRow.click();
    const bar = playerBar(page);
    await expect(bar.locator('span.font-medium.text-sm')).toHaveText(rowTitle);

    // Lyrics-ready projects switch the main view to lyrics (hero disappears,
    // even while the lyrics payload is still loading); return home so the
    // popular list is visible again for the equalizer assertions.
    await page.waitForTimeout(500);
    const heroHidden = await page.getByRole('heading', { name: 'Kai Zhang', level: 1 }).isHidden();
    if (heroHidden) {
      await page.getByRole('button', { name: 'Toggle lyrics view' }).click();
      await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();
    }

    // Row goes green + shows equalizer gif while playing
    await expect(firstRow.locator('img[alt="playing"]')).toBeVisible();
    // Clicking again pauses
    await firstRow.click();
    await expect(firstRow.locator('img[alt="playing"]')).toBeHidden();
  });
});

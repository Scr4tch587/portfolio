import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, playerBar } from './helpers.js';

function lyricsReady(project) {
  return (
    (project.processingStatus === 'ready' || project.processingStatus === 'asset_error')
    && project.lyricsEnabled !== false
    && Number(project.generatedDurationSec) > 0
  );
}

test.describe('lyrics view', () => {
  test('playing a processed project switches to lyrics view', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find(lyricsReady);
    test.skip(!target, 'No lyrics-ready project in live data');

    await gotoHome(page);

    // Find and play it via search (works regardless of which section shows it)
    await page.getByPlaceholder('What do you want to play?').fill(target.title);
    const overlay = page.locator('.search-overlay-enter');
    await overlay.getByText(target.title).first().click();

    // Lyrics view appears
    await expect(page.getByText('Streaming from GitHub commit')).toBeVisible({ timeout: 20_000 });
    // Markdown chunks render
    await expect(page.locator('.lyric-markdown').first()).toBeVisible({ timeout: 20_000 });

    // Duration in the player bar reflects generatedDurationSec
    const total = Math.round(Number(target.generatedDurationSec));
    const expected = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    await expect(playerBar(page).locator('span.tabular-nums').nth(1)).toHaveText(expected);
  });

  test('mic button toggles between lyrics and home view', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find(lyricsReady);
    test.skip(!target, 'No lyrics-ready project in live data');

    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill(target.title);
    await page.locator('.search-overlay-enter').getByText(target.title).first().click();
    await expect(page.getByText('Streaming from GitHub commit')).toBeVisible({ timeout: 20_000 });

    const micButton = page.getByRole('button', { name: 'Toggle lyrics view' });
    await micButton.click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();
    await micButton.click();
    await expect(page.getByText('Streaming from GitHub commit')).toBeVisible();
  });

  test('active lyrics block advances with playback', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find(lyricsReady);
    test.skip(!target, 'No lyrics-ready project in live data');

    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill(target.title);
    await page.locator('.search-overlay-enter').getByText(target.title).first().click();
    await expect(page.locator('.lyric-markdown').first()).toBeVisible({ timeout: 20_000 });

    // Seek to ~40% so several blocks are past
    const bar = playerBar(page);
    const seekBar = bar.getByRole('button', { name: 'Seek playback' });
    const box = await seekBar.boundingBox();
    await seekBar.click({ position: { x: box.width * 0.4, y: box.height / 2 } });
    await page.waitForTimeout(1_000);

    // Some blocks should now be marked past (text-white/25 or opacity-25)
    const pastBlocks = page.locator('section.text-white\\/25, section.opacity-25');
    await expect(pastBlocks.first()).toBeVisible({ timeout: 10_000 });
  });

  test('lyrics-ready project commit link points at GitHub', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const target = projects.find((p) => lyricsReady(p) && p.github && p.processedReadmeRef?.commitSha);
    test.skip(!target, 'No lyrics-ready project with commit sha');

    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill(target.title);
    await page.locator('.search-overlay-enter').getByText(target.title).first().click();

    const sha = target.processedReadmeRef.commitSha.slice(0, 7);
    const link = page.getByRole('link', { name: sha });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await expect(link).toHaveAttribute('href', new RegExp(`${target.processedReadmeRef.commitSha}`));
  });
});

import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, sortByPriority, popularOf, playerBar, popularRows } from './helpers.js';

test.describe('smoke / structure', () => {
  test('home renders hero, action bar, popular, discography, about', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await gotoHome(page);

    await expect(page.getByText('University of Waterloo')).toBeVisible();
    await expect(page.getByText("Software Engineering '30")).toBeVisible();

    // Action bar
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SE Webring' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
    await expect(page.getByText('Liked Songs').first()).toBeVisible();
    await expect(page.getByText('Artist Pick')).toBeVisible();

    // Sections
    await expect(page.getByRole('heading', { name: 'Popular' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discography' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    await expect(page.getByText('monthly visitors')).toBeVisible();

    // Player bar appears with an auto-selected project, paused
    await expect(playerBar(page)).toBeVisible();

    const filtered = consoleErrors.filter((message) => (
      // Firestore long-polling noise in dev is not an app bug
      !message.includes('net::ERR')
      && !message.includes('favicon')
    ));
    expect(filtered, `Console errors: ${filtered.join('\n')}`).toEqual([]);
  });

  test('popular list matches Firestore views ordering', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const expectedTop5 = popularOf(sortByPriority(projects)).slice(0, 5).map((p) => p.title);

    await gotoHome(page);

    const rows = popularRows(page);
    await expect(rows).toHaveCount(Math.min(5, expectedTop5.length));
    for (let i = 0; i < Math.min(5, expectedTop5.length); i += 1) {
      await expect(rows.nth(i)).toContainText(expectedTop5[i]);
    }
  });

  test('see more expands popular list to 10, see less collapses', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    const popularCount = popularOf(projects).length;

    await gotoHome(page);
    const rows = popularRows(page);

    await page.getByText('See more', { exact: true }).click();
    await expect(rows).toHaveCount(Math.min(10, popularCount));
    await page.getByText('See less', { exact: true }).click();
    await expect(rows).toHaveCount(Math.min(5, popularCount));
  });

  test('unknown route falls through to the app shell', async ({ page }) => {
    await page.goto('/some/unknown/path');
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  test('mobile user agent gets the unsupported page', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Desktop Only (For Now)' })).toBeVisible();
    await context.close();
  });
});

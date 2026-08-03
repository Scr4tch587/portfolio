import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, sortByPriority, playerBar } from './helpers.js';

test.describe('search', () => {
  test('typing shows matching results; selecting plays the project', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));
    const target = projects[0];

    await gotoHome(page);
    const input = page.getByPlaceholder('What do you want to play?');
    await input.fill(target.title);

    const overlay = page.locator('.search-overlay-enter');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText(target.title).first()).toBeVisible();

    await overlay.getByText(target.title).first().click();
    await expect(playerBar(page).locator('span.font-medium.text-sm')).toHaveText(target.title);
    // Search box clears after selection
    await expect(input).toHaveValue('');
  });

  test('gibberish query shows no results', async ({ page }) => {
    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill('zzqxjv nonexistent');
    await expect(page.getByText('No results found')).toBeVisible();
  });

  test('escape closes the results overlay', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));
    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill(projects[0].title);
    await expect(page.locator('.search-overlay-enter')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.search-overlay-enter')).toBeHidden();
  });

  test('synonym expansion finds tagged projects', async ({ page, request }) => {
    const projects = await fetchProjects(request);
    // Find a project tagged with react/frontend-family tags to exercise synonyms
    const target = projects.find((p) => (p.tags || []).some((t) => /react|frontend|web|ui/i.test(t)));
    test.skip(!target, 'No frontend-tagged project in live data');

    await gotoHome(page);
    await page.getByPlaceholder('What do you want to play?').fill('frontend');
    const overlay = page.locator('.search-overlay-enter');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('button').first()).toBeVisible();
  });
});

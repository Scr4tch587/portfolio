import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, sortByPriority, playerBar } from './helpers.js';

test.describe('discography', () => {
  test('filter tabs switch between albums, singles and EPs', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));
    const albums = projects.filter((p) => p.type === 'Album');
    const singles = projects.filter((p) => p.type === 'Single');

    await gotoHome(page);
    // Default tab: albums
    if (albums.length > 0) {
      await expect(page.getByRole('heading', { name: albums[0].title, level: 3 })).toBeVisible();
    }
    if (singles.length > 0) {
      await page.getByRole('button', { name: 'Singles', exact: true }).first().click();
      await expect(page.getByRole('heading', { name: singles[0].title, level: 3 })).toBeVisible();
    }
    await page.getByRole('button', { name: 'EPs', exact: true }).first().click();
    await page.getByRole('button', { name: 'Albums', exact: true }).first().click();
    if (albums.length > 0) {
      await expect(page.getByRole('heading', { name: albums[0].title, level: 3 })).toBeVisible();
    }
  });

  test('show all opens the full discography view with working filter dropdown', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));

    await gotoHome(page);
    await page.getByRole('button', { name: 'Show all' }).click();

    // Full view: hero hidden, all items in a wrap grid
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Discography' })).toBeVisible();

    // Dropdown starts on the tab that was active (Albums by default)
    const dropdownButton = page.locator('.relative > button', { hasText: /^(All|Albums|Singles|EPs)$/ }).first();
    await dropdownButton.click();
    await page.getByRole('button', { name: 'All', exact: true }).click();

    // Every titled project shows as a card
    for (const project of projects.slice(0, 6)) {
      await expect(page.getByRole('heading', { name: project.title, level: 3 }).first()).toBeVisible();
    }

    // Escape returns to the normal home view
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();
  });

  test('back arrow leaves the show-all view', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeHidden();
    // The circular back button (ArrowLeft icon) sits left of the heading
    await page.locator('button.w-8.h-8.rounded-full').first().click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();
  });

  test('clicking a discography card plays that project', async ({ page }) => {
    await gotoHome(page);
    const card = page.locator('.w-\\[170px\\]').first();
    const cardTitle = (await card.getByRole('heading', { level: 3 }).textContent()).trim();
    await card.click();
    await expect(playerBar(page).locator('span.font-medium.text-sm')).toHaveText(cardTitle);
  });

  test('top bar explore button opens show-all view', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Open all discography' }).click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Discography' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('left sidebar library button opens show-all view', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Library' }).click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeHidden();
    // Sidebar logo returns home
    await page.getByRole('button', { name: 'Go to home' }).click();
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeVisible();
  });
});

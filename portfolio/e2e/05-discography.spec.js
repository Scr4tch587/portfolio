import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, sortByPriority, playerBar } from './helpers.js';

test.describe('discography', () => {
  test('tabs: popular releases (curated), albums, singles and EPs, each in its curated order', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));
    const albums = projects.filter((p) => p.type === 'Album');
    const singlesAndEps = projects.filter((p) => p.type !== 'Album');
    const popular = projects
      .filter((p) => Number.isFinite(p.popularRank))
      .sort((a, b) => a.popularRank - b.popularRank);
    const firstCard = page.locator('.w-\\[212px\\]').first().getByRole('heading', { level: 3 });
    const tab = (name) => page.getByRole('button', { name, exact: true });

    await gotoHome(page);
    // Popular releases only exists (and is the default tab) once curated.
    if (popular.length > 0) {
      await expect(tab('Popular releases')).toBeVisible();
      await expect(firstCard).toHaveText(popular[0].title);
    } else {
      await expect(tab('Popular releases')).toHaveCount(0);
    }
    if (singlesAndEps.length > 0) {
      await tab('Singles and EPs').click();
      await expect(firstCard).toHaveText(singlesAndEps[0].title);
    }
    if (albums.length > 0) {
      await tab('Albums').click();
      await expect(firstCard).toHaveText(albums[0].title);
    }
  });

  test('show all opens the full discography view with working filter dropdown', async ({ page, request }) => {
    const projects = sortByPriority(await fetchProjects(request));

    await gotoHome(page);
    await page.getByRole('button', { name: 'Show all' }).click();

    // Full view: hero hidden, all items in a wrap grid
    await expect(page.getByRole('heading', { name: 'Kai Zhang', level: 1 })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Discography' })).toBeVisible();

    // Dropdown starts on the active tab's filter (All for Popular releases)
    const dropdownButton = page.locator('.relative > button', { hasText: /^(All|Albums|Singles and EPs)$/ }).first();
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
    const card = page.locator('.w-\\[212px\\]').first();
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
});

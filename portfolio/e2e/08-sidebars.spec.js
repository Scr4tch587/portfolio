import { test, expect } from '@playwright/test';
import { gotoHome, fetchProjects, playerBar, popularRows } from './helpers.js';

test.describe('sidebars', () => {
  test('right sidebar shows current project details with credits links', async ({ page, request }) => {
    const projects = await fetchProjects(request);

    await gotoHome(page);
    await page.getByRole('button', { name: 'Expand now playing view' }).click();

    const sidebar = page.locator('div.hidden.lg\\:flex.w-80');
    await expect(sidebar).toBeVisible();

    const bar = playerBar(page);
    const currentTitle = (await bar.locator('span.font-medium.text-sm').textContent()).trim();
    const project = projects.find((p) => p.title === currentTitle);
    expect(project).toBeTruthy();

    // Title appears in header and body
    await expect(sidebar.getByText(currentTitle).first()).toBeVisible();
    await expect(sidebar.getByText('Kai Zhang').first()).toBeVisible();
    await expect(sidebar.getByRole('heading', { name: 'Credits' })).toBeVisible();

    if (project.github) {
      await expect(sidebar.getByRole('link', { name: 'Github' })).toHaveAttribute('href', project.github);
    }
    if (project.website) {
      await expect(sidebar.getByRole('link', { name: /Website|Devpost/ })).toHaveAttribute('href', project.website);
    }
    await expect(sidebar.getByText('Year')).toBeVisible();

    // Tags render
    for (const tag of (project.tags || []).slice(0, 3)) {
      await expect(sidebar.getByText(tag, { exact: true })).toBeVisible();
    }

    // Close via X
    await page.getByRole('button', { name: 'Close details' }).click();
    await expect(sidebar).toBeHidden();
    // Chevron reappears
    await expect(page.getByRole('button', { name: 'Expand now playing view' })).toBeVisible();
  });

  test('sidebar content switches when the track changes', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Expand now playing view' }).click();
    const sidebar = page.locator('div.hidden.lg\\:flex.w-80');
    const bar = playerBar(page);

    await bar.getByRole('button', { name: 'Next project' }).click();
    const newTitle = (await bar.locator('span.font-medium.text-sm').textContent()).trim();
    await expect(sidebar.getByText(newTitle).first()).toBeVisible();
  });

  test('playing a project opens the right sidebar automatically', async ({ page }) => {
    await gotoHome(page);
    const sidebar = page.locator('div.hidden.lg\\:flex.w-80');
    await expect(sidebar).toBeHidden();

    const rows = popularRows(page);
    await rows.first().click();
    await expect(sidebar).toBeVisible();
  });

  test('left sidebar records recently played and replays from it', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);

    // Play two different projects via next
    const title1 = (await bar.locator('span.font-medium.text-sm').textContent()).trim();
    await bar.getByRole('button', { name: 'Next project' }).click();
    const title2 = (await bar.locator('span.font-medium.text-sm').textContent()).trim();

    const aside = page.locator('aside');
    // Both recents exist as buttons (aria-label = title)
    await expect(aside.getByRole('button', { name: title1 })).toBeVisible();
    await expect(aside.getByRole('button', { name: title2 })).toBeVisible();

    // Click the older recent to play it again
    await aside.getByRole('button', { name: title1 }).click();
    await expect(bar.locator('span.font-medium.text-sm')).toHaveText(title1);
  });
});

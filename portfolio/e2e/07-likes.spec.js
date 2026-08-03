import { test, expect } from '@playwright/test';
import { gotoHome, playerBar, popularRows } from './helpers.js';

test.describe('likes', () => {
  test('like from player bar updates liked count and sidebar badge', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);

    await expect(page.getByText("You've liked 0 projects")).toBeVisible();

    await bar.getByRole('button', { name: 'Like', exact: true }).click();
    await expect(page.getByText("You've liked 1 projects")).toBeVisible();
    // Sidebar heart badge shows 1
    await expect(page.locator('aside').getByRole('button', { name: 'Open liked songs' }).locator('span')).toHaveText('1');

    await bar.getByRole('button', { name: 'Unlike', exact: true }).click();
    await expect(page.getByText("You've liked 0 projects")).toBeVisible();
  });

  test('liked songs modal lists liked projects and plays from it', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    const currentTitle = (await bar.locator('span.font-medium.text-sm').textContent()).trim();

    await bar.getByRole('button', { name: 'Like', exact: true }).click();

    // Open via the liked projects card
    await page.getByText('Liked Songs', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Liked Songs' })).toBeVisible();
    const modal = page.locator('.fixed.inset-0.z-\\[70\\]');
    await expect(modal.getByText(currentTitle).first()).toBeVisible();

    // Escape closes
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Liked Songs' })).toBeHidden();

    // Reopen via sidebar heart, play from modal
    await page.locator('aside').getByRole('button', { name: 'Open liked songs' }).click();
    await page.locator('.fixed.inset-0.z-\\[70\\]').getByText(currentTitle).first().click();
    await expect(page.getByRole('heading', { name: 'Liked Songs' })).toBeHidden();
    await expect(bar.locator('span.font-medium.text-sm')).toHaveText(currentTitle);
  });

  test('empty liked songs modal shows the empty state', async ({ page }) => {
    await gotoHome(page);
    await page.locator('aside').getByRole('button', { name: 'Open liked songs' }).click();
    await expect(page.getByText('No liked songs yet.')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('hover-like a popular row keeps the heart visible', async ({ page }) => {
    await gotoHome(page);
    const rows = popularRows(page);
    const secondRow = rows.nth(1);
    await secondRow.hover();
    await secondRow.getByRole('button', { name: 'Like', exact: true }).click();
    // Move away — the liked heart should stay visible (opacity-100 when liked)
    await page.getByRole('heading', { name: 'Popular' }).hover();
    await expect(secondRow.getByRole('button', { name: 'Unlike', exact: true })).toBeVisible();
    await expect(page.getByText("You've liked 1 projects")).toBeVisible();
    // Unlike to clean up
    await secondRow.hover();
    await secondRow.getByRole('button', { name: 'Unlike', exact: true }).click();
  });

  test('right sidebar like stays in sync with player bar like', async ({ page }) => {
    await gotoHome(page);
    const bar = playerBar(page);
    // Open the right sidebar (chevron button when closed)
    await page.getByRole('button', { name: 'Expand now playing view' }).click();

    const sidebar = page.locator('div.hidden.lg\\:flex.w-80');
    await expect(sidebar).toBeVisible();

    await bar.getByRole('button', { name: 'Like', exact: true }).click();
    await expect(sidebar.getByRole('button', { name: 'Unlike', exact: true })).toBeVisible();

    await sidebar.getByRole('button', { name: 'Unlike', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'Like', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Close details' }).click();
  });
});

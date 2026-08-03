import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers.js';

test.describe('menus and modals', () => {
  test('follow button opens socials menu with correct links', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Follow' }).click();

    const instagram = page.getByRole('link', { name: 'Instagram' });
    await expect(instagram).toBeVisible();
    await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/scr4tchman/');

    await expect(page.getByRole('link', { name: 'Music Blog' })).toHaveAttribute('href', 'https://kaizhang.substack.com/');
    await expect(page.getByRole('link', { name: 'Devpost' })).toHaveAttribute('href', /devpost\.com\/Scr4tch587/);
    await expect(page.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:k466zhang@uwaterloo.ca');

    // Click outside closes
    await page.getByRole('heading', { name: 'Popular' }).click();
    await expect(instagram).toBeHidden();
  });

  test('SE webring menu opens with prev/site/next links', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'SE Webring' }).click();
    const webringLink = page.getByRole('link', { name: 'SE Webring' });
    await expect(webringLink).toBeVisible();
    await expect(webringLink).toHaveAttribute('href', 'https://se-webring.xyz/');
    // Arrow links exist
    await expect(page.locator('a[href="https://bhuvnesh.me/"]')).toBeVisible();
    await expect(page.locator('a[href="https://simranthind.me/"]')).toBeVisible();
    await page.getByRole('heading', { name: 'Popular' }).click();
    await expect(webringLink).toBeHidden();
  });

  test('capsule links: LinkedIn, GitHub have correct destinations', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', /linkedin\.com\/in\/kai-zhang-waterloo/);
    await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Scr4tch587');
  });

  test("what's new bell opens the menu; filters and close work", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: "What's new" }).click();
    await expect(page.getByRole('heading', { name: "What's New" })).toBeVisible();
    await expect(page.getByText('Latest updates from me.')).toBeVisible();

    // Filter chips
    const modal = page.locator('.fixed.inset-0.z-\\[80\\]');
    await modal.getByRole('button', { name: 'Albums', exact: true }).click();
    await modal.getByRole('button', { name: 'All', exact: true }).click();

    // Escape closes
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: "What's New" })).toBeHidden();
  });

  test('about image opens the gallery modal and arrows cycle', async ({ page }) => {
    await gotoHome(page);
    await page.getByText('monthly visitors').click();

    await expect(page.getByText('1 / 4')).toBeVisible();
    await page.getByRole('button', { name: 'Next image' }).click();
    await expect(page.getByText('2 / 4')).toBeVisible();
    await page.getByRole('button', { name: 'Previous image' }).click();
    await expect(page.getByText('1 / 4')).toBeVisible();
    await page.getByRole('button', { name: 'Previous image' }).click();
    await expect(page.getByText('4 / 4')).toBeVisible();

    await page.getByRole('button', { name: 'Close image gallery' }).click();
    await expect(page.getByText('1 / 4')).toBeHidden();
  });

  test('profile button shows a Coming Soon tooltip on hover', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Profile' }).hover();
    await expect(page.getByText('Coming Soon')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { fetchProjects, loginAsAdmin, sortByPriority } from './helpers.js';
import { deleteProjectDoc, restoreOrderingPriorities } from './adminRest.js';

const TEST_PROJECT_TITLE = 'E2E TEST PROJECT (auto-delete)';

test.describe('dev login', () => {
  test('shows the Google sign-in gate', async ({ page }) => {
    await page.goto('/dev');
    await expect(page.getByRole('heading', { name: 'Developer Login' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
  });

  test('unauthenticated /dev/admin redirects to /dev', async ({ page }) => {
    await page.goto('/dev/admin');
    await expect(page.getByRole('heading', { name: 'Developer Login' })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/dev$/);
  });
});

test.describe('admin panel', () => {
  test('login, project list, create/edit/delete round-trip with cleanup', async ({ page, request }) => {
    test.setTimeout(240_000);

    // Snapshot ordering priorities before any mutation.
    const before = await fetchProjects(request);
    const prioritySnapshot = new Map(before.map((p) => [p.docId, p.orderingPriority]));

    await loginAsAdmin(page, request);

    // Project list shows live projects
    const sorted = sortByPriority(before);
    for (const project of sorted.slice(0, 3)) {
      await expect(page.getByText(project.title, { exact: true }).first()).toBeVisible();
    }

    let createdDocId = null;
    try {
      // ---- CREATE ----
      await page.getByRole('button', { name: 'Add New Project' }).click();
      await page.getByLabel('Title').fill(TEST_PROJECT_TITLE);
      await page.getByLabel('Type').selectOption('Single');
      await page.getByLabel('Description').fill('Temporary project created by the e2e suite. Safe to delete.');
      await page.getByLabel('Tags (comma-separated)').fill('e2e, test');
      await page.getByLabel('Year').fill('2026');
      await page.getByLabel('Duration (MM:SS)').fill('2:34');
      // No README processing wanted: leave GitHub empty, disable lyrics
      await page.getByText('Enable lyrics view when a processed README is available').click();
      await page.getByRole('button', { name: 'Create Project' }).click();

      // New project appears in the list
      await expect(page.getByText(TEST_PROJECT_TITLE).first()).toBeVisible({ timeout: 20_000 });

      const afterCreate = await fetchProjects(request);
      const created = afterCreate.find((p) => p.title === TEST_PROJECT_TITLE);
      expect(created).toBeTruthy();
      createdDocId = created.docId;
      expect(created.orderingPriority).toBe(0);
      expect(created.views).toBe(0);
      expect(created.type).toBe('Single');
      expect(created.tags).toEqual(['e2e', 'test']);
      expect(created.lyricsEnabled).toBe(false);

      // ---- EDIT ----
      const row = page.locator('[data-row]', { hasText: TEST_PROJECT_TITLE });
      await row.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByText(`Currently editing: ${TEST_PROJECT_TITLE}`)).toBeVisible();
      await page.getByLabel('Description').fill('Edited by the e2e suite.');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect.poll(async () => {
        const current = await fetchProjects(request);
        return current.find((p) => p.docId === createdDocId)?.description;
      }, { timeout: 20_000 }).toBe('Edited by the e2e suite.');

      // ---- DELETE (via UI, accepting the confirm dialog) ----
      page.once('dialog', (dialog) => dialog.accept());
      await row.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText(TEST_PROJECT_TITLE)).toBeHidden({ timeout: 20_000 });

      await expect.poll(async () => {
        const current = await fetchProjects(request);
        return current.some((p) => p.docId === createdDocId);
      }, { timeout: 20_000 }).toBe(false);
      createdDocId = null;
    } finally {
      // Safety net: remove the test project if the UI flow failed mid-way.
      if (createdDocId) {
        await deleteProjectDoc(request, createdDocId).catch(() => {});
      }
      // Restore the ordering priorities the create-flow bumped (+1 on every doc).
      const current = await fetchProjects(request);
      await restoreOrderingPriorities(request, prioritySnapshot, current);
    }

    // Verify restoration really happened.
    const restored = await fetchProjects(request);
    for (const project of restored) {
      const expected = prioritySnapshot.get(project.docId);
      if (expected !== undefined) {
        expect(project.orderingPriority, `${project.title} priority restored`).toBe(expected);
      }
    }

    // ---- SIGN OUT ----
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Developer Login' })).toBeVisible({ timeout: 15_000 });
  });

  test('authenticated /dev redirects straight to admin panel', async ({ page, request }) => {
    await loginAsAdmin(page, request);
    await page.goto('/dev');
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 15_000 });
  });
});

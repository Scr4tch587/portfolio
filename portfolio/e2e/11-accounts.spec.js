import { test, expect } from '@playwright/test';
import { fetchProjects, gotoHome, playerBar, popularOf, popularRows } from './helpers.js';
import { getAdminIdToken } from './adminRest.js';
import {
  createProfileDocs,
  deleteAuthUser,
  deleteDocPath,
  getDoc,
  listMessageDocs,
  listOwnPlaylists,
  signUpTestUser,
} from './accountsRest.js';

/**
 * The one core-flow account test: sign in -> claim username -> like persists
 * across reload -> create playlist with a project + open it + play it ->
 * DM another user from their profile. Everything it creates is cleaned up.
 */
test.describe('accounts core flow', () => {
  test('sign-in, username, persistent like, playlist, direct message', async ({ page, request }) => {
    test.setTimeout(240_000);

    const runId = Math.random().toString(36).slice(2, 8);
    const password = `e2e-Pass-${runId}!`;
    const usernameA = `e2e_a_${runId}`;
    const usernameB = `e2e_b_${runId}`;
    const playlistName = `E2E Playlist ${runId}`;

    const userA = await signUpTestUser(request, `e2e-a-${runId}@example.com`, password);
    const userB = await signUpTestUser(request, `e2e-b-${runId}@example.com`, password);
    // B gets a profile via REST so the UI username flow runs once (for A).
    await createProfileDocs(request, userB.idToken, userB.uid, usernameB);

    const convId = [userA.uid, userB.uid].sort().join('_');

    try {
      // ---- Sign in as A via the DEV hook, claim a username ----
      await gotoHome(page);
      await page.waitForFunction(() => typeof window.__testSignInWithEmailPassword === 'function');
      await page.evaluate(
        ([email, pw]) => window.__testSignInWithEmailPassword(email, pw),
        [userA.email, password],
      );
      await expect(page.getByRole('heading', { name: 'Pick a username' })).toBeVisible({ timeout: 20_000 });
      const usernameHeading = page.getByRole('heading', { name: 'Pick a username' });
      let claimed = false;
      for (let attempt = 0; attempt < 3 && !claimed; attempt += 1) {
        await page.getByLabel('Username').fill(usernameA);
        await page.getByRole('button', { name: 'Claim username' }).click();
        claimed = await usernameHeading
          .waitFor({ state: 'hidden', timeout: 10_000 })
          .then(() => true, () => false);
      }
      if (!claimed) {
        const modalErrors = await page.locator('.text-red-400').allTextContents().catch(() => []);
        throw new Error(`Username claim did not complete. Modal error: ${JSON.stringify(modalErrors)}`);
      }

      // ---- Like the top popular project; verify it lands in Firestore ----
      const projects = await fetchProjects(request);
      const topProject = popularOf(projects)[0];
      const firstRow = popularRows(page).first();
      await firstRow.hover();
      await firstRow.getByRole('button', { name: 'Like' }).click();
      await expect.poll(async () => {
        const like = await getDoc(request, userA.idToken, `users/${userA.uid}/likes/${topProject.docId}`);
        return Boolean(like);
      }, { timeout: 15_000 }).toBe(true);

      // ---- Reload: session and like both persist ----
      await gotoHome(page);
      await firstRow.hover();
      await expect(firstRow.getByRole('button', { name: 'Unlike' })).toBeVisible({ timeout: 15_000 });

      // ---- Create a playlist holding that project, open it, play it ----
      await firstRow.hover();
      await firstRow.getByRole('button', { name: 'Add to playlist' }).click();
      await page.getByRole('button', { name: 'New playlist' }).click();
      await page.getByLabel('New playlist name').fill(playlistName);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      // The new playlist appears in the list already containing the project.
      await expect(page.getByRole('button', { name: `${playlistName} 1 project` })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Close add to playlist' }).click();

      // Sidebar tile -> playlist view
      await page.getByRole('button', { name: playlistName }).click();
      await expect(page.getByRole('heading', { name: playlistName, level: 1 })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(topProject.title).first()).toBeVisible();
      await page.getByRole('button', { name: 'Play playlist' }).click();
      await expect(playerBar(page).getByText(topProject.title).first()).toBeVisible({ timeout: 10_000 });

      // ---- DM user B from their profile (deep link -> Message -> send) ----
      await page.goto(`/#/u/${usernameB}`);
      await expect(page.locator('div.z-\\[9999\\]')).toHaveCount(0, { timeout: 25_000 });
      await expect(page.getByRole('heading', { name: usernameB, level: 1 })).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Message', exact: true }).click();
      const composer = page.getByLabel('Message text');
      await composer.fill('hello from e2e');
      // First call cold-starts the sendMessage function; be generous.
      await composer.press('Enter');
      // Appears twice once delivered (thread bubble + conversation preview).
      await expect(page.getByText('hello from e2e').first()).toBeVisible({ timeout: 45_000 });

      // B can read the conversation (participant read per rules).
      const conv = await getDoc(request, userB.idToken, `conversations/${convId}`);
      expect(conv).toBeTruthy();
      const preview = conv?.fields?.lastMessageText?.stringValue;
      expect(preview).toBe('hello from e2e');
    } finally {
      // ---- Cleanup: everything this test created ----
      const projects = await fetchProjects(request).catch(() => []);
      const topProject = popularOf(projects)[0];
      if (topProject) {
        await deleteDocPath(request, userA.idToken, `users/${userA.uid}/likes/${topProject.docId}`).catch(() => {});
      }
      const playlistIds = await listOwnPlaylists(request, userA.idToken, userA.uid).catch(() => []);
      for (const playlistId of playlistIds) {
        await deleteDocPath(request, userA.idToken, `playlists/${playlistId}`).catch(() => {});
      }
      await deleteDocPath(request, userA.idToken, `users/${userA.uid}`).catch(() => {});
      await deleteDocPath(request, userA.idToken, `usernames/${usernameA}`).catch(() => {});
      await deleteDocPath(request, userB.idToken, `users/${userB.uid}`).catch(() => {});
      await deleteDocPath(request, userB.idToken, `usernames/${usernameB}`).catch(() => {});

      // Conversations are function-written; admin cleans them up.
      const adminToken = await getAdminIdToken(request).catch(() => null);
      if (adminToken) {
        const messageIds = await listMessageDocs(request, adminToken, convId).catch(() => []);
        for (const msgId of messageIds) {
          await deleteDocPath(request, adminToken, `conversations/${convId}/messages/${msgId}`).catch(() => {});
        }
        await deleteDocPath(request, adminToken, `conversations/${convId}`).catch(() => {});
      }

      await deleteAuthUser(request, userA.idToken).catch(() => {});
      await deleteAuthUser(request, userB.idToken).catch(() => {});
    }
  });
});

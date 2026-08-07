import { test, expect } from '@playwright/test';
import { fetchProjects } from './helpers.js';
import {
  createPlaylistDoc,
  createProfileDocs,
  deleteAuthUser,
  deleteDocPath,
  signUpTestUser,
} from './accountsRest.js';

/**
 * Regression test: the projects subscription (and imageUrl -> image
 * resolution) must live at the provider level, not in Home. A cold load on a
 * playlist deep link never mounts Home; before the fix that meant an
 * eternal loading spinner and no covers. Verified against Waypost, whose
 * cover only exists as a Firestore imageUrl.
 */
test.describe('deep-link image loading', () => {
  test('cold playlist deep link renders Waypost with a decoded cover image', async ({ page, request }) => {
    test.setTimeout(120_000);

    const projects = await fetchProjects(request);
    const waypost = projects.find((p) => p.title === 'Waypost');
    expect(waypost, 'Waypost project exists in live data').toBeTruthy();
    expect(waypost.imageUrl, 'Waypost has a Firestore imageUrl').toBeTruthy();

    const runId = Math.random().toString(36).slice(2, 8);
    const user = await signUpTestUser(request, `e2e-img-${runId}@example.com`, `e2e-Pass-${runId}!`);
    const username = `e2e_img_${runId}`;
    await createProfileDocs(request, user.idToken, user.uid, username);
    const playlistId = await createPlaylistDoc(request, user.idToken, {
      ownerUid: user.uid,
      ownerUsername: username,
      name: `Waypost check ${runId}`,
      projectIds: [waypost.docId],
      visibility: 'unlisted',
    });

    try {
      // Cold load straight onto the deep link — Home never mounts.
      await page.goto(`/#/playlist/${playlistId}`);
      await expect(page.locator('div.z-\\[9999\\]')).toHaveCount(0, { timeout: 25_000 });
      await expect(page.getByRole('heading', { name: `Waypost check ${runId}`, level: 1 })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Waypost', { exact: true }).first()).toBeVisible();

      // The cover must actually decode, not just have a src.
      const cover = page.locator(`img[src="${waypost.imageUrl}"]`).first();
      await expect(cover).toBeVisible({ timeout: 15_000 });
      await expect.poll(
        () => cover.evaluate((img) => img.naturalWidth),
        { timeout: 15_000 },
      ).toBeGreaterThan(0);
    } finally {
      await deleteDocPath(request, user.idToken, `playlists/${playlistId}`).catch(() => {});
      await deleteDocPath(request, user.idToken, `users/${user.uid}`).catch(() => {});
      await deleteDocPath(request, user.idToken, `usernames/${username}`).catch(() => {});
      await deleteAuthUser(request, user.idToken).catch(() => {});
    }
  });
});

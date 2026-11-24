import { expect, test } from '@playwright/test';

import { stubThirdParties } from './helpers';

// Records the Attack replay in off mode as a video. This lives in its own file
// because `video` cannot be set inside a describe group.
test.use({ video: { mode: 'on', size: { width: 1440, height: 1024 } } });

test('record the attack replay in off mode', async ({ page }) => {
  await stubThirdParties(page);
  await page.goto('/off/');
  await page.locator('#replay').click();
  await expect(page.locator('#timeline li')).toHaveCount(5, {
    timeout: 30_000,
  });
  // Hold the last frame so the finished timeline is readable.
  await page.waitForTimeout(1500);
  const video = page.video();
  await page.close();
  await video?.saveAs('screenshots/off-replay.webm');
});

import type { Page } from '@playwright/test';

// config.js is a browser script that also exports its config for Node.

export const config = require('../src/config.js') as {
  /** */
  HAS_BUNDLE_ID: boolean;
  /** */
  UNAPPROVED_HOST: string;
  /** */
  ANALYTICS_HOST: string;
};

export const SKIP_MESSAGE =
  'Skipped: the bundle is not set. BUNDLE_ID in src/config.js is still the placeholder REPLACE_WITH_DEMO_BUNDLE_ID, so Airgap cannot load. Run node scripts/set-bundle-id.mjs <bundle-id>.';

// Fake the two third-party hosts at the network layer so the test does not
// depend on them being up. This runs below Airgap, so Airgap still decides
// what the page may send.
/**
 * @param page
 */
export async function stubThirdParties(page: Page): Promise<void> {
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.route(`https://${config.UNAPPROVED_HOST}/**`, (route) => {
    if (route.request().url().includes('.png')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: pixel,
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/plain',
      headers: { 'access-control-allow-origin': '*' },
      body: 'stub',
    });
  });
  await page.route(`https://${config.ANALYTICS_HOST}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// stub',
    }),
  );
}

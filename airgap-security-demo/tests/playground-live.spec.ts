import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { config, stubPlaygroundHosts } from './helpers';

// UNVERIFIED: these tests need a live consent manager bundle. They skip until
// you give them one, with the bundle ID in config.js (node
// scripts/set-bundle-id.mjs <bundle-id>) or in AIRGAP_DEMO_BUNDLE_ID. The
// expected results come from the airgap.js docs. They have not run against a
// real bundle. The third-party hosts are stubbed below Airgap.
const BUNDLE = process.env.AIRGAP_DEMO_BUNDLE_ID || '';
const HAS_BUNDLE = config.HAS_BUNDLE_ID || BUNDLE !== '';
const SKIP =
  'Skipped: no live bundle. Set AIRGAP_DEMO_BUNDLE_ID or run node scripts/set-bundle-id.mjs <bundle-id>.';

/**
 * @param query
 */
function url(query: string): string {
  const extra = BUNDLE ? `bundle=${BUNDLE}` : '';
  const joined = [query, extra].filter(Boolean).join('&');
  return `/playground/${joined ? `?${joined}` : ''}`;
}

/**
 * @param page
 * @param id
 */
async function run(page: Page, id: string) {
  await page.locator(`button[data-attack-run="${id}"]`).click();
  const row = page.locator(`#results tr[data-attack="${id}"]`).last();
  await expect(row).toBeVisible({ timeout: 20_000 });
  return row;
}

test.describe('playground against a live bundle (unverified)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_BUNDLE, SKIP);
    await stubPlaygroundHosts(page);
  });

  test('airgap.js loads when the tag is inserted by the page', async ({
    page,
  }) => {
    await page.goto(url('unknownRequests=block'));
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
  });

  test('report-only lets every request through and lists it', async ({
    page,
  }) => {
    await page.goto(url('reportOnly=on'));
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
    const row = await run(page, 'fetch');
    await expect(row).toHaveAttribute('data-outcome', /^(reported|allowed)$/);
  });

  test('block mode stops an unknown host', async ({ page }) => {
    await page.goto(url('unknownRequests=block'));
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
    for (const id of ['fetch', 'beacon', 'xhr', 'stylesheet']) {
      const row = await run(page, id);
      await expect(row).toHaveAttribute('data-outcome', 'blocked');
    }
  });

  test('navigation control stops a location change', async ({ page }) => {
    await page.goto(url('unknownRequests=block&nav=on'));
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
    const row = await run(page, 'location');
    await expect(row).toHaveAttribute('data-outcome', 'blocked');
  });

  test('the pin recipe stops the attacker account but not the store account', async ({
    page,
  }) => {
    await page.goto(
      url(
        'unknownRequests=block&recipes=pin-analytics-account&consent=Analytics',
      ),
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
    await page.locator('#apply-consent').click();
    // With a CSP on, Airgap may reload the page after consent changes.
    await page.waitForLoadState('load');
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: 15_000 },
    );
    const attacker = await run(page, 'analytics-attacker');
    await expect(attacker).toHaveAttribute('data-outcome', 'blocked');
    const store = await run(page, 'analytics-store');
    await expect(store).toHaveAttribute('data-outcome', 'allowed');
  });
});

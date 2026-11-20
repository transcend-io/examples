import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// config.js is a browser script that also exports its config for Node.

const config = require('../src/config.js') as {
  /** */
  HAS_BUNDLE_ID: boolean;
  /** */
  APPROVED_HOST: string;
  /** */
  UNAPPROVED_HOST: string;
};

/**
 *
 */
type Outcome = string | string[];

interface ModeSpec {
  /** */
  mode: string;
  /** */
  needsBundle: boolean;
  /** */
  expected: Record<string, Outcome>;
}

// Scenario 3 runs in an iframe, so the visitor stays on the page. Block mode
// runs it too, but a frame may be refused by the generated CSP, so only
// navigation mode asserts that result.
const MODES: ModeSpec[] = [
  {
    mode: 'off',
    needsBundle: false,
    expected: {
      pixel: 'allowed',
      fetch: 'allowed',
      navigate: 'allowed',
      approved: 'allowed',
    },
  },
  {
    mode: 'report-only',
    needsBundle: true,
    expected: {
      pixel: 'reported',
      fetch: 'reported',
      navigate: ['reported', 'allowed'],
      approved: 'reported',
    },
  },
  {
    mode: 'block',
    needsBundle: true,
    expected: {
      pixel: ['blocked', 'blocked-by-csp'],
      fetch: ['blocked', 'blocked-by-csp'],
      navigate: ['allowed', 'blocked', 'blocked-by-csp'],
      approved: 'allowed',
    },
  },
  {
    mode: 'navigation',
    needsBundle: true,
    expected: {
      pixel: ['blocked', 'blocked-by-csp'],
      fetch: ['blocked', 'blocked-by-csp'],
      navigate: ['blocked', 'blocked-by-csp'],
      approved: 'allowed',
    },
  },
];

// Fake the two third-party hosts at the network layer so the test does not
// depend on them being up. This runs below Airgap, so Airgap still decides
// what the page may send.
/**
 * @param page
 */
async function stubThirdParties(page: Page): Promise<void> {
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
  await page.route(`https://${config.APPROVED_HOST}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{}',
    }),
  );
}

for (const { mode, needsBundle, expected } of MODES) {
  test(`${mode} mode shows the expected result for each scenario`, async ({
    page,
  }) => {
    test.skip(
      needsBundle && !config.HAS_BUNDLE_ID,
      'Skipped: BUNDLE_ID in src/config.js is still the placeholder REPLACE_WITH_DEMO_BUNDLE_ID.',
    );
    await stubThirdParties(page);
    await page.goto(`/${mode}/`);
    await page.getByRole('button', { name: 'Run all' }).click();

    for (const [scenario, outcome] of Object.entries(expected)) {
      const row = page.locator(`tr[data-scenario="${scenario}"]`).last();
      await expect(row).toBeVisible({ timeout: 20_000 });
      const allowed = Array.isArray(outcome) ? outcome : [outcome];
      await expect
        .poll(async () => row.getAttribute('data-outcome'), { timeout: 20_000 })
        .toEqual(expect.stringMatching(new RegExp(`^(${allowed.join('|')})$`)));
    }

    await page.screenshot({ path: `screenshots/${mode}.png` });
  });
}

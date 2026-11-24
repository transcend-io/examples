import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { config, SKIP_MESSAGE, stubThirdParties } from './helpers';

/**
 *
 */
type Outcome = string | string[];

interface StepSpec {
  /** */
  id: string;
  /** */
  expected: Record<string, Outcome>;
}

// One entry per story step, in story order. `expected` maps a mode to the
// accepted outcomes.
//
// The expectations for the three Airgap modes are what the Airgap source says
// should happen. They have not run against the real bundle yet.
// - Navigation runs in an iframe, so the visitor stays on the page. Block mode
//   runs it too, but a frame may be refused by the generated CSP, so only
//   navigation mode asserts that it is cancelled.
// - Try 2 (stylesheet) is unproven. The runtime may or may not see it. The
//   test accepts "blocked by CSP" or "blocked". An "allowed" result means the
//   claim in the story is false and the test fails on purpose.
// - Try 4 (analytics) is held while Analytics has no consent.
const STEPS: StepSpec[] = [
  {
    id: 'take-one',
    expected: {
      off: 'allowed',
      'report-only': ['reported', 'allowed'],
      block: ['allowed', 'blocked', 'blocked-by-csp'],
      navigation: ['blocked', 'blocked-by-csp'],
    },
  },
  {
    id: 'fetch',
    expected: {
      off: 'allowed',
      'report-only': 'reported',
      block: ['blocked', 'blocked-by-csp'],
      navigation: ['blocked', 'blocked-by-csp'],
    },
  },
  {
    id: 'stylesheet',
    expected: {
      off: 'allowed',
      'report-only': ['reported', 'allowed'],
      block: ['blocked-by-csp', 'blocked'],
      navigation: ['blocked-by-csp', 'blocked'],
    },
  },
  {
    id: 'navigation',
    expected: {
      off: 'allowed',
      'report-only': ['reported', 'allowed'],
      block: ['allowed', 'blocked', 'blocked-by-csp'],
      navigation: ['blocked', 'blocked-by-csp'],
    },
  },
  {
    id: 'analytics',
    expected: {
      off: 'allowed',
      'report-only': ['reported', 'allowed'],
      block: 'held',
      navigation: 'held',
    },
  },
];

const AIRGAP_MODES = ['report-only', 'block', 'navigation'];

/**
 * @param page
 * @param step
 * @param allowed
 */
async function expectOutcome(
  page: Page,
  step: string,
  allowed: Outcome,
): Promise<void> {
  const row = page.locator(`tr[data-step="${step}"]`).last();
  await expect(row).toBeVisible({ timeout: 20_000 });
  const accepted = Array.isArray(allowed) ? allowed : [allowed];
  await expect
    .poll(async () => row.getAttribute('data-outcome'), { timeout: 20_000 })
    .toEqual(expect.stringMatching(new RegExp(`^(${accepted.join('|')})$`)));
}

// ---- off: runs for real -----------------------------------------------------

test.describe('off mode', () => {
  test.beforeEach(async ({ page }) => {
    await stubThirdParties(page);
  });

  STEPS.forEach(({ id, expected }, index) => {
    test(`step ${index + 1} (${id}) is allowed, with a screenshot`, async ({
      page,
    }) => {
      await page.goto('/off/');
      await page.locator(`button[data-step-run="${id}"]`).click();
      await expectOutcome(page, id, expected.off);
      await page.locator(`#step-${id}`).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `screenshots/off-${index + 1}-${id}.png` });
    });
  });

  test('the page says Airgap is not loaded', async ({ page }) => {
    await page.goto('/off/');
    await expect(page.locator('#status')).toHaveAttribute('data-status', 'off');
  });

  test('a step anchor selects the step and run=on runs it', async ({
    page,
  }) => {
    await page.goto('/off/#step=fetch&run=on');
    await expect(page.locator('#step-fetch')).toHaveClass(/step-active/);
    await expectOutcome(page, 'fetch', 'allowed');
    await expect(page.locator('tr[data-step="take-one"]')).toHaveCount(0);
  });

  test('take one and try 3 show where the data went', async ({ page }) => {
    await page.goto('/off/');
    await page.locator('button[data-step-run="take-one"]').click();
    await expectOutcome(page, 'take-one', 'allowed');
    const where = page.locator('#step-take-one .where');
    await expect(where).toContainText(config.UNAPPROVED_HOST);
    await expect(where).toContainText('card = 4242 4242 4242 4242');
  });

  test('attack replay runs every step in order and writes one timeline', async ({
    page,
  }) => {
    await page.goto('/off/');
    await page.locator('#replay').click();
    const entries = page.locator('#timeline li');
    await expect(entries).toHaveCount(STEPS.length, { timeout: 30_000 });
    expect(
      await entries.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-outcome')),
      ),
    ).toEqual(STEPS.map(() => 'allowed'));
    expect(
      await entries.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-step')),
      ),
    ).toEqual(STEPS.map(({ id }) => id));
    await page.screenshot({ path: 'screenshots/off-replay.png' });
  });
});

// ---- Airgap modes: skipped until the bundle is set --------------------------

for (const mode of AIRGAP_MODES) {
  test.describe(`${mode} mode`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!config.HAS_BUNDLE_ID, SKIP_MESSAGE);
      await stubThirdParties(page);
    });

    for (const { id, expected } of STEPS) {
      test(`step ${id} shows the expected result`, async ({ page }) => {
        await page.goto(`/${mode}/`);
        await page.locator(`button[data-step-run="${id}"]`).click();
        await expectOutcome(page, id, expected[mode]);
        await page.screenshot({ path: `screenshots/${mode}-${id}.png` });
      });
    }

    test('attack replay writes one timeline with one entry per step', async ({
      page,
    }) => {
      await page.goto(`/${mode}/`);
      await page.locator('#replay').click();
      await expect(page.locator('#timeline li')).toHaveCount(STEPS.length, {
        timeout: 40_000,
      });
      await page.screenshot({ path: `screenshots/${mode}-replay.png` });
    });
  });
}

// ---- Airgap pages with the placeholder: run for real ------------------------

for (const mode of AIRGAP_MODES) {
  test(`${mode} page says the bundle ID is not set`, async ({ page }) => {
    test.skip(config.HAS_BUNDLE_ID, 'A bundle ID is set.');
    // The placeholder URL returns 404 on the CDN. Answer it locally.
    await page.route('https://transcend-cdn.com/**', (route) =>
      route.fulfill({ status: 404, body: 'not found' }),
    );
    await page.goto(`/${mode}/`);
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'warning',
    );
    await expect(page.locator('#status')).toContainText('Bundle ID not set');
  });
}

test.describe('consent toggle', () => {
  test('opting in releases the analytics request', async ({ page }) => {
    test.skip(!config.HAS_BUNDLE_ID, SKIP_MESSAGE);
    await stubThirdParties(page);
    await page.goto('/block/');
    await page.locator('button[data-step-run="analytics"]').click();
    await expectOutcome(page, 'analytics', 'held');
    // setConsent needs a real user event. A Playwright click is trusted.
    await page.locator('#consent-in').click();
    await expect(page.locator('#consent-state')).toContainText('opted in');
    await page.locator('button[data-step-run="analytics"]').click();
    await expectOutcome(page, 'analytics', ['allowed', 'blocked']);
  });
});

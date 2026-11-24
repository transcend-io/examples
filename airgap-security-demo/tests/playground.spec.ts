import { spawn } from 'node:child_process';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  config,
  stubAirgap,
  stubConfiguredBundle,
  stubPlaygroundHosts,
} from './helpers';

// Playground tests that use a STAND-IN for airgap.js (see AIRGAP_STUB in
// helpers.ts). They prove the playground's own wiring: settings, the tag it
// inserts, the pre-init config, the copy panel, and how results are named.
// They do not prove what the real bundle does.

const RECIPE_IDS = [
  'pin-analytics-account',
  'block-email',
  'block-card-and-tokens',
  'omit-credentials-images',
  'block-ads-for-minors',
  'strip-personal-data-from-links',
  'forward-blocked-to-siem',
  'custom',
];

/**
 * @param page
 * @param id
 */
async function runAttack(page: Page, id: string): Promise<void> {
  await page.locator(`button[data-attack-run="${id}"]`).click();
  await expect(
    page.locator(`#results tr[data-attack="${id}"]`).last(),
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * @param page
 * @param id
 */
function lastRow(page: Page, id: string) {
  return page.locator(`#results tr[data-attack="${id}"]`).last();
}

test.describe('playground with a stand-in for airgap.js', () => {
  let bundle: string;

  test.beforeEach(async ({ page }) => {
    bundle = crypto.randomUUID();
    await stubPlaygroundHosts(page);
    await stubAirgap(page);
    // Fail the test if anything calls document.write.
    await page.addInitScript(() => {
      (window as any).__writes = 0;
      const count = () => {
        (window as any).__writes += 1;
      };
      document.write = count;
      document.writeln = count;
    });
  });

  test('inserts the tag with DOM APIs, with the documented attributes', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&reportOnly=off&unknownRequests=block&csp=lax&nav=on`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    const stub = await page.evaluate(() => (window as any).__stub);
    expect(stub.attrs).toEqual({
      src: `https://transcend-cdn.com/cm/${bundle}/airgap.js`,
      'data-report-only': 'off',
      'data-unknown-request-policy': 'block',
      'data-csp': 'allow-known-hosts allow-subdomains',
      'data-regulate-navigation': 'on',
    });
    expect(stub.usedReadyQueue).toBe(true);
    expect(await page.evaluate(() => (window as any).__writes)).toBe(0);
    // The tag sits in the head, after the bootstrap script.
    const order = await page.evaluate(() =>
      Array.from(document.head.querySelectorAll('script'))
        .map((script) => script.getAttribute('src') || '')
        .filter((src) => /bootstrap\.js|airgap\.js/.test(src)),
    );
    expect(order[0]).toContain('bootstrap.js');
    expect(order[1]).toContain('/airgap.js');
  });

  test('drops hostile values and still loads with the safe defaults', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      return dialog.dismiss();
    });
    await page.goto(
      `/playground/?bundle=${bundle}&csp=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E&approve=x.com%22%20onload%3D%22alert(1)&recipes=custom,%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    const stub = await page.evaluate(() => (window as any).__stub);
    expect(Object.keys(stub.attrs).sort()).toEqual(['data-report-only', 'src']);
    expect(stub.overrides).toBe(1);
    await expect(page.locator('#warnings li')).toHaveCount(3);
    expect(await page.locator('#warnings').innerText()).toContain('csp');
    // User text is shown as text, never as markup.
    expect(await page.locator('#warnings img, #app img').count()).toBe(0);
    expect(dialogs).toEqual([]);
  });

  test('ignores a bundle that is not a UUID', async ({ page }) => {
    test.skip(config.HAS_BUNDLE_ID, 'A bundle ID is set in config.js.');
    await page.goto('/playground/?bundle=../../evil');
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'skipped',
    );
    await expect(page.locator('#warnings')).toContainText('not a UUID');
    expect(await page.locator('script[src*="transcend-cdn.com"]').count()).toBe(
      0,
    );
  });

  test('with no bundle at all, says what to do and still runs attacks', async ({
    page,
  }) => {
    test.skip(config.HAS_BUNDLE_ID, 'A bundle ID is set in config.js.');
    await page.goto('/playground/');
    await expect(page.locator('#status')).toContainText('No bundle ID');
    await expect(page.locator('#status')).toContainText('set-bundle-id');
    await runAttack(page, 'pixel');
    await expect(lastRow(page, 'pixel')).toHaveAttribute(
      'data-outcome',
      'allowed',
    );
    await expect(lastRow(page, 'pixel')).toHaveAttribute('data-layer', '');
  });

  test('the Airgap control off loads no tag and attacks go through', async ({
    page,
  }) => {
    await page.goto(`/playground/?airgap=off&bundle=${bundle}`);
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'skipped',
    );
    expect(await page.locator('script[src*="transcend-cdn.com"]').count()).toBe(
      0,
    );
    for (const id of [
      'pixel',
      'fetch',
      'xhr',
      'script',
      'iframe',
      'form-post',
      'cookie',
    ]) {
      await runAttack(page, id);
      await expect(lastRow(page, id)).toHaveAttribute(
        'data-outcome',
        'allowed',
      );
    }
  });

  test('the copy panel prints the exact tag and the pre-init code', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&csp=strict&nav=report-only&recipes=pin-analytics-account&approve=api.example.com`,
    );
    await expect(page.locator('#copy-tag')).toHaveText(
      [
        `<script src="https://transcend-cdn.com/cm/${bundle}/airgap.js"`,
        '  data-report-only="off"',
        '  data-csp="strict"',
        '  data-regulate-navigation="report-only"',
        '></script>',
      ].join('\n'),
    );
    const init = await page.locator('#copy-preinit').innerText();
    expect(init).toContain('STORE_ACCOUNT');
    expect(init).toContain('"api.example.com":["Essential"]');
    expect(init).not.toContain('AirgapPlayground');
    // Applying the printed code gives the same pre-init shape the page set.
    const shape = await page.evaluate((code) => {
      const saved = (window as any).airgap;
      (window as any).airgap = undefined;
      // eslint-disable-next-line no-new-func
      new Function(code)();
      const made = (window as any).airgap;
      (window as any).airgap = saved;
      return { overrides: made.overrides.length, csp: made.csp };
    }, init);
    expect(shape).toEqual({
      overrides: 2,
      csp: { 'api.example.com': ['Essential'] },
    });
    await expect(page.locator('#copy-link')).toContainText(
      `?csp=strict&nav=report-only&recipes=pin-analytics-account&approve=api.example.com&bundle=${bundle}`,
    );
  });

  test('every recipe has a file, a title, and valid printed code', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&recipes=${RECIPE_IDS.join(',')}`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    const ids = await page.evaluate(() =>
      (window as any).AirgapPlayground.recipes.list.map(
        (recipe: any) => recipe.id,
      ),
    );
    expect([...ids].sort()).toEqual([...RECIPE_IDS].sort());
    await expect(page.locator('input[name="recipes"]')).toHaveCount(
      RECIPE_IDS.length,
    );
    const init = await page.locator('#copy-preinit').innerText();
    const ok = await page.evaluate((code) => {
      const saved = (window as any).airgap;
      try {
        // eslint-disable-next-line no-new-func
        new Function(code)();
        return true;
      } catch (error) {
        return String(error);
      } finally {
        (window as any).airgap = saved;
      }
    }, init);
    expect(ok).toBe(true);
    const response = await page.request.get('/playground/recipes/custom.js');
    expect(response.status()).toBe(200);
  });

  test('presets set the form and the link', async ({ page }) => {
    await page.goto(`/playground/?bundle=${bundle}`);
    await page.locator('a[data-preset="phishing-redirect"]').click();
    await expect(page.locator('select[name="nav"]')).toHaveValue('on');
    await expect(
      page.locator(
        'input[name="recipes"][value="strip-personal-data-from-links"]',
      ),
    ).toBeChecked();
    await expect(page).toHaveURL(
      /nav=on&recipes=strip-personal-data-from-links/,
    );
  });

  test('changing a select reloads with the setting in the URL', async ({
    page,
  }) => {
    await page.goto(`/playground/?bundle=${bundle}`);
    await page.locator('select[name="csp"]').selectOption('strict');
    await expect(page).toHaveURL(/csp=strict/);
    await expect(page.locator('select[name="csp"]')).toHaveValue('strict');
    await expect(page.locator('#copy-tag')).toContainText('data-csp="strict"');
  });

  test('a held fetch is named as runtime, and unknown layers stay unnamed', async ({
    page,
  }) => {
    await stubConfiguredBundle(page, bundle);
    await page.goto('/playground/');
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    await runAttack(page, 'fetch');
    await expect(lastRow(page, 'fetch')).toHaveAttribute(
      'data-outcome',
      'blocked',
    );
    await expect(lastRow(page, 'fetch')).toHaveAttribute(
      'data-layer',
      'runtime',
    );
    // The stand-in does not patch XHR, so nothing is blocked and no layer is named.
    await runAttack(page, 'xhr');
    await expect(lastRow(page, 'xhr')).toHaveAttribute(
      'data-outcome',
      'allowed',
    );
    await expect(lastRow(page, 'xhr')).toHaveAttribute('data-layer', '');
  });

  test('classified hosts are held by consent until the box is applied', async ({
    page,
  }) => {
    await stubConfiguredBundle(page, bundle);
    await page.goto('/playground/');
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    await runAttack(page, 'analytics-store');
    await expect(lastRow(page, 'analytics-store')).toHaveAttribute(
      'data-outcome',
      'held',
    );
    await expect(lastRow(page, 'analytics-store')).toHaveAttribute(
      'data-layer',
      'consent',
    );
    await page.locator('input[data-purpose="Analytics"]').check();
    await page.locator('#apply-consent').click();
    await expect(page.locator('#consent-state')).toContainText('Analytics on');
    await runAttack(page, 'analytics-store');
    await expect(lastRow(page, 'analytics-store')).toHaveAttribute(
      'data-outcome',
      'allowed',
    );
  });

  test('the pin recipe blocks the attacker account and names the override', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&recipes=pin-analytics-account&consent=Analytics`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    await expect(page.locator('input[data-purpose="Analytics"]')).toBeChecked();
    await page.locator('#apply-consent').click();
    await expect(page.locator('#consent-state')).toContainText('Analytics on');
    await runAttack(page, 'analytics-attacker');
    await expect(lastRow(page, 'analytics-attacker')).toHaveAttribute(
      'data-outcome',
      'blocked',
    );
    await expect(lastRow(page, 'analytics-attacker')).toHaveAttribute(
      'data-layer',
      'override',
    );
    await runAttack(page, 'analytics-store');
    await expect(lastRow(page, 'analytics-store')).toHaveAttribute(
      'data-outcome',
      'allowed',
    );
    await expect(page.locator('#override-hits')).toContainText(
      'Pin the analytics account',
    );
  });

  test('the email and card recipes block a post to an approved host', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&recipes=block-email,block-card-and-tokens`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    for (const id of ['approved-email-post', 'approved-card-post']) {
      await runAttack(page, id);
      await expect(lastRow(page, id)).toHaveAttribute(
        'data-outcome',
        'blocked',
      );
      await expect(lastRow(page, id)).toHaveAttribute('data-layer', 'override');
    }
  });

  test('the health data recipe in custom.js blocks an ad pixel after consent', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&recipes=custom&consent=Advertising`,
    );
    await page.locator('#apply-consent').click();
    await expect(page.locator('#consent-state')).toContainText(
      'Advertising on',
    );
    await runAttack(page, 'ad-pixel');
    await expect(lastRow(page, 'ad-pixel')).toHaveAttribute(
      'data-outcome',
      'allowed',
    );
    await runAttack(page, 'ad-pixel-health');
    await expect(lastRow(page, 'ad-pixel-health')).toHaveAttribute(
      'data-layer',
      'override',
    );
  });

  test('the SIEM recipe registers a watcher and the feed starts empty', async ({
    page,
  }) => {
    await page.goto(
      `/playground/?bundle=${bundle}&recipes=forward-blocked-to-siem`,
    );
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    expect(await page.evaluate(() => (window as any).__stubWatchers)).toBe(1);
    await expect(page.locator('#siem-feed')).toContainText('None yet');
  });

  test('a run list in the hash runs those attacks and drops unknown IDs', async ({
    page,
  }) => {
    await page.goto(`/playground/?airgap=off#run=pixel,fetch,not-an-attack`);
    await expect(page.locator('#results tr')).toHaveCount(2, {
      timeout: 20_000,
    });
  });

  test('with your own bundle, a layer needs a policy on the tag', async ({
    page,
  }) => {
    // The org config of your own bundle is unknown, so the page names no layer.
    await page.goto(`/playground/?bundle=${bundle}`);
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    await runAttack(page, 'fetch');
    await expect(lastRow(page, 'fetch')).toHaveAttribute(
      'data-outcome',
      'blocked',
    );
    await expect(lastRow(page, 'fetch')).toHaveAttribute('data-layer', '');
    // Set the policy on the tag, and the runtime is named.
    await page.goto(`/playground/?unknownRequests=block&bundle=${bundle}`);
    await expect(page.locator('#status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    await runAttack(page, 'fetch');
    await expect(lastRow(page, 'fetch')).toHaveAttribute(
      'data-layer',
      'runtime',
    );
  });
});

test.describe('server-side tag fallback', () => {
  test('serve.mjs --inject writes a static tag from validated settings', async () => {
    const bundle = crypto.randomUUID();
    const port = 4190 + Math.floor(Math.random() * 50);
    const child = spawn(
      process.execPath,
      [join(__dirname, '..', 'scripts', 'serve.mjs'), '--inject'],
      { env: { ...process.env, PORT: String(port) }, stdio: 'pipe' },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (chunk) => {
          if (String(chunk).includes('http://localhost')) resolve();
        });
        child.on('error', reject);
        setTimeout(() => reject(new Error('server did not start')), 10_000);
      });
      const base = `http://localhost:${port}`;
      const html = await (
        await fetch(
          `${base}/playground/?bundle=${bundle}&nav=on&csp=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E`,
        )
      ).text();
      expect(html).toContain('name="playground-tag-mode" content="static"');
      expect(html).toContain(
        `<script src="https://transcend-cdn.com/cm/${bundle}/airgap.js"\n  data-report-only="off"\n  data-regulate-navigation="on"\n></script>`,
      );
      expect(html).not.toContain('alert(1)');
      // Without a bundle the page stays dynamic and no tag is written.
      const plain = await (
        await fetch(`${base}/playground/?airgap=off`)
      ).text();
      expect(plain).toContain('content="dynamic"');
      expect(plain).toContain('<!-- AIRGAP_TAG -->');
      // A bad request target gets an error, not a crash.
      expect((await fetch(`${base}//`)).status).toBeLessThan(500);
      expect((await fetch(`${base}/off/`)).status).toBe(200);
    } finally {
      child.kill();
    }
  });
});

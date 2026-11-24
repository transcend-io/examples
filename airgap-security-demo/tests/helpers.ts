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

// Hosts that the playground attacks call besides the two above.
/**
 * @param page
 */
export async function stubPlaygroundHosts(page: Page): Promise<void> {
  await stubThirdParties(page);
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.route('https://unpkg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: '// stub',
    }),
  );
  await page.route('https://ads.linkedin.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      headers: { 'access-control-allow-origin': '*' },
      body: 'stub',
    }),
  );
  await page.route('https://cdn.jsdelivr.net/**', (route) => {
    if (route.request().url().includes('.png')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
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
}

// A stand-in for airgap.js. It is NOT Airgap. It records what the playground
// hands it (script attributes, pre-init config), drains the ready queue, and
// fakes just enough behavior to test the playground's wiring:
// - fetch to a host outside the known list never settles (as a held request)
//   when the Unknown Request Policy is block, and is listed in export()
// - fetch to a classified host is held until setConsent turns its purpose on
// - registered overrides run on fetch, with block() and URLs
// Every result that depends on real Airgap behavior stays unverified.
export const AIRGAP_STUB = `
(() => {
  const script = document.currentScript;
  const attrs = {};
  script.getAttributeNames().forEach((name) => { attrs[name] = script.getAttribute(name); });
  const pre = self.airgap || {};
  self.__stub = { attrs, overrides: (pre.overrides || []).length, csp: pre.csp || null, usedReadyQueue: Array.isArray(pre.readyQueue) };
  const purposes = { Functional: false, Analytics: false, Advertising: false, SaleOfInfo: false };
  const classified = { 'www.google-analytics.com': 'Analytics', 'ads.linkedin.com': 'Advertising' };
  const approved = ['cdn.jsdelivr.net', 'transcend-cdn.com', location.hostname];
  const held = [];
  const sent = [];
  const policy = attrs['data-unknown-request-policy'] || 'block';
  const realFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    const url = String(input);
    const parsed = new URL(url, location.href);
    const request = {
      type: 'fetch', url, urls: [url], URLs: [parsed], requestInit: init, blocked: false,
      purposes: new Set(classified[parsed.hostname] ? [classified[parsed.hostname]] : []),
      block() { this.blocked = true; }, allow() {}, deny() { this.blocked = true; },
    };
    (pre.overrides || []).forEach((entry) => {
      if (typeof entry.override !== 'function') return;
      if (entry.matcher && !entry.matcher.test(url)) return;
      entry.override(request, entry.matcher);
    });
    const purpose = classified[parsed.hostname];
    const unknown = !purpose && approved.indexOf(parsed.hostname) === -1;
    if (request.blocked || (unknown && policy === 'block') || (purpose && !purposes[purpose])) {
      held.push({ url, type: 'fetch' });
      return new Promise(() => {});
    }
    sent.push({ url, type: 'fetch' });
    return realFetch(input, init);
  };
  const api = {
    version: 'stub',
    getConsent: () => ({ purposes: Object.assign({}, purposes) }),
    setConsent: (event, consent) => { Object.assign(purposes, consent); return true; },
    export: () => ({ requests: held.slice(), sentRequests: sent.slice() }),
    watch: (fn) => { self.__stubWatchers = (self.__stubWatchers || 0) + 1; return { remove() {} }; },
    ready(callback) { callback(api); },
  };
  const queue = pre.readyQueue || [];
  self.airgap = Object.assign(pre, api);
  queue.forEach((callback) => callback(api));
})();
`;

/**
 * Serve the stub for any bundle ID.
 *
 * @param page
 */
export async function stubAirgap(page: Page): Promise<void> {
  await page.route('https://transcend-cdn.com/cm/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: AIRGAP_STUB,
    }),
  );
}

/**
 * Pretend config.js holds a real bundle ID, as it will after
 * `node scripts/set-bundle-id.mjs <bundle-id>`. This is how a test acts as the
 * demo organization's own page instead of a reader's `?bundle=`.
 *
 * @param page
 * @param bundleId
 */
export async function stubConfiguredBundle(
  page: Page,
  bundleId: string,
): Promise<void> {
  await page.route('**/src/config.js', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /BUNDLE_ID: '[^']*'/,
      `BUNDLE_ID: '${bundleId}'`,
    );
    await route.fulfill({ response, body });
  });
}

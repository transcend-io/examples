/**
 * Head bootstrap. It runs after settings.js, the recipe files, and
 * ../src/config.js, and before the page body.
 *
 * 1. Read the settings from the URL query. Every value passes an allowlist in
 *    settings.js. Bad values fall back to defaults.
 * 2. Set the pre-init config on `self.airgap` (overrides, csp, and a ready
 *    queue), the way the airgap.js docs describe.
 * 3. Insert the airgap.js script tag with DOM APIs. No document.write and no
 *    innerHTML. The tag source is a fixed origin plus a validated UUID. The
 *    attributes come from the allowlisted values.
 *
 * Fallback: when `<meta name="playground-tag-mode" content="static">` is in the
 * page, scripts/serve.mjs has already written the tag into the HTML. Then this
 * file skips step 3. Use that mode if you find the dynamic tag behaves
 * differently from a static one.
 *
 * OPEN QUESTION: a dynamically inserted tag runs after the parser has moved on,
 * so airgap.js starts later than a static head tag. The docs say airgap.ready()
 * is for "asynchronously loading airgap.js". Nothing here was run against the
 * live bundle.
 */
(function () {
  const ns = (self.AirgapPlayground = self.AirgapPlayground || {});
  const lib = ns.settings;
  const config = self.AIRGAP_DEMO_CONFIG;
  const LOAD_TIMEOUT_MS = 10000;

  const parsed = lib.parseSettings(location.search);
  const { settings } = parsed;
  const customBundle = Boolean(settings.bundle);
  const bundleId =
    settings.bundle || (config && config.HAS_BUNDLE_ID ? config.BUNDLE_ID : '');
  const meta = document.querySelector('meta[name="playground-tag-mode"]');
  const tagMode =
    meta && meta.getAttribute('content') === 'static' ? 'static' : 'dynamic';

  const state = {
    settings,
    warnings: parsed.warnings,
    bundleId,
    customBundle,
    tagMode,
    // idle -> loading -> ready | failed. "skipped" when there is nothing to load.
    status: 'skipped',
    reason: '',
    airgap: null,
  };
  ns.state = state;

  let resolveReady;
  ns.ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const finish = (status, reason, airgap) => {
    if (state.status === 'ready') return;
    state.status = status;
    state.reason = reason || '';
    state.airgap = airgap || null;
    resolveReady(state);
  };

  if (settings.airgap === 'off') {
    finish('skipped', 'The Airgap control is off, so no tag is inserted.');
    return;
  }
  if (!bundleId) {
    finish(
      'skipped',
      'No bundle ID. Add ?bundle=<your-bundle-id> to the link, or run node scripts/set-bundle-id.mjs <bundle-id>.',
    );
    return;
  }

  // Pre-init config. The wrapped overrides record which one fired.
  const overrides = [];
  settings.recipes.forEach((id) => {
    const recipe = ns.recipes.get(id);
    if (recipe) overrides.push(...ns.recipes.wrapOverrides(recipe));
  });
  if (settings.approve) overrides.push(lib.approveOverride(settings.approve));
  const preInit = {
    readyQueue: [],
    ready(callback) {
      this.readyQueue.push(callback);
    },
    overrides,
  };
  const csp = lib.cspExtension(settings);
  if (csp) preInit.csp = csp;
  self.airgap = Object.assign(preInit, self.airgap);

  state.status = 'loading';
  self.airgap.ready((airgap) => {
    finish('ready', '', airgap);
  });
  settings.recipes.forEach((id) => {
    const recipe = ns.recipes.get(id);
    if (recipe && typeof recipe.onReady === 'function') {
      self.airgap.ready(recipe.onReady);
    }
  });
  setTimeout(() => {
    finish(
      'failed',
      `airgap.js did not report ready in ${
        LOAD_TIMEOUT_MS / 1000
      } seconds. Check the bundle ID, and that this host is in the consent manager's allowed domains.`,
    );
  }, LOAD_TIMEOUT_MS);

  if (tagMode === 'static') return;

  const tag = document.createElement('script');
  tag.setAttribute('src', lib.scriptSrc(bundleId));
  lib.tagAttributes(settings).forEach(([name, value]) => {
    tag.setAttribute(name, value);
  });
  tag.addEventListener('error', () => {
    finish(
      'failed',
      'The airgap.js script did not load. Check the bundle ID and your network.',
    );
  });
  document.head.appendChild(tag);
})();

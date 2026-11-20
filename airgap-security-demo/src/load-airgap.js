/**
 * Loads airgap.js synchronously, as the first script that can make requests.
 *
 * Each mode page lists the airgap.js options in an HTML comment above this
 * script. MODE_ATTRIBUTES below must stay in sync. AIRGAP_DEMO_LOAD.tag shows
 * the exact tag that was written for the mode.
 *
 * It uses document.write because airgap.js must run before any other script.
 * A synchronous script tag is the supported way to load it. This loader only
 * adds the bundle ID from config.js, so the HTML pages need no edit.
 */
(function () {
  const MODE_ATTRIBUTES = {
    'report-only': [
      { name: 'data-report-only', value: 'on' },
      { name: 'data-monitoring', value: 'export' },
    ],
    block: [{ name: 'data-csp', value: 'allow-known-hosts allow-subdomains' }],
    navigation: [
      { name: 'data-csp', value: 'allow-known-hosts allow-subdomains' },
      { name: 'data-regulate-navigation', value: 'on' },
    ],
  };

  /**
   * @param pathname
   */
  function modeFromPathname(pathname) {
    const match = pathname.match(/\/(report-only|block|navigation)\//);
    return match ? match[1] : null;
  }

  const config = window.AIRGAP_DEMO_CONFIG;
  const mode = modeFromPathname(window.location.pathname);
  const attributes = mode ? MODE_ATTRIBUTES[mode] || [] : [];

  if (!config.HAS_BUNDLE_ID) {
    window.AIRGAP_DEMO_LOAD = {
      status: 'missing-bundle-id',
      mode,
      attributes,
    };
    return;
  }

  if (!mode) {
    window.AIRGAP_DEMO_LOAD = {
      status: 'unknown-mode',
      attributes,
    };
    return;
  }

  const src = `${config.CDN_ORIGIN}/cm/${config.BUNDLE_ID}/airgap.js`;
  const tag =
    `<script src="${src}"${attributes
      .map((a) => ` ${a.name}="${a.value}"`)
      .join('')}></` + 'script>';

  window.AIRGAP_DEMO_LOAD = {
    status: 'requested',
    mode,
    src,
    tag,
    attributes,
  };
  document.write(tag);
})();

/**
 * Preset links. Each preset is a set of query parameters plus the attacks to
 * try. Every parameter goes through the same allowlist as a hand-typed link.
 * `run` is the list of attack IDs for the `#run=` link fragment.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AirgapPlayground = root.AirgapPlayground || {};
    root.AirgapPlayground.presets = api;
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const PRESETS = [
    {
      id: 'checkout-skimmer',
      title: 'Checkout skimmer',
      why: 'A script on the payment page sends the card out three ways.',
      query: 'nav=on&recipes=block-card-and-tokens',
      run: ['fetch', 'beacon', 'location', 'approved-card-post'],
    },
    {
      id: 'internal-app-inventory',
      title: 'Internal app inventory',
      why: 'Report-only mode. Nothing is blocked. Airgap lists every host the page contacts.',
      query: 'reportOnly=on',
      run: ['pixel', 'fetch', 'xhr', 'analytics-store'],
    },
    {
      id: 'health-data-ad-pixel',
      title: 'Health data in ad pixel URLs',
      why: 'An ad pixel carries a health condition in its URL. The custom override blocks it.',
      query: 'recipes=custom&consent=Advertising',
      run: ['ad-pixel-health'],
    },
    {
      id: 'minors',
      title: 'Minors',
      why: 'The visitor is a child. Ad requests are blocked even after consent.',
      query: 'recipes=block-ads-for-minors&consent=Advertising,SaleOfInfo',
      run: ['ad-pixel'],
    },
    {
      id: 'phishing-redirect',
      title: 'Phishing redirect',
      why: 'A script sends the visitor to a lookalike site. A CSP has no rule for navigation.',
      query: 'nav=on&recipes=strip-personal-data-from-links',
      run: ['location', 'link-click', 'window-open', 'link-scrub'],
    },
    {
      id: 'user-supplied-images',
      title: 'User-supplied images',
      why: 'Images from other hosts load, without the store cookies.',
      query: 'recipes=omit-credentials-images',
      run: ['user-image'],
    },
  ];

  return { PRESETS };
});

/**
 * Airgap security demo configuration.
 *
 * To turn on the three Airgap modes, run
 * `node scripts/set-bundle-id.mjs <bundle-id>`. The script writes the ID to
 * BUNDLE_ID below and into the static airgap.js script tag of each mode page.
 * The bundle ID is public by design. It is part of the script URL that every
 * page loads. Do not put API keys or secrets in this file.
 *
 * Find the bundle ID in the Admin Dashboard under
 * Consent Management, Developer Settings. The script URL has this shape:
 * https://transcend-cdn.com/cm/{bundle-id}/airgap.js
 *
 * @param root
 */
(function (root) {
  const PLACEHOLDER = 'REPLACE_WITH_DEMO_BUNDLE_ID';
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const config = {
    /** Consent manager bundle ID. Replace the placeholder. */
    BUNDLE_ID: 'REPLACE_WITH_DEMO_BUNDLE_ID',

    /**
     * Stand-in for an attacker or an unreviewed third party. It is a real
     * static host that needs no server from this repo. It is NOT in
     * transcend.yml, so Airgap treats it as unknown.
     */
    UNAPPROVED_HOST: 'raw.githubusercontent.com',
    UNAPPROVED_PIXEL_URL:
      'https://raw.githubusercontent.com/transcend-io/examples/main/airgap-security-demo/assets/pixel.png',
    UNAPPROVED_FETCH_URL:
      'https://raw.githubusercontent.com/transcend-io/examples/main/LICENSE',
    UNAPPROVED_NAV_URL:
      'https://raw.githubusercontent.com/transcend-io/examples/main/LICENSE',

    /**
     * Approved host for the last step. It is listed in transcend.yml under
     * Analytics. The demo asks for a static script file and never sends a hit
     * to a collection endpoint.
     */
    ANALYTICS_HOST: 'www.google-analytics.com',
    ANALYTICS_URL: 'https://www.google-analytics.com/analytics.js',

    /**
     * Airgap holds a blocked request and never answers it. After this many
     * milliseconds with no answer, the demo reports the request as blocked.
     */
    STALL_TIMEOUT_MS: 3000,

    /** Pause between steps in the Attack replay, so a recording is readable. */
    REPLAY_PAUSE_MS: 700,
  };

  config.PLACEHOLDER = PLACEHOLDER;
  config.HAS_BUNDLE_ID =
    config.BUNDLE_ID !== PLACEHOLDER && UUID_PATTERN.test(config.BUNDLE_ID);

  root.AIRGAP_DEMO_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  }
})(typeof window !== 'undefined' ? window : globalThis);

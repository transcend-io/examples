/**
 * Shared page template. Each mode page has an empty <div id="app"> and this
 * file fills it, so the four pages show the same layout.
 */
(function () {
  const MODES = {
    off: {
      title: 'Mode: off',
      lede: 'No airgap.js on the page. Every scenario succeeds. This is the "before" picture.',
    },
    'report-only': {
      title: 'Mode: report-only',
      lede: 'airgap.js runs but blocks nothing. The panel lists what airgap.export() saw.',
    },
    block: {
      title: 'Mode: block',
      lede: 'Unknown Request Policy is Block, with the generated Content Security Policy (CSP). Unknown hosts are blocked.',
    },
    navigation: {
      title: 'Mode: block plus navigation control',
      lede: 'Same as block, with navigation control on. Navigations to unknown hosts are blocked too.',
    },
  };
  const ORDER = ['off', 'report-only', 'block', 'navigation'];

  const mode = document.body.getAttribute('data-mode');
  const copy = MODES[mode];

  const nav = ORDER.map((name) => {
    const current = name === mode ? ' aria-current="page"' : '';
    return `<a href="../${name}/"${current}>${name}</a>`;
  }).join('');

  document.getElementById('app').innerHTML =
    '<header><p class="muted">Transcend Airgap security demo</p>' +
    `<h1>${copy.title}</h1><p>${copy.lede}</p>` +
    `<nav aria-label="Modes">${nav}</nav></header>` +
    '<div id="status" class="status" role="status"></div>' +
    '<section><h2>Script tag on this page</h2><pre><code id="script-tag"></code></pre></section>' +
    '<section><h2>Scenarios</h2>' +
    '<form id="demo-form" onsubmit="return false"><label>Email ' +
    '<input name="email" value="visitor@example.com"></label>' +
    '<label>Card last four <input name="card" value="4242"></label></form>' +
    '<div class="buttons">' +
    '<button data-scenario="pixel">1. Load a pixel from an unapproved host</button>' +
    '<button data-scenario="fetch">2. fetch to an unapproved host from an injected script</button>' +
    '<button data-scenario="navigate">3. Set location to an unapproved host with form data</button>' +
    '<button data-scenario="approved">4. Call an approved host</button>' +
    '<button id="run-all" class="secondary">Run all</button>' +
    '<button id="clear-log" class="secondary">Clear log</button></div>' +
    '<iframe id="nav-frame" title="Navigation test frame" src="about:blank"></iframe></section>' +
    '<section><h2>Result log</h2><table><thead><tr><th>Time</th><th>Scenario</th>' +
    '<th>Host</th><th>Result</th><th>Detail</th></tr></thead>' +
    '<tbody id="log-body"></tbody></table>' +
    '<p id="log-empty" class="muted">No results yet. Click a scenario.</p></section>' +
    '<section><h2>What airgap.export() saw</h2>' +
    '<h3>Sent requests</h3><ul id="sent-requests"></ul>' +
    '<h3>Held requests</h3><ul id="held-requests"></ul>' +
    '<button id="refresh-panel" class="secondary">Refresh</button></section>';
})();

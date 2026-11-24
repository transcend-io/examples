/**
 * Page layout shared by the four mode pages. Each page has <div id="app"> and
 * this file fills it, so the four pages show the same layout. The step cards
 * are added by scenarios.js.
 */
(function () {
  const MODES = {
    off: {
      title: 'Mode: off',
      lede: 'No airgap.js on the page. Every step succeeds. This is take one: the night without Airgap.',
    },
    'report-only': {
      title: 'Mode: report-only',
      lede: 'airgap.js runs but blocks nothing. The panel lists what airgap.export() saw.',
    },
    block: {
      title: 'Mode: block',
      lede: 'Unknown Request Policy is Block, with the generated Content Security Policy (CSP). This is take two: the same night with one script tag.',
    },
    navigation: {
      title: 'Mode: block plus navigation control',
      lede: 'Same as block, with navigation control on. Navigations to unknown hosts are cancelled too.',
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
    '<section><h2>Attack replay</h2>' +
    '<p class="muted">Runs the five steps in order and writes one timeline.</p>' +
    '<div class="buttons">' +
    '<button id="replay">Attack replay</button>' +
    '<button id="clear-log" class="secondary">Clear log and timeline</button></div>' +
    '<ol id="timeline" class="timeline"></ol>' +
    '<p id="timeline-empty" class="muted">No replay yet. Click Attack replay.</p></section>' +
    '<section><h2>The night, step by step</h2>' +
    '<p class="muted">Each step has its own button and its own link, for example ' +
    '<code>#step=fetch</code>. Add <code>&amp;run=on</code> to run it on load.</p>' +
    '<form id="demo-form" onsubmit="return false">' +
    '<label>Email <input name="email" value="visitor@example.com"></label>' +
    '<label>Card number <input name="card" value="4242 4242 4242 4242"></label>' +
    '<label>Expiry <input name="expiry" value="12/30"></label>' +
    '<label>Security code <input name="cvc" value="123"></label></form>' +
    '<p class="muted">These are fake test values. Nothing here is a real card.</p>' +
    '<div id="steps" class="steps"></div>' +
    '<iframe id="nav-frame" title="Navigation test frame" src="about:blank"></iframe></section>' +
    '<section><h2>Result log</h2><table><thead><tr><th>Time</th><th>Step</th>' +
    '<th>Host</th><th>Result</th><th>Detail</th></tr></thead>' +
    '<tbody id="log-body"></tbody></table>' +
    '<p id="log-empty" class="muted">No results yet. Click a step.</p></section>' +
    '<section><h2>What airgap.export() saw</h2>' +
    '<h3>Sent requests</h3><ul id="sent-requests"></ul>' +
    '<h3>Held requests</h3><ul id="held-requests"></ul>' +
    '<button id="refresh-panel" class="secondary">Refresh</button></section>';
})();

/**
 * Loads airgap.js synchronously, as the first script that can make requests.
 *
 * Put this tag in <head> and list the airgap.js options as data-* attributes
 * on it. This file copies every data-* attribute onto the real airgap.js tag,
 * so the page source shows the exact options for the mode.
 *
 * It uses document.write because airgap.js must run before any other script.
 * A synchronous script tag is the supported way to load it. This loader only
 * adds the bundle ID from config.js, so the HTML pages need no edit.
 */
(function () {
  function escapeHtmlAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  const loader = document.currentScript;
  const config = window.AIRGAP_DEMO_CONFIG;
  const attributes = [];

  for (let i = 0; i < loader.attributes.length; i += 1) {
    const attribute = loader.attributes[i];
    if (attribute.name.indexOf('data-') === 0) {
      attributes.push({ name: attribute.name, value: attribute.value });
    }
  }

  if (!config.HAS_BUNDLE_ID) {
    window.AIRGAP_DEMO_LOAD = {
      status: 'missing-bundle-id',
      attributes,
    };
    return;
  }

  const src = escapeHtmlAttribute(
    `${config.CDN_ORIGIN}/cm/${config.BUNDLE_ID}/airgap.js`,
  );
  const tag =
    `<script src="${src}"${attributes
      .map((a) => ` ${a.name}="${escapeHtmlAttribute(a.value)}"`)
      .join('')}></` + 'script>';

  window.AIRGAP_DEMO_LOAD = {
    status: 'requested',
    src,
    tag,
    attributes,
  };
  document.write(tag);
})();

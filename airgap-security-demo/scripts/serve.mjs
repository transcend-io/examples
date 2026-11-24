// Tiny static file server for local runs and the Playwright test.
// Serves the airgap-security-demo folder at the root path.
//
// Optional: `node scripts/serve.mjs --inject` (or AIRGAP_INJECT=1) writes the
// airgap.js tag into playground/index.html on the server, from the same
// validated settings the browser would use. The page then has a static tag, as
// the four mode pages do. Use it if a tag that the page inserts dynamically
// behaves differently from a static one.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const inject =
  process.argv.includes('--inject') || process.env.AIRGAP_INJECT === '1';
const require = createRequire(import.meta.url);
const settingsLib = require(join(root, 'playground', 'settings.js'));
const demoConfig = require(join(root, 'src', 'config.js'));

/**
 * Write the airgap.js tag into the playground page for this request.
 *
 * @param {string} html The page source.
 * @param {string} search The request query string.
 * @returns {string} The page with a static tag, or the page unchanged.
 */
function injectTag(html, search) {
  const { settings } = settingsLib.parseSettings(search);
  const bundleId =
    settings.bundle || (demoConfig.HAS_BUNDLE_ID ? demoConfig.BUNDLE_ID : '');
  if (settings.airgap === 'off' || !bundleId) return html;
  // bootstrap.js sets the pre-init config. The tag goes after it.
  return html
    .replace('content="dynamic"', 'content="static"')
    .replace('<!-- AIRGAP_TAG -->', settingsLib.tagHtml(settings, bundleId));
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

createServer((request, response) => {
  let pathname;
  let search = '';
  try {
    // Start from a fixed path so a target like "//" cannot become a host.
    const parsed = new URL(
      `http://localhost${request.url.replace(/^\/+/, '/')}`,
    );
    pathname = decodeURIComponent(parsed.pathname);
    search = parsed.search;
  } catch (error) {
    response.writeHead(400).end('Bad request');
    return;
  }
  let file = normalize(join(root, pathname));
  if (!file.startsWith(`${root}/`) && file !== root) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (!existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  const type = types[extname(file)] || 'application/octet-stream';
  if (inject && file === join(root, 'playground', 'index.html')) {
    response
      .writeHead(200, { 'content-type': type })
      .end(injectTag(readFileSync(file, 'utf8'), search));
    return;
  }
  response.writeHead(200, { 'content-type': type });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Airgap security demo: http://localhost:${port}/`);
});

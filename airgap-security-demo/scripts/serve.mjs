// Tiny static file server for local runs and the Playwright test.
// Serves the airgap-security-demo folder at the root path.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, 'http://x').pathname,
  );
  let file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, 'index.html');
  response.writeHead(200, {
    'content-type': types[extname(file)] || 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Airgap security demo: http://localhost:${port}/`);
});

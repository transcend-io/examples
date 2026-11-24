// Sets the consent manager bundle ID for the demo.
//
// Usage:
//   node scripts/set-bundle-id.mjs <bundle-id>
//   node scripts/set-bundle-id.mjs --reset
//
// With a bundle ID, the script writes it to BUNDLE_ID in src/config.js and into
// the static airgap.js script tag of each Airgap mode page (report-only, block,
// navigation). The off page has no Airgap tag. The script is safe to run again.
// The bundle ID is public by design. It is part of every page's script URL.
// Never put API keys in this repo.
//
// With --reset, the script puts the placeholder back (the state that is
// committed in git).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLACEHOLDER = 'REPLACE_WITH_DEMO_BUNDLE_ID';
const TAG_TOKEN = 'BUNDLE_ID';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGES = ['report-only', 'block', 'navigation'];
const TAG_PATTERN = /(transcend-cdn\.com\/cm\/)[^/"'\s]+(\/airgap\.js)/g;
const CONFIG_PATTERN = /(BUNDLE_ID:\s*')[^']*(')/;

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const bundleId = args.find((arg) => !arg.startsWith('--'));

if (!reset && !bundleId) {
  console.error(
    'Usage: node scripts/set-bundle-id.mjs <bundle-id>\n' +
      '       node scripts/set-bundle-id.mjs --reset',
  );
  process.exit(1);
}
if (!reset && !UUID_PATTERN.test(bundleId)) {
  console.error(
    `"${bundleId}" does not look like a bundle ID. Expected a UUID such as ` +
      'the one in the airgap.js URL: https://transcend-cdn.com/cm/<bundle-id>/airgap.js',
  );
  process.exit(1);
}

const configValue = reset ? PLACEHOLDER : bundleId;
const tagValue = reset ? TAG_TOKEN : bundleId;

/**
 * @param {string} file
 * @param {RegExp} pattern
 * @param {string} value
 * @param {string} label
 */
function rewrite(file, pattern, value, label) {
  const before = readFileSync(file, 'utf8');
  pattern.lastIndex = 0;
  if (!pattern.test(before)) {
    console.error(`Could not find ${label} in ${file}.`);
    process.exit(1);
  }
  pattern.lastIndex = 0;
  const after = before.replace(pattern, `$1${value}$2`);
  if (after !== before) writeFileSync(file, after);
  console.log(
    `${file.replace(`${root}/`, '')}: ${
      after === before ? 'unchanged' : 'updated'
    }`,
  );
}

rewrite(
  join(root, 'src', 'config.js'),
  CONFIG_PATTERN,
  configValue,
  'BUNDLE_ID',
);
for (const page of PAGES) {
  rewrite(
    join(root, page, 'index.html'),
    TAG_PATTERN,
    tagValue,
    'the airgap.js script tag',
  );
}

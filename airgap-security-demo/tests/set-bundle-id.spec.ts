import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const PAGES = ['report-only', 'block', 'navigation'];

/**
 * Copy the demo folder to a temp dir, so the test never edits the real pages.
 */
function copyDemo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'airgap-demo-'));
  ['src', 'scripts', ...PAGES].forEach((name) => {
    cpSync(join(__dirname, '..', name), join(dir, name), { recursive: true });
  });
  return dir;
}

/**
 * @param dir
 * @param args
 */
function run(
  dir: string,
  args: string[],
): { status: number | null; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [join(dir, 'scripts', 'set-bundle-id.mjs'), ...args],
    { cwd: dir, encoding: 'utf8' },
  );
  return { status: result.status, stderr: result.stderr };
}

test.describe('set-bundle-id script', () => {
  test('writes the ID to config.js and every Airgap page, then resets', () => {
    const dir = copyDemo();
    const id = crypto.randomUUID();
    expect(run(dir, [id]).status).toBe(0);
    expect(readFileSync(join(dir, 'src', 'config.js'), 'utf8')).toContain(
      `BUNDLE_ID: '${id}'`,
    );
    PAGES.forEach((page) => {
      expect(readFileSync(join(dir, page, 'index.html'), 'utf8')).toContain(
        `transcend-cdn.com/cm/${id}/airgap.js`,
      );
    });
    // Running it again with the same ID changes nothing.
    expect(run(dir, [id]).status).toBe(0);

    expect(run(dir, ['--reset']).status).toBe(0);
    expect(readFileSync(join(dir, 'src', 'config.js'), 'utf8')).toContain(
      "BUNDLE_ID: 'REPLACE_WITH_DEMO_BUNDLE_ID'",
    );
    PAGES.forEach((page) => {
      expect(readFileSync(join(dir, page, 'index.html'), 'utf8')).toContain(
        'transcend-cdn.com/cm/BUNDLE_ID/airgap.js',
      );
    });
  });

  test('rejects a value that is not a UUID and a missing argument', () => {
    const dir = copyDemo();
    const bad = run(dir, ['not-a-bundle-id']);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('does not look like a bundle ID');
    expect(run(dir, []).status).toBe(1);
    expect(readFileSync(join(dir, 'src', 'config.js'), 'utf8')).toContain(
      "BUNDLE_ID: 'REPLACE_WITH_DEMO_BUNDLE_ID'",
    );
  });
});

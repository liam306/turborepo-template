import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SCRIPT_PATH = path.join(ROOT_DIR, 'scripts/check-codebase-rules.mjs');

test('CLI runs and outputs valid JSON with --format json', () => {
  let stdout;
  try {
    stdout = execFileSync('node', [SCRIPT_PATH, '--format', 'json'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
  } catch (err) {
    stdout = err.stdout;
  }

  const parsed = JSON.parse(stdout);
  assert.ok(typeof parsed.errors === 'number');
  assert.ok(typeof parsed.warnings === 'number');
  assert.ok(typeof parsed.filesScanned === 'number');
  assert.ok(Array.isArray(parsed.diagnostics));
});

test('CLI exits with code 1 for invalid arguments', () => {
  assert.throws(
    () => {
      execFileSync('node', [SCRIPT_PATH, '--format', 'invalid'], {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    },
    (err) => err.status === 1,
  );
});

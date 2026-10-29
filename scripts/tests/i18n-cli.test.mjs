import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function fixture(run) {
  // Keep fixture below root so the CLI can resolve its TypeScript dependency.
  const dir = fs.mkdtempSync(path.join(root, '.i18n-audit-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts/lib'), { recursive: true });
    fs.copyFileSync(
      path.join(root, 'scripts/check-i18n.mjs'),
      path.join(dir, 'scripts/check-i18n.mjs'),
    );
    for (const name of [
      'source-audit.mjs',
      'translation-usage.mjs',
      'translation-project.mjs',
    ])
      fs.copyFileSync(
        path.join(root, 'scripts/lib', name),
        path.join(dir, 'scripts/lib', name),
      );
    fs.copyFileSync(
      path.join(root, 'scripts/check-hardcoded-text.mjs'),
      path.join(dir, 'scripts/check-hardcoded-text.mjs'),
    );
    fs.copyFileSync(
      path.join(root, 'scripts/lib/hardcoded-text.mjs'),
      path.join(dir, 'scripts/lib/hardcoded-text.mjs'),
    );
    fs.mkdirSync(path.join(dir, 'apps/web/messages'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'apps/web/src'), { recursive: true });
    const write = (name, value) =>
      fs.writeFileSync(path.join(dir, name), value);
    const execute = () =>
      spawnSync(
        process.execPath,
        [path.join(dir, 'scripts/check-i18n.mjs'), 'web'],
        { encoding: 'utf8' },
      );
    const hardcoded = (...args) =>
      spawnSync(
        process.execPath,
        [
          path.join(dir, 'scripts/check-hardcoded-text.mjs'),
          '--app',
          'web',
          ...args,
        ],
        { encoding: 'utf8' },
      );
    run({ write, execute, hardcoded });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('missing locales fail even when both missing', () =>
  fixture(({ execute }) => {
    const result = execute();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing or empty locale input/);
  }));

test('invalid JSON fails even when both locales invalid', () =>
  fixture(({ write, execute }) => {
    write('apps/web/messages/en.json', '{');
    write('apps/web/messages/vi.json', '{');
    assert.equal(execute().status, 1);
  }));

test('duplicates, locale mismatch and missing code keys fail', () =>
  fixture(({ write, execute }) => {
    write(
      'apps/web/messages/en.json',
      '{"auth":{"login":"Login","login":"Login","extra":"Extra"}}',
    );
    write('apps/web/messages/vi.json', '{"auth":{"login":"Đăng nhập"}}');
    write(
      'apps/web/src/page.tsx',
      "const t = useTranslations('auth'); t.rich('missing');",
    );
    const result = execute();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Duplicate Keys Found/);
    assert.match(result.stdout, /Locale Mismatch/);
    assert.match(result.stdout, /auth.missing/);
  }));

test('valid locales and scoped calls pass', () =>
  fixture(({ write, execute }) => {
    write('apps/web/messages/en.json', '{"auth":{"login":"Login"}}');
    write('apps/web/messages/vi.json', '{"auth":{"login":"Đăng nhập"}}');
    write(
      'apps/web/src/page.tsx',
      "const t = useTranslations('auth'); t('login');",
    );
    assert.equal(execute().status, 0);
  }));

test('escaped JSON keys count as duplicates after decoding', () =>
  fixture(({ write, execute }) => {
    write('apps/web/messages/en.json', '{"save":"Save","\\u0073ave":"Save"}');
    write('apps/web/messages/vi.json', '{"save":"Lưu"}');
    const result = execute();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Duplicate Keys Found/);
  }));

test('hardcoded CLI JSON and strict exit codes', () =>
  fixture(({ write, hardcoded }) => {
    write('apps/web/src/page.tsx', "const options = { label: 'Settings' };");
    const warning = hardcoded('--format', 'json');
    assert.equal(warning.status, 0);
    assert.equal(JSON.parse(warning.stdout).warnings, 1);
    assert.equal(hardcoded('--strict').status, 1);
    write('apps/web/src/page.tsx', 'const view = <Button>Save</Button>;');
    const error = hardcoded('--format=json');
    assert.equal(error.status, 1);
    assert.equal(JSON.parse(error.stdout).errors, 1);
    assert.equal(hardcoded('--app', 'bad').status, 1);
  }));

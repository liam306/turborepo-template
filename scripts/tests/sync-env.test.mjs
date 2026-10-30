import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SYNC_ENV_SCRIPT = path.join(ROOT_DIR, 'scripts/sync-env.mjs');

test('sync-env CLI parses precedence, quoted values, and isolates secrets in fixture workspace', () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'sync-env-test-'));

  try {
    // Scaffold minimal monorepo fixture
    mkdirSync(path.join(tmpDir, 'apps/api'), { recursive: true });
    mkdirSync(path.join(tmpDir, 'apps/web'), { recursive: true });
    mkdirSync(path.join(tmpDir, 'apps/mobile'), { recursive: true });

    // 1. Create root .env.example with defaults
    const rootExampleContent = `
PORT=4000
WEB_PORT=3000
DATABASE_URL=postgresql://default_user:default_pass@localhost:5432/default_db
JWT_SECRET=super_secret_jwt_key
POSTGRES_PASSWORD=default_pass
NEXT_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_API_URL=http://localhost:4000
`;
    writeFileSync(path.join(tmpDir, '.env.example'), rootExampleContent.trim());

    // 2. Create root .env.staging with custom overrides and quotes
    const stagingContent = `
PORT=4001
WEB_PORT=3001
DATABASE_URL="postgresql://staging_user:staging_pass@db.example.com:5433/staging_db"
JWT_SECRET='staging_isolated_secret'
`;
    writeFileSync(path.join(tmpDir, '.env.staging'), stagingContent.trim());

    // 3. Create app .env.example files defining which keys each app accepts
    writeFileSync(
      path.join(tmpDir, 'apps/api/.env.example'),
      'PORT=\nDATABASE_URL=\nJWT_SECRET=\nPOSTGRES_USER=\nPOSTGRES_PASSWORD=\nPOSTGRES_DB=\nPOSTGRES_PORT=\n',
    );
    writeFileSync(
      path.join(tmpDir, 'apps/web/.env.example'),
      'WEB_PORT=\nNEXT_PUBLIC_API_URL=\n',
    );
    writeFileSync(
      path.join(tmpDir, 'apps/mobile/.env.example'),
      'EXPO_PUBLIC_API_URL=\n',
    );

    // 4. Run sync-env with -e staging
    execFileSync('node', [SYNC_ENV_SCRIPT, '-e', 'staging'], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    // 5. Verify apps/api/.env.staging receives staging DB params and secret
    assert.ok(existsSync(path.join(tmpDir, 'apps/api/.env.staging')));
    const apiEnv = readFileSync(
      path.join(tmpDir, 'apps/api/.env.staging'),
      'utf8',
    );
    assert.match(apiEnv, /PORT=4001/);
    assert.match(apiEnv, /POSTGRES_USER=staging_user/);
    assert.match(apiEnv, /POSTGRES_PASSWORD=staging_pass/);
    assert.match(apiEnv, /POSTGRES_DB=staging_db/);
    assert.match(apiEnv, /POSTGRES_PORT=5433/);
    assert.match(apiEnv, /JWT_SECRET=staging_isolated_secret/);

    // 6. Verify apps/web/.env.staging receives mapped public URL and web port
    assert.ok(existsSync(path.join(tmpDir, 'apps/web/.env.staging')));
    const webEnv = readFileSync(
      path.join(tmpDir, 'apps/web/.env.staging'),
      'utf8',
    );
    assert.match(webEnv, /WEB_PORT=3001/);
    assert.match(webEnv, /NEXT_PUBLIC_API_URL=/);

    // 7. Verify apps/mobile/.env.staging does NOT leak database passwords or JWT secret
    assert.ok(existsSync(path.join(tmpDir, 'apps/mobile/.env.staging')));
    const mobileEnv = readFileSync(
      path.join(tmpDir, 'apps/mobile/.env.staging'),
      'utf8',
    );
    assert.match(mobileEnv, /EXPO_PUBLIC_API_URL=/);
    assert.doesNotMatch(mobileEnv, /staging_pass/);
    assert.doesNotMatch(mobileEnv, /JWT_SECRET/);

    // 8. Run sync-env with default (no -e) to verify fallback and .env generation
    execFileSync('node', [SYNC_ENV_SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    assert.ok(existsSync(path.join(tmpDir, 'apps/api/.env')));
    const defaultApiEnv = readFileSync(
      path.join(tmpDir, 'apps/api/.env'),
      'utf8',
    );
    assert.match(defaultApiEnv, /PORT=4000/);
    assert.match(defaultApiEnv, /POSTGRES_USER=default_user/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MOBILE_DIR = path.join(ROOT_DIR, 'apps/mobile');

// Scoped exceptions allowed pending next scheduled release upgrade
const ALLOWED_EXCEPTIONS = new Set([
  '@expo/ui',
  'expo',
  'expo-asset',
  'expo-constants',
  'expo-crypto',
  'expo-dev-client',
  'expo-linking',
  'expo-network',
  'expo-router',
  'expo-splash-screen',
  'expo-updates',
]);

function runCheck() {
  console.log('[ExpoCompatibility] Checking Expo SDK dependencies...');

  const result = spawnSync('pnpm', ['exec', 'expo', 'install', '--check'], {
    cwd: MOBILE_DIR,
    encoding: 'utf8',
  });

  const output = (result.stdout || '') + (result.stderr || '');

  if (result.status === 0) {
    console.log(
      '[ExpoCompatibility] All dependencies strictly match Expo SDK recommendation.',
    );
    process.exit(0);
  }

  // Parse lines indicating mismatched packages
  const lines = output.split('\n');
  const mismatches = [];

  for (const line of lines) {
    const match = line.match(
      /^\s*([@a-zA-Z0-9_-]+@[~^]?[0-9.]+)\s+-\s+expected version:\s+([~^]?[0-9.]+)/,
    );
    if (match) {
      const pkgName = match[1].split('@')[match[1].startsWith('@') ? 1 : 0];
      const fullName = match[1].startsWith('@') ? `@${pkgName}` : pkgName;
      mismatches.push({
        package: fullName,
        current: match[1],
        expected: match[2],
        isAllowed: ALLOWED_EXCEPTIONS.has(fullName),
      });
    }
  }

  const unallowed = mismatches.filter((m) => !m.isAllowed);

  if (unallowed.length > 0) {
    console.error(
      '[ExpoCompatibility] Found unapproved Expo dependency version mismatches:',
    );
    for (const m of unallowed) {
      console.error(`  - ${m.current} (expected: ${m.expected})`);
    }
    console.error(
      'Either update package versions with "npx expo install" or document scoped exceptions.',
    );
    process.exit(1);
  }

  if (mismatches.length > 0) {
    console.log(
      `[ExpoCompatibility] Passed with ${mismatches.length} documented scoped exception(s):`,
    );
    for (const m of mismatches) {
      console.log(
        `  - ${m.package} (${m.current} -> expected: ${m.expected}) [SCOPED_EXCEPTION]`,
      );
    }
  }

  process.exit(0);
}

runCheck();

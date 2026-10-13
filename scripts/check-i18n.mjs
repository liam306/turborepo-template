#!/usr/bin/env node

/**
 * i18n Auditor Script for Monorepo Starter
 * Scans apps (api, web, mobile) for:
 * 1. Duplicate keys within JSON files
 * 2. Key mismatches between locales (en vs vi)
 * 3. Missing keys (used in code, missing in JSON)
 * 4. Unused keys (defined in JSON, never referenced in code)
 *
 * Usage:
 *   node scripts/check-i18n.mjs [api|web|mobile] [--strict]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translationUsage } from './lib/translation-usage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Parse command line arguments
const args = process.argv.slice(2);
let targetApp = 'all';
let isStrict = false;
let showAllUnused = false;

for (const arg of args) {
  if (arg === '--strict') {
    isStrict = true;
  } else if (arg === '--all-unused' || arg === '--verbose' || arg === '-v') {
    showAllUnused = true;
  } else if (arg.startsWith('--app=')) {
    targetApp = arg.split('=')[1].toLowerCase();
  } else if (['-a', '--app'].includes(arg)) {
    const nextIdx = args.indexOf(arg) + 1;
    if (args[nextIdx]) targetApp = args[nextIdx].toLowerCase();
  } else if (!arg.startsWith('-')) {
    targetApp = arg.toLowerCase();
  }
}

const VALID_APPS = ['api', 'web', 'mobile', 'all'];
if (!VALID_APPS.includes(targetApp)) {
  console.error(
    `${colors.red}${colors.bold}Error:${colors.reset} Invalid app "${targetApp}". Choose from: ${VALID_APPS.join(', ')}`,
  );
  process.exit(1);
}

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function matchesDynamicPrefix(key, prefix) {
  if (!prefix) return false;
  if (prefix.endsWith('.') || prefix.endsWith('_') || prefix.endsWith('-')) {
    return key.startsWith(prefix);
  }
  return key.startsWith(`${prefix}.`) || key === prefix;
}

function findDuplicateKeys(jsonText) {
  const duplicates = [];
  const stack = [];
  let currentKeys = null;
  let inString = false;
  let isEscaped = false;
  let currentString = '';
  let lastString = null;
  let lastStringLine = 1;
  let line = 1;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    if (ch === '\n') {
      line++;
    }

    if (inString) {
      if (isEscaped) {
        currentString += ch;
        isEscaped = false;
      } else if (ch === '\\') {
        currentString += ch;
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
        try {
          lastString = JSON.parse(`"${currentString}"`);
        } catch {
          lastString = currentString;
        }
      } else {
        currentString += ch;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      isEscaped = false;
      currentString = '';
      lastStringLine = line;
      continue;
    }

    if (ch === '{') {
      currentKeys = new Map();
      stack.push({ type: 'object', keys: currentKeys });
      lastString = null;
    } else if (ch === '[') {
      stack.push({ type: 'array' });
      lastString = null;
    } else if (ch === '}' || ch === ']') {
      stack.pop();
      currentKeys =
        stack.length > 0 && stack[stack.length - 1].type === 'object'
          ? stack[stack.length - 1].keys
          : null;
      lastString = null;
    } else if (ch === ':') {
      if (lastString !== null && currentKeys) {
        if (currentKeys.has(lastString)) {
          duplicates.push({
            key: lastString,
            line: lastStringLine,
            firstLine: currentKeys.get(lastString),
          });
        } else {
          currentKeys.set(lastString, lastStringLine);
        }
      }
      lastString = null;
    }
  }
  return duplicates;
}

function walkSourceFiles(dir, extensions, ignoreDirs = []) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        results.push(...walkSourceFiles(fullPath, extensions, ignoreDirs));
      }
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ----------------------------------------------------------------------------
// App Analyzers
// ----------------------------------------------------------------------------

function checkApp(appName) {
  console.log(
    `\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.cyan}  Checking App: [${appName.toUpperCase()}]${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════════${colors.reset}\n`,
  );

  let jsonFiles = [];
  let enKeys = new Set();
  let viKeys = new Set();
  const duplicateIssues = [];
  let inputErrors = 0;
  const requiredPaths =
    appName === 'api'
      ? ['apps/api/src/i18n/en', 'apps/api/src/i18n/vi']
      : appName === 'web'
        ? ['apps/web/messages/en.json', 'apps/web/messages/vi.json']
        : [
            'apps/mobile/src/locales/en.json',
            'apps/mobile/src/locales/vi.json',
          ];
  for (const required of requiredPaths) {
    const absolute = path.join(ROOT_DIR, required);
    if (
      !fs.existsSync(absolute) ||
      (appName === 'api' &&
        !fs.readdirSync(absolute).some((name) => name.endsWith('.json')))
    ) {
      console.error(`Missing or empty locale input: ${required}`);
      inputErrors++;
    }
  }

  // 1. Collect JSON files & keys
  if (appName === 'api') {
    const apiI18nDir = path.join(ROOT_DIR, 'apps/api/src/i18n');
    const enDir = path.join(apiI18nDir, 'en');
    const viDir = path.join(apiI18nDir, 'vi');

    if (fs.existsSync(enDir)) {
      for (const file of fs
        .readdirSync(enDir)
        .filter((f) => f.endsWith('.json'))) {
        const filePath = path.join(enDir, file);
        jsonFiles.push(filePath);
        const ns = path.basename(file, '.json');
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          for (const k of flattenKeys(content, ns)) enKeys.add(k);
        } catch (e) {
          inputErrors++;
          console.error(
            `${colors.red}JSON syntax error in ${filePath}: ${e.message}${colors.reset}`,
          );
        }
      }
    }

    if (fs.existsSync(viDir)) {
      for (const file of fs
        .readdirSync(viDir)
        .filter((f) => f.endsWith('.json'))) {
        const filePath = path.join(viDir, file);
        jsonFiles.push(filePath);
        const ns = path.basename(file, '.json');
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          for (const k of flattenKeys(content, ns)) viKeys.add(k);
        } catch (e) {
          inputErrors++;
          console.error(
            `${colors.red}JSON syntax error in ${filePath}: ${e.message}${colors.reset}`,
          );
        }
      }
    }
  } else if (appName === 'web') {
    const enPath = path.join(ROOT_DIR, 'apps/web/messages/en.json');
    const viPath = path.join(ROOT_DIR, 'apps/web/messages/vi.json');

    if (fs.existsSync(enPath)) {
      jsonFiles.push(enPath);
      try {
        const content = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        for (const k of flattenKeys(content)) enKeys.add(k);
      } catch (e) {
        inputErrors++;
        console.error(
          `${colors.red}JSON syntax error in ${enPath}: ${e.message}${colors.reset}`,
        );
      }
    }
    if (fs.existsSync(viPath)) {
      jsonFiles.push(viPath);
      try {
        const content = JSON.parse(fs.readFileSync(viPath, 'utf8'));
        for (const k of flattenKeys(content)) viKeys.add(k);
      } catch (e) {
        inputErrors++;
        console.error(
          `${colors.red}JSON syntax error in ${viPath}: ${e.message}${colors.reset}`,
        );
      }
    }
  } else if (appName === 'mobile') {
    const enPath = path.join(ROOT_DIR, 'apps/mobile/src/locales/en.json');
    const viPath = path.join(ROOT_DIR, 'apps/mobile/src/locales/vi.json');

    if (fs.existsSync(enPath)) {
      jsonFiles.push(enPath);
      try {
        const content = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        for (const k of flattenKeys(content)) enKeys.add(k);
      } catch (e) {
        inputErrors++;
        console.error(
          `${colors.red}JSON syntax error in ${enPath}: ${e.message}${colors.reset}`,
        );
      }
    }
    if (fs.existsSync(viPath)) {
      jsonFiles.push(viPath);
      try {
        const content = JSON.parse(fs.readFileSync(viPath, 'utf8'));
        for (const k of flattenKeys(content)) viKeys.add(k);
      } catch (e) {
        inputErrors++;
        console.error(
          `${colors.red}JSON syntax error in ${viPath}: ${e.message}${colors.reset}`,
        );
      }
    }
  }

  // Check duplicate keys within each JSON file
  for (const filePath of jsonFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    const dups = findDuplicateKeys(text);
    for (const d of dups) {
      duplicateIssues.push({
        file: path.relative(ROOT_DIR, filePath),
        key: d.key,
        line: d.line,
        firstLine: d.firstLine,
      });
    }
  }

  // 2. Locale Parity: Compare en vs vi
  const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
  const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
  const allJsonKeys = new Set([...enKeys, ...viKeys]);

  // 3. Scan source code for used keys
  let srcDir = '';
  let ignoreDirs = [
    'node_modules',
    '.next',
    '.expo',
    'dist',
    'build',
    'i18n',
    'locales',
    'messages',
  ];
  if (appName === 'api') srcDir = path.join(ROOT_DIR, 'apps/api/src');
  if (appName === 'web') srcDir = path.join(ROOT_DIR, 'apps/web/src');
  if (appName === 'mobile') srcDir = path.join(ROOT_DIR, 'apps/mobile/src');

  const sourceFiles = walkSourceFiles(
    srcDir,
    ['.ts', '.tsx', '.js', '.jsx'],
    ignoreDirs,
  );

  // Shared packages contain shared helpers and constants used by apps
  const sharedPackageDirs = [
    path.join(ROOT_DIR, 'packages/core/src'),
    path.join(ROOT_DIR, 'packages/database/src'),
    path.join(ROOT_DIR, 'packages/types/src'),
    path.join(ROOT_DIR, 'packages/utils/src'),
  ];
  if (appName === 'web' || appName === 'mobile') {
    for (const pkgDir of sharedPackageDirs) {
      sourceFiles.push(
        ...walkSourceFiles(pkgDir, ['.ts', '.tsx', '.js', '.jsx'], ignoreDirs),
      );
    }
  }

  const codeOccurrences = []; // { key, file, line }
  const dynamicPrefixes = new Set();
  let unresolvedCalls = 0;
  let fullConcatenatedCode = '';

  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    fullConcatenatedCode += '\n' + content;
    const relPath = path.relative(ROOT_DIR, filePath);
    const usage = translationUsage(filePath, content, appName);
    codeOccurrences.push(
      ...usage.occurrences.map((item) => ({ ...item, file: relPath })),
    );
    for (const prefix of usage.dynamicPrefixes) dynamicPrefixes.add(prefix);
    unresolvedCalls += usage.unresolved.length;
  }

  // Filter missing keys: keys invoked in code that don't exist in allJsonKeys
  const missingKeysMap = new Map(); // key -> [{ file, line }]
  for (const { key, file, line } of codeOccurrences) {
    if (!allJsonKeys.has(key)) {
      if (!missingKeysMap.has(key)) missingKeysMap.set(key, []);
      missingKeysMap.get(key).push({ file, line });
    }
  }

  // Filter unused keys: keys in allJsonKeys never found in code
  const unusedKeys = [];
  const usedKeySet = new Set(codeOccurrences.map((c) => c.key));

  for (const key of allJsonKeys) {
    if (usedKeySet.has(key)) continue;

    // Check if key matches a detected dynamic prefix
    let isCoveredByDynamic = false;
    for (const prefix of dynamicPrefixes) {
      if (matchesDynamicPrefix(key, prefix)) {
        isCoveredByDynamic = true;
        break;
      }
    }
    if (isCoveredByDynamic) continue;

    // Check if full key literal appears in code
    if (fullConcatenatedCode.includes(key)) continue;

    // Check if leaf segment appears in code (for scoped translations or property access)
    const leaf = key.split('.').pop();
    if (leaf && leaf.length > 2 && fullConcatenatedCode.includes(`'${leaf}'`))
      continue;
    if (leaf && leaf.length > 2 && fullConcatenatedCode.includes(`"${leaf}"`))
      continue;
    if (leaf && leaf.length > 2 && fullConcatenatedCode.includes(`\`${leaf}\``))
      continue;
    if (leaf && leaf.length > 2 && fullConcatenatedCode.includes(`.${leaf}`))
      continue;

    unusedKeys.push(key);
  }

  // ----------------------------------------------------------------------------
  // Hardcoded Strings / Fallbacks Check
  // ----------------------------------------------------------------------------
  const hardcodedIssues = [];
  if (appName === 'api') {
    for (const filePath of sourceFiles) {
      if (
        filePath.includes('.spec.') ||
        filePath.includes('/test/') ||
        filePath.includes('/scripts/') ||
        filePath.includes('/data/') ||
        filePath.includes('seed.ts')
      ) {
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(ROOT_DIR, filePath);

      // Check for hardcoded exception messages: throw new BadRequestException('Literal text')
      const excRegex =
        /throw\s+new\s+(BadRequestException|NotFoundException|ForbiddenException|ConflictException|UnauthorizedException)\(\s*(['"`][A-Za-z0-9\s.,!?:;'-]{5,}['"`])\s*\)/g;
      let excMatch;
      while ((excMatch = excRegex.exec(content)) !== null) {
        const lineNum = content.slice(0, excMatch.index).split('\n').length;
        hardcodedIssues.push({
          type: 'Hardcoded exception literal',
          file: relPath,
          line: lineNum,
          snippet: excMatch[0],
        });
      }

      // Check for defaultValue in i18n translation calls
      const defRegex =
        /(?:this\.)?(?:[a-zA-Z0-9_$]*i18n[a-zA-Z0-9_$]*)\??\.(?:t|translate)\([^)]*defaultValue:\s*['"`]/g;
      let defMatch;
      while ((defMatch = defRegex.exec(content)) !== null) {
        const lineNum = content.slice(0, defMatch.index).split('\n').length;
        hardcodedIssues.push({
          type: 'Hardcoded defaultValue fallback in translation',
          file: relPath,
          line: lineNum,
          snippet: defMatch[0],
        });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Reporting
  // ----------------------------------------------------------------------------
  let hasErrors = inputErrors > 0;
  if (unresolvedCalls)
    console.log(
      `Warning: ${unresolvedCalls} dynamic translation calls require manual review.`,
    );

  // 1. Duplicate Keys Report
  if (duplicateIssues.length > 0) {
    hasErrors = true;
    console.log(
      `${colors.red}${colors.bold}✖ Duplicate Keys Found (${duplicateIssues.length}):${colors.reset}`,
    );
    for (const item of duplicateIssues) {
      console.log(
        `  ${colors.red}•${colors.reset} ${colors.bold}"${item.key}"${colors.reset} in ${colors.yellow}${item.file}:${item.line}${colors.reset} (first declared at line ${item.firstLine})`,
      );
    }
    console.log();
  } else {
    console.log(
      `${colors.green}✔ No duplicate keys in JSON files.${colors.reset}`,
    );
  }

  // 2. Locale Parity Report
  if (missingInVi.length > 0 || missingInEn.length > 0) {
    hasErrors = true;
    console.log(
      `${colors.red}${colors.bold}✖ Locale Mismatch (en vs vi):${colors.reset}`,
    );
    if (missingInVi.length > 0) {
      console.log(
        `  ${colors.yellow}Missing in vi.json (${missingInVi.length}):${colors.reset}`,
      );
      for (const k of missingInVi.slice(0, 15)) {
        console.log(`    - ${k}`);
      }
      if (missingInVi.length > 15) {
        console.log(
          `    ${colors.gray}... and ${missingInVi.length - 15} more${colors.reset}`,
        );
      }
    }
    if (missingInEn.length > 0) {
      console.log(
        `  ${colors.yellow}Missing in en.json (${missingInEn.length}):${colors.reset}`,
      );
      for (const k of missingInEn.slice(0, 15)) {
        console.log(`    - ${k}`);
      }
      if (missingInEn.length > 15) {
        console.log(
          `    ${colors.gray}... and ${missingInEn.length - 15} more${colors.reset}`,
        );
      }
    }
    console.log();
  } else {
    console.log(
      `${colors.green}✔ All keys in sync between 'en' and 'vi' (${enKeys.size} keys).${colors.reset}`,
    );
  }

  // 3. Missing Keys in Code Report
  if (missingKeysMap.size > 0) {
    hasErrors = true;
    console.log(
      `${colors.red}${colors.bold}✖ Missing Keys in JSON (referenced in code) (${missingKeysMap.size}):${colors.reset}`,
    );
    for (const [key, locs] of missingKeysMap.entries()) {
      const locStr = locs.map((l) => `${l.file}:${l.line}`).join(', ');
      console.log(
        `  ${colors.red}•${colors.reset} "${colors.bold}${key}${colors.reset}" -> used at ${colors.gray}${locStr}${colors.reset}`,
      );
    }
    console.log();
  } else {
    console.log(
      `${colors.green}✔ All keys referenced in code exist in translation files.${colors.reset}`,
    );
  }

  // 4. Unused Keys Report
  if (unusedKeys.length > 0) {
    const label = isStrict
      ? `${colors.red}${colors.bold}✖`
      : `${colors.yellow}${colors.bold}▲`;
    console.log(
      `${label} Potentially Unused Keys (${unusedKeys.length}):${colors.reset}`,
    );
    const displayList = showAllUnused ? unusedKeys : unusedKeys.slice(0, 20);
    for (const k of displayList) {
      console.log(`  ${colors.gray}•${colors.reset} ${k}`);
    }
    if (!showAllUnused && unusedKeys.length > 20) {
      console.log(
        `  ${colors.gray}... and ${unusedKeys.length - 20} more (pass --all-unused to show all)${colors.reset}`,
      );
    }
    console.log();
    if (isStrict) hasErrors = true;
  } else {
    console.log(`${colors.green}✔ No unused keys detected.${colors.reset}`);
  }

  // 5. Hardcoded Literals / Fallbacks Report
  if (hardcodedIssues.length > 0) {
    hasErrors = true;
    console.log(
      `${colors.red}${colors.bold}✖ Hardcoded Strings / Fallbacks Found (${hardcodedIssues.length}):${colors.reset}`,
    );
    for (const item of hardcodedIssues) {
      console.log(
        `  ${colors.red}•${colors.reset} ${item.type} in ${colors.yellow}${item.file}:${item.line}${colors.reset}\n    ${colors.gray}${item.snippet}${colors.reset}`,
      );
    }
    console.log();
  } else if (appName === 'api') {
    console.log(
      `${colors.green}✔ No hardcoded exception literals or translation defaultValue fallbacks detected.${colors.reset}`,
    );
  }

  return {
    appName,
    totalKeys: allJsonKeys.size,
    duplicates: duplicateIssues.length,
    localeMismatches: missingInVi.length + missingInEn.length,
    missingInJson: missingKeysMap.size,
    unusedKeys: unusedKeys.length,
    inputErrors,
    unresolvedCalls,
    hasErrors,
  };
}

// ----------------------------------------------------------------------------
// Main Runner
// ----------------------------------------------------------------------------

console.log(
  `${colors.bold}${colors.blue}🚀 Starting i18n Audit...${colors.reset}`,
);
if (isStrict)
  console.log(
    `${colors.dim}Running in --strict mode (unused keys will cause non-zero exit).${colors.reset}`,
  );

const appsToRun = targetApp === 'all' ? ['api', 'web', 'mobile'] : [targetApp];
const results = [];

for (const app of appsToRun) {
  results.push(checkApp(app));
}

// Summary table
console.log(
  `\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════════${colors.reset}`,
);
console.log(`${colors.bold}  AUDIT SUMMARY${colors.reset}`);
console.log(
  `${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════════${colors.reset}`,
);
console.table(
  results.map((r) => ({
    App: r.appName,
    'Total Keys': r.totalKeys,
    Duplicates: r.duplicates,
    'en/vi Mismatch': r.localeMismatches,
    'Missing in JSON': r.missingInJson,
    Unused: r.unusedKeys,
    'Input Errors': r.inputErrors,
    'Dynamic Calls': r.unresolvedCalls,
    Status: r.hasErrors ? '❌ ISSUES FOUND' : '✅ CLEAN',
  })),
);

const anyFailed = results.some((r) => r.hasErrors);
if (anyFailed) {
  console.log(
    `${colors.red}${colors.bold}Audit completed with issues. Please review and fix the warnings/errors above.${colors.reset}\n`,
  );
  process.exit(1);
} else {
  console.log(
    `${colors.green}${colors.bold}Audit completed successfully! All checked i18n keys are clean.${colors.reset}\n`,
  );
  process.exit(0);
}

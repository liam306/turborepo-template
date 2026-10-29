#!/usr/bin/env node

/**
 * Architecture & Codebase Rules Validator for Monorepo Starter
 *
 * Enforces Core Conventions:
 * 1. Package Import Boundaries (clean architectural layers)
 * 2. Conditional Styling Standards via cn()
 * 3. File Size Limits (< 300 lines guideline) & Documented Exceptions
 * 4. Prohibited Domain Hard Deletes (soft delete standards)
 * 5. DTO Ownership and Server Runtime Validator Boundaries
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCodebase } from './lib/codebase-rules/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const args = process.argv.slice(2);
let isStrict = false;
let format = 'text';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--strict') {
    isStrict = true;
  } else if (arg === '--format' && args[i + 1]) {
    format = args[++i];
  } else if (arg.startsWith('--format=')) {
    format = arg.slice(9);
  } else {
    console.error(`Unknown or invalid argument: ${arg}`);
    console.error(
      'Usage: node scripts/check-codebase-rules.mjs [--format text|json] [--strict]',
    );
    process.exit(1);
  }
}

if (!['text', 'json'].includes(format)) {
  console.error(
    'Usage: node scripts/check-codebase-rules.mjs [--format text|json] [--strict]',
  );
  process.exit(1);
}

const result = auditCodebase(ROOT_DIR);
const { errors, warnings, diagnostics, filesScanned } = result;

if (format === 'json') {
  console.log(
    JSON.stringify(
      {
        errors,
        warnings,
        filesScanned,
        diagnostics: diagnostics.map((d) => ({
          ...d,
          file: path.relative(ROOT_DIR, d.file).replace(/\\/g, '/'),
        })),
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `\n${colors.cyan}${colors.bold}=== Codebase Rules & Architecture Check ===${colors.reset}\n`,
  );

  for (const d of diagnostics) {
    const relFile = path.relative(ROOT_DIR, d.file).replace(/\\/g, '/');
    const color = d.severity === 'error' ? colors.red : colors.yellow;
    const tag = d.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(
      `  ${color}${tag}${colors.reset} [${d.rule}] ${colors.cyan}${relFile}:${d.line}:${d.column}${colors.reset}\n    ${d.message}`,
    );
  }

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  Scanned ${filesScanned} files.`);
  if (errors === 0) {
    console.log(`  ${colors.green}✓ 0 errors found.${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗ ${errors} error(s) found.${colors.reset}`);
  }
  if (warnings > 0) {
    console.log(
      `  ${colors.yellow}! ${warnings} warning(s) flagged.${colors.reset}`,
    );
  }
  console.log('');
}

if (errors > 0 || (isStrict && warnings > 0)) {
  process.exit(1);
} else {
  process.exit(0);
}

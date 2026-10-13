#!/usr/bin/env node

/**
 * Architecture & Codebase Rules Validator for Monorepo Starter
 *
 * Enforces:
 * 1. Prohibited Domain Hard Deletes (soft delete standards)
 * 2. Package Import Boundaries (clean architectural layers)
 * 3. Conditional Styling Standards (cn() mandate, no raw template literals in className)
 * 4. File Size Limits (< 300 lines guideline for functional application files)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  gray: '\x1b[90m',
};

let errorCount = 0;
let warningCount = 0;

function reportError(rule, file, line, message) {
  console.error(
    `  ${colors.red}ERROR${colors.reset} [${rule}] ${colors.cyan}${path.relative(ROOT_DIR, file)}:${line}${colors.reset}\n    ${message}`,
  );
  errorCount++;
}

function reportWarning(rule, file, line, message) {
  console.warn(
    `  ${colors.yellow}WARN${colors.reset}  [${rule}] ${colors.cyan}${path.relative(ROOT_DIR, file)}:${line}${colors.reset}\n    ${message}`,
  );
  warningCount++;
}

function collectFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        [
          'node_modules',
          '.git',
          '.next',
          '.turbo',
          'dist',
          'build',
          'coverage',
          '.venv',
        ].includes(entry.name)
      ) {
        continue;
      }
      collectFiles(fullPath, predicate, results);
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 1. Prohibited Domain Hard Deletes
// ---------------------------------------------------------------------------
function checkHardDeletes() {
  console.log(
    `${colors.bold}Checking Prohibited Domain Hard Deletes...${colors.reset}`,
  );
  const PROHIBITED_TABLES = ['user'];

  const searchDirs = [
    path.join(ROOT_DIR, 'apps/api/src'),
    path.join(ROOT_DIR, 'packages/database/src'),
  ];

  const files = [];
  for (const dir of searchDirs) {
    collectFiles(
      dir,
      (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'),
      files,
    );
  }

  const deleteRegex = new RegExp(
    `\\.(?:delete)\\s*\\(\\s*(${PROHIBITED_TABLES.join('|')})\\s*\\)`,
    'g',
  );

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, idx) => {
      // Skip comments
      if (lineText.trim().startsWith('//') || lineText.trim().startsWith('*'))
        return;
      deleteRegex.lastIndex = 0;
      const match = deleteRegex.exec(lineText);
      if (match) {
        reportError(
          'HARD_DELETE',
          file,
          idx + 1,
          `Prohibited hard SQL .delete(${match[1]}) on soft-deletable domain entity. Use soft delete (deletedAt: new Date()).`,
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Package Import Boundaries
// ---------------------------------------------------------------------------
function checkImportBoundaries() {
  console.log(
    `${colors.bold}Checking Package Import Boundaries...${colors.reset}`,
  );

  // packages/core: pure calculations, zero framework or DB deps
  const coreFiles = collectFiles(
    path.join(ROOT_DIR, 'packages/core/src'),
    (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'),
  );

  for (const file of coreFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, idx) => {
      if (!lineText.includes('import ') && !lineText.includes('from ')) return;
      if (
        lineText.includes('@nestjs') ||
        lineText.includes('@repo/database') ||
        lineText.includes('drizzle-orm') ||
        lineText.includes('better-auth')
      ) {
        reportError(
          'IMPORT_BOUNDARY',
          file,
          idx + 1,
          `@repo/core must not import framework or database dependencies. Keep pure domain calculation logic only.`,
        );
      }
    });
  }

  // packages/types: pure schemas/interfaces, zero heavy runtime deps
  const typesFiles = collectFiles(
    path.join(ROOT_DIR, 'packages/types/src'),
    (f) => f.endsWith('.ts'),
  );

  for (const file of typesFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, idx) => {
      if (!lineText.includes('import ') && !lineText.includes('from ')) return;
      if (
        lineText.includes('@nestjs') ||
        lineText.includes('@repo/database') ||
        lineText.includes('@repo/core') ||
        lineText.includes('drizzle-orm')
      ) {
        reportError(
          'IMPORT_BOUNDARY',
          file,
          idx + 1,
          `@repo/types must not import database or server framework dependencies.`,
        );
      }
    });
  }

  // packages/utils: pure helpers, zero heavy runtime deps
  const utilsFiles = collectFiles(
    path.join(ROOT_DIR, 'packages/utils/src'),
    (f) => f.endsWith('.ts'),
  );

  for (const file of utilsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, idx) => {
      if (!lineText.includes('import ') && !lineText.includes('from ')) return;
      if (
        lineText.includes('@nestjs') ||
        lineText.includes('@repo/database') ||
        lineText.includes('@repo/core') ||
        lineText.includes('drizzle-orm')
      ) {
        reportError(
          'IMPORT_BOUNDARY',
          file,
          idx + 1,
          `@repo/utils must remain pure helpers independent of NestJS or DB layers.`,
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Conditional Styling Standards
// ---------------------------------------------------------------------------
function checkConditionalStyling() {
  console.log(
    `${colors.bold}Checking Conditional Styling (cn() mandate)...${colors.reset}`,
  );
  const uiDirs = [
    path.join(ROOT_DIR, 'apps/web/src'),
    path.join(ROOT_DIR, 'apps/mobile/src'),
  ];

  const files = [];
  for (const dir of uiDirs) {
    collectFiles(dir, (f) => f.endsWith('.tsx') || f.endsWith('.jsx'), files);
  }

  // Look for className={`...${...}...`} where it is NOT wrapped in cn(...)
  const templateClassRegex = /className=\{`([^`]*\$\{[^`]*\})`\}/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((lineText, idx) => {
      if (lineText.includes('className={`') && !lineText.includes('cn(')) {
        if (templateClassRegex.test(lineText)) {
          reportError(
            'CONDITIONAL_STYLING',
            file,
            idx + 1,
            `Forbidden template literal in className without cn(). Use cn(...) from @/lib/utils.`,
          );
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. File Size Limits (< 300 lines for functional files)
// ---------------------------------------------------------------------------
function checkFileSizeLimits() {
  console.log(
    `${colors.bold}Checking File Size Guidelines (< 300 lines)...${colors.reset}`,
  );

  // Known documented exceptions (data fixtures, generated schemas, complex aggregators)
  const DOCUMENTED_EXCEPTIONS = new Set(['packages/types/src/admin.ts']);

  const scanDirs = [
    path.join(ROOT_DIR, 'apps/api/src'),
    path.join(ROOT_DIR, 'apps/web/src'),
    path.join(ROOT_DIR, 'apps/mobile/src'),
    path.join(ROOT_DIR, 'packages/core/src'),
    path.join(ROOT_DIR, 'packages/database/src'),
  ];

  const files = [];
  for (const dir of scanDirs) {
    collectFiles(
      dir,
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.endsWith('.spec.ts') &&
        !f.endsWith('.test.ts'),
      files,
    );
  }

  for (const file of files) {
    const relPath = path.relative(ROOT_DIR, file);
    if (DOCUMENTED_EXCEPTIONS.has(relPath)) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    if (lines > 350) {
      reportWarning(
        'FILE_SIZE',
        file,
        1,
        `File has ${lines} lines, exceeding the 200-300 lines modularity guideline. Consider splitting into sub-modules or hooks.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
console.log(
  `\n${colors.cyan}${colors.bold}=== Codebase Rules & Architecture Check ===${colors.reset}\n`,
);

checkHardDeletes();
checkImportBoundaries();
checkConditionalStyling();
checkFileSizeLimits();

console.log(`\n${colors.bold}Summary:${colors.reset}`);
if (errorCount === 0) {
  console.log(`  ${colors.green}✓ 0 errors found.${colors.reset}`);
} else {
  console.log(`  ${colors.red}✗ ${errorCount} error(s) found.${colors.reset}`);
}
if (warningCount > 0) {
  console.log(
    `  ${colors.yellow}! ${warningCount} warning(s) flagged.${colors.reset}`,
  );
}

console.log('');
if (errorCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

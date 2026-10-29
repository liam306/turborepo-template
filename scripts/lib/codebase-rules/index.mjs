import path from 'node:path';
import { collectFiles } from './files.mjs';
import { checkFileImportBoundaries } from './import-boundaries.mjs';
import { checkFileDtoOwnership } from './dto-ownership.mjs';
import { checkFileConditionalStyling } from './conditional-styling.mjs';
import { checkFileHardDeletes } from './hard-deletes.mjs';
import { checkFileSize } from './file-size.mjs';
import { clearSourceCache } from './project.mjs';

/**
 * Runs full architectural audit against codebase directories.
 * @param {string} rootDir
 * @returns {{
 *   errors: number,
 *   warnings: number,
 *   diagnostics: import('./project.mjs').Diagnostic[],
 *   filesScanned: number
 * }}
 */
export function auditCodebase(rootDir) {
  clearSourceCache();

  const scanDirs = [
    'apps/api/src',
    'apps/web/src',
    'apps/mobile/src',
    'packages/core/src',
    'packages/types/src',
    'packages/utils/src',
    'packages/database/src',
  ];

  const allFiles = new Set();
  for (const relDir of scanDirs) {
    const fullDir = path.join(rootDir, relDir);
    const files = collectFiles(fullDir, {
      filter: (f) => /\.[cm]?[jt]sx?$/.test(f) && !f.endsWith('.d.ts'),
    });
    for (const f of files) allFiles.add(f);
  }

  const diagnostics = [];

  for (const file of allFiles) {
    // 1. File size guideline (< 300 lines)
    diagnostics.push(...checkFileSize(file, rootDir));

    // 2. Import boundaries
    diagnostics.push(...checkFileImportBoundaries(file, rootDir));

    // 3. DTO ownership
    diagnostics.push(...checkFileDtoOwnership(file, rootDir));

    // 4. Conditional styling
    diagnostics.push(...checkFileConditionalStyling(file, rootDir));

    // 5. Prohibited domain hard deletes
    diagnostics.push(...checkFileHardDeletes(file, rootDir));
  }

  // Sort diagnostics stably by file, line, column, rule
  diagnostics.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.rule.localeCompare(b.rule);
  });

  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return {
    errors,
    warnings,
    diagnostics,
    filesScanned: allFiles.size,
  };
}

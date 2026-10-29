import fs from 'node:fs';
import path from 'node:path';
import { DOCUMENTED_FILE_SIZE_EXCEPTIONS, FILE_SIZE_LIMIT } from './policy.mjs';
import { isTestFile } from './files.mjs';
import { createDiagnostic } from './project.mjs';

/**
 * Checks a file for line count modularity guidelines.
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} [content]
 * @param {number} [limit=FILE_SIZE_LIMIT]
 * @returns {import('./project.mjs').Diagnostic[]}
 */
export function checkFileSize(
  filePath,
  rootDir,
  content,
  limit = FILE_SIZE_LIMIT,
) {
  if (isTestFile(filePath)) return [];

  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  // Skip documented exceptions
  if (DOCUMENTED_FILE_SIZE_EXCEPTIONS.has(relPath)) {
    return [];
  }

  const text =
    content !== undefined ? content : fs.readFileSync(filePath, 'utf8');

  // Normalize CRLF to LF and trim a single trailing newline to avoid off-by-one
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n$/, '');
  const lines = normalized === '' ? 0 : normalized.split('\n').length;

  if (lines > limit) {
    return [
      createDiagnostic(
        'FILE_SIZE',
        'warning',
        filePath,
        1,
        1,
        `File has ${lines} lines, exceeding the 200-300 lines modularity guideline. Consider splitting into sub-modules or hooks.`,
      ),
    ];
  }

  return [];
}

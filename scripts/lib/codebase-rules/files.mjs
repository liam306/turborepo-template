import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.expo',
  '.turbo',
  'dist',
  'build',
  'coverage',
]);

/**
 * Recursively collects files from a directory matching criteria.
 * @param {string} dir
 * @param {object} [options]
 * @param {(file: string) => boolean} [options.filter]
 * @param {Set<string>} [options.ignoredDirs]
 * @returns {string[]}
 */
export function collectFiles(dir, options = {}) {
  const { filter, ignoredDirs = DEFAULT_IGNORED_DIRS } = options;
  if (!fs.existsSync(dir)) return [];

  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      results.push(...collectFiles(fullPath, options));
    } else if (entry.isFile()) {
      if (!filter || filter(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Checks if a file path is a test or spec file.
 * @param {string} file
 * @returns {boolean}
 */
export function isTestFile(file) {
  return (
    /\.(spec|test)\.[cm]?[jt]sx?$/.test(file) ||
    file.includes('/__tests__/') ||
    file.includes('/tests/')
  );
}

/**
 * Returns the workspace key (api, web, mobile, core, types, utils, database) for a file.
 * @param {string} rootDir
 * @param {string} filePath
 * @returns {string | null}
 */
export function getWorkspaceKey(rootDir, filePath) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (rel.startsWith('apps/api/')) return 'api';
  if (rel.startsWith('apps/web/')) return 'web';
  if (rel.startsWith('apps/mobile/')) return 'mobile';
  if (rel.startsWith('packages/core/')) return 'core';
  if (rel.startsWith('packages/types/')) return 'types';
  if (rel.startsWith('packages/utils/')) return 'utils';
  if (rel.startsWith('packages/database/')) return 'database';
  return null;
}

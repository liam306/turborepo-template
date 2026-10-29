import path from 'node:path';
import { PACKAGE_IMPORT_POLICY } from './policy.mjs';
import { getWorkspaceKey, isTestFile } from './files.mjs';
import { extractImports, resolveSpecifier } from './imports.mjs';
import { createDiagnostic, getSourceFile } from './project.mjs';

/**
 * Checks a file for package import boundary violations.
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} [content]
 * @returns {import('./project.mjs').Diagnostic[]}
 */
export function checkFileImportBoundaries(filePath, rootDir, content) {
  const workspaceKey = getWorkspaceKey(rootDir, filePath);
  if (!workspaceKey) return [];

  const policy = PACKAGE_IMPORT_POLICY[workspaceKey];
  if (!policy) return [];

  const sourceFile = getSourceFile(filePath, content);
  const imports = extractImports(sourceFile);
  const diagnostics = [];
  const isTest = isTestFile(filePath);

  for (const imp of imports) {
    const rawSpecifier = imp.specifier;
    const resolved = resolveSpecifier(filePath, rawSpecifier, rootDir);

    // 1. Prohibited package imports
    for (const prohibited of policy.prohibitedImportPatterns) {
      if (
        rawSpecifier === prohibited ||
        rawSpecifier.startsWith(`${prohibited}/`)
      ) {
        diagnostics.push(
          createDiagnostic(
            'IMPORT_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `${policy.name} is prohibited from importing '${rawSpecifier}'. Maintain clean architectural separation.`,
          ),
        );
        break;
      }
    }

    // 2. Prohibited relative escapes into forbidden workspaces
    if (rawSpecifier.startsWith('.')) {
      // Check if relative path points into another app or package
      if (
        workspaceKey !== 'api' &&
        resolved.startsWith('apps/api/') &&
        !isTest
      ) {
        diagnostics.push(
          createDiagnostic(
            'IMPORT_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `Prohibited relative import into 'apps/api' from ${policy.name}.`,
          ),
        );
      }

      if (
        ['core', 'types', 'utils'].includes(workspaceKey) &&
        resolved.startsWith('packages/database/')
      ) {
        diagnostics.push(
          createDiagnostic(
            'IMPORT_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `${policy.name} must not relatively import '@repo/database'.`,
          ),
        );
      }

      if (
        ['types', 'utils', 'core', 'database'].includes(workspaceKey) &&
        resolved.startsWith('apps/')
      ) {
        diagnostics.push(
          createDiagnostic(
            'IMPORT_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `Shared package ${policy.name} must never import from application '${resolved}'.`,
          ),
        );
      }
    }
  }

  return diagnostics;
}

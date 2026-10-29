import path from 'node:path';
import { getWorkspaceKey, isTestFile } from './files.mjs';
import { extractImports, resolveSpecifier } from './imports.mjs';
import { createDiagnostic, getSourceFile } from './project.mjs';

/**
 * Checks DTO ownership and server runtime validator boundaries.
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} [content]
 * @returns {import('./project.mjs').Diagnostic[]}
 */
export function checkFileDtoOwnership(filePath, rootDir, content) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const workspaceKey = getWorkspaceKey(rootDir, filePath);
  if (!workspaceKey) return [];

  const sourceFile = getSourceFile(filePath, content);
  const imports = extractImports(sourceFile);
  const diagnostics = [];
  const isTest = isTestFile(filePath);

  for (const imp of imports) {
    const raw = imp.specifier;
    const resolved = resolveSpecifier(filePath, raw, rootDir);

    // 1. Prohibit class-validator and class-transformer outside apps/api
    if (
      raw === 'class-validator' ||
      raw.startsWith('class-validator/') ||
      raw === 'class-transformer' ||
      raw.startsWith('class-transformer/')
    ) {
      if (workspaceKey !== 'api') {
        diagnostics.push(
          createDiagnostic(
            'DTO_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `Server runtime validation '${raw}' is forbidden outside apps/api. Put shared contracts in '@repo/types'.`,
          ),
        );
      } else if (!relPath.includes('/dto/') && !isTest) {
        // In apps/api, validation decorators should be isolated inside dto/ directory
        const hasValidationDecorators = imp.namedImports.some((name) =>
          /^(Is[A-Z]|Min|Max|Validate|Transform|Type|Length|Array|Matches)/.test(
            name,
          ),
        );
        if (hasValidationDecorators) {
          diagnostics.push(
            createDiagnostic(
              'DTO_BOUNDARY',
              'warning',
              filePath,
              imp.line,
              imp.column,
              `Runtime validation decorator '${raw}' should be isolated inside a 'dto/' directory per module convention.`,
            ),
          );
        }
      }
    }

    // 2. Prohibit clients/packages importing API DTO files
    if (workspaceKey !== 'api' && !isTest) {
      if (resolved.includes('apps/api/src/') && resolved.includes('/dto/')) {
        diagnostics.push(
          createDiagnostic(
            'DTO_BOUNDARY',
            'error',
            filePath,
            imp.line,
            imp.column,
            `Prohibited import of server runtime DTO from '${resolved}'. Client code must only import contracts from '@repo/types'.`,
          ),
        );
      }
    }
  }

  return diagnostics;
}

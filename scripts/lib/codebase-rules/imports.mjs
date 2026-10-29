import path from 'node:path';
import ts from 'typescript';
import { getNodePosition } from './project.mjs';

/**
 * @typedef {{
 *   specifier: string,
 *   node: ts.Node,
 *   line: number,
 *   column: number,
 *   isTypeOnly: boolean,
 *   kind: 'static-import' | 'dynamic-import' | 'export-from' | 'require',
 *   namedImports: string[],
 *   defaultImport?: string,
 *   namespaceImport?: string
 * }} ExtractedImport
 */

/**
 * Extracts all imports, requires, and exports with specifiers from a source file.
 * @param {ts.SourceFile} sourceFile
 * @returns {ExtractedImport[]}
 */
export function extractImports(sourceFile) {
  const imports = [];

  function visit(node) {
    // 1. Static ImportDeclaration: import ... from '...'
    if (ts.isImportDeclaration(node)) {
      if (
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const pos = getNodePosition(sourceFile, node);
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;

        let defaultImport;
        let namespaceImport;
        const namedImports = [];

        if (node.importClause) {
          if (node.importClause.name) {
            defaultImport = node.importClause.name.text;
          }
          const namedBindings = node.importClause.namedBindings;
          if (namedBindings) {
            if (ts.isNamespaceImport(namedBindings)) {
              namespaceImport = namedBindings.name.text;
            } else if (ts.isNamedImports(namedBindings)) {
              for (const el of namedBindings.elements) {
                namedImports.push(el.name.text);
              }
            }
          }
        }

        imports.push({
          specifier,
          node,
          line: pos.line,
          column: pos.column,
          isTypeOnly,
          kind: 'static-import',
          namedImports,
          defaultImport,
          namespaceImport,
        });
      }
    }

    // 2. ExportDeclaration with specifier: export ... from '...'
    else if (ts.isExportDeclaration(node)) {
      if (
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const pos = getNodePosition(sourceFile, node);
        const isTypeOnly = node.isTypeOnly ?? false;
        imports.push({
          specifier,
          node,
          line: pos.line,
          column: pos.column,
          isTypeOnly,
          kind: 'export-from',
          namedImports: [],
        });
      }
    }

    // 3. Dynamic import: import('...') or require('...')
    else if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteralLike(arg)) {
          const pos = getNodePosition(sourceFile, node);
          imports.push({
            specifier: arg.text,
            node,
            line: pos.line,
            column: pos.column,
            isTypeOnly: false,
            kind: 'dynamic-import',
            namedImports: [],
          });
        }
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteralLike(arg)) {
          const pos = getNodePosition(sourceFile, node);
          imports.push({
            specifier: arg.text,
            node,
            line: pos.line,
            column: pos.column,
            isTypeOnly: false,
            kind: 'require',
            namedImports: [],
          });
        }
      }
    }

    // 4. TS ImportEquals: import x = require('...')
    else if (ts.isImportEqualsDeclaration(node)) {
      if (
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteralLike(node.moduleReference.expression)
      ) {
        const specifier = node.moduleReference.expression.text;
        const pos = getNodePosition(sourceFile, node);
        imports.push({
          specifier,
          node,
          line: pos.line,
          column: pos.column,
          isTypeOnly: false,
          kind: 'require',
          namedImports: [],
          defaultImport: node.name.text,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Resolves a module specifier to relative workspace file or package identifier.
 * @param {string} sourceFilePath
 * @param {string} specifier
 * @param {string} rootDir
 * @returns {string}
 */
export function resolveSpecifier(sourceFilePath, specifier, rootDir) {
  if (specifier.startsWith('.')) {
    const dir = path.dirname(sourceFilePath);
    const resolved = path.resolve(dir, specifier);
    return path.relative(rootDir, resolved).replace(/\\/g, '/');
  }

  if (specifier.startsWith('@/')) {
    const relSource = path
      .relative(rootDir, sourceFilePath)
      .replace(/\\/g, '/');
    let appPrefix = '';
    if (relSource.startsWith('apps/web/')) appPrefix = 'apps/web/src';
    else if (relSource.startsWith('apps/mobile/'))
      appPrefix = 'apps/mobile/src';
    else if (relSource.startsWith('apps/api/')) appPrefix = 'apps/api/src';

    if (appPrefix) {
      const subPath = specifier.slice(2);
      return `${appPrefix}/${subPath}`;
    }
  }

  return specifier;
}

import { PROHIBITED_DOMAIN_TABLES } from './policy.mjs';
import { isTestFile } from './files.mjs';
import {
  createDiagnostic,
  getNodePosition,
  getSourceFile,
  ts,
} from './project.mjs';

const NON_DB_RECEIVERS = new Set([
  'map',
  'set',
  'cache',
  'headers',
  'params',
  'searchparams',
  'cookies',
  'session',
]);

/**
 * Checks a file for prohibited hard deletes on soft-deletable domain entities.
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} [content]
 * @returns {import('./project.mjs').Diagnostic[]}
 */
export function checkFileHardDeletes(filePath, rootDir, content) {
  if (isTestFile(filePath)) return [];

  const sourceFile = getSourceFile(filePath, content);
  const diagnostics = [];

  /**
   * Resolves table name identifier or property access.
   * @param {ts.Node} node
   * @returns {string | null}
   */
  function extractTableName(node) {
    if (!node) return null;
    if (ts.isIdentifier(node)) {
      return node.text;
    }
    if (ts.isPropertyAccessExpression(node)) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Checks if receiver is a known non-DB structure (Map, Set, Headers, URLSearchParams).
   * @param {ts.LeftHandSideExpression} expr
   * @returns {boolean}
   */
  function isNonDbReceiver(expr) {
    if (ts.isIdentifier(expr)) {
      const lower = expr.text.toLowerCase();
      for (const nonDb of NON_DB_RECEIVERS) {
        if (lower.includes(nonDb)) return true;
      }
    }
    return false;
  }

  function visit(node) {
    // 1. Drizzle .delete(table) call
    if (ts.isCallExpression(node)) {
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'delete'
      ) {
        const receiver = node.expression.expression;
        if (!isNonDbReceiver(receiver)) {
          if (node.arguments.length > 0) {
            const tableArg = node.arguments[0];
            const tableName = extractTableName(tableArg);
            if (tableName && PROHIBITED_DOMAIN_TABLES.has(tableName)) {
              const pos = getNodePosition(sourceFile, node);
              diagnostics.push(
                createDiagnostic(
                  'HARD_DELETE',
                  'error',
                  filePath,
                  pos.line,
                  pos.column,
                  `Prohibited hard SQL .delete(${tableName}) on soft-deletable domain entity. Use soft delete (deletedAt: new Date()).`,
                ),
              );
            }
          }
        }
      }
    }

    // 2. Raw SQL string / tagged template: DELETE FROM "table"
    if (ts.isTaggedTemplateExpression(node)) {
      const tagText = node.tag.getText(sourceFile);
      if (tagText.includes('sql')) {
        const rawSql = node.template.getText(sourceFile);
        const match = /DELETE\s+FROM\s+["`]?([a-zA-Z0-9_]+)["`]?/i.exec(rawSql);
        if (match) {
          const table = match[1];
          if (PROHIBITED_DOMAIN_TABLES.has(table)) {
            const pos = getNodePosition(sourceFile, node);
            diagnostics.push(
              createDiagnostic(
                'HARD_DELETE',
                'error',
                filePath,
                pos.line,
                pos.column,
                `Prohibited raw SQL 'DELETE FROM ${table}' on soft-deletable entity. Use soft delete (deletedAt).`,
              ),
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return diagnostics;
}

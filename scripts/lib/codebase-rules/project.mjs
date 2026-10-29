import fs from 'node:fs';
import ts from 'typescript';

/**
 * @typedef {{
 *   rule: string,
 *   severity: 'error' | 'warning',
 *   file: string,
 *   line: number,
 *   column: number,
 *   message: string
 * }} Diagnostic
 */

const sourceCache = new Map();

/**
 * Parses and caches a source file AST.
 * @param {string} filePath
 * @param {string} [content]
 * @returns {ts.SourceFile}
 */
export function getSourceFile(filePath, content) {
  if (sourceCache.has(filePath) && content === undefined) {
    return sourceCache.get(filePath);
  }

  const fileContent =
    content !== undefined ? content : fs.readFileSync(filePath, 'utf8');
  const isTsx = filePath.endsWith('.tsx');
  const isJsx = filePath.endsWith('.jsx');
  const isJs =
    filePath.endsWith('.js') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.cjs');

  const scriptKind = isTsx
    ? ts.ScriptKind.TSX
    : isJsx
      ? ts.ScriptKind.JSX
      : isJs
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  sourceCache.set(filePath, sf);
  return sf;
}

/**
 * Clears source cache.
 */
export function clearSourceCache() {
  sourceCache.clear();
}

/**
 * Obtains 1-based line and column from an AST node.
 * @param {ts.SourceFile} sourceFile
 * @param {ts.Node} node
 * @returns {{ line: number, column: number }}
 */
export function getNodePosition(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return { line: line + 1, column: character + 1 };
}

/**
 * Factory for creating structured rule diagnostic.
 * @param {string} rule
 * @param {'error' | 'warning'} severity
 * @param {string} file
 * @param {number} line
 * @param {number} column
 * @param {string} message
 * @returns {Diagnostic}
 */
export function createDiagnostic(rule, severity, file, line, column, message) {
  return {
    rule,
    severity,
    file,
    line,
    column,
    message,
  };
}

export { ts };

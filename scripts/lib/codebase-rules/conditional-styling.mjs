import {
  createDiagnostic,
  getNodePosition,
  getSourceFile,
  ts as typescript,
} from './project.mjs';
import { extractImports } from './imports.mjs';

/**
 * Checks a file for conditional styling rule violations (cn() mandate).
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} [content]
 * @returns {import('./project.mjs').Diagnostic[]}
 */
export function checkFileConditionalStyling(filePath, rootDir, content) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) {
    return [];
  }

  const sourceFile = getSourceFile(filePath, content);
  const diagnostics = [];
  const imports = extractImports(sourceFile);

  // Check if cn is imported from @/lib/utils (or similar utils)
  const cnImport = imports.find(
    (imp) => imp.namedImports.includes('cn') || imp.defaultImport === 'cn',
  );

  /**
   * Evaluates an expression inside className={...}
   * @param {typescript.Expression} expr
   * @param {typescript.JsxAttribute} _attr
   */
  function inspectClassExpression(expr, _attr) {
    if (!expr) return;

    // 1. Template literal with expressions: className={`...${...}...`}
    if (typescript.isTemplateExpression(expr)) {
      const pos = getNodePosition(sourceFile, expr);
      diagnostics.push(
        createDiagnostic(
          'CONDITIONAL_STYLING',
          'error',
          filePath,
          pos.line,
          pos.column,
          `Forbidden template literal in className without cn(). Use cn(...) from @/lib/utils.`,
        ),
      );
      return;
    }

    // 2. Direct conditional ternary: className={active ? "a" : "b"}
    if (typescript.isConditionalExpression(expr)) {
      const pos = getNodePosition(sourceFile, expr);
      diagnostics.push(
        createDiagnostic(
          'CONDITIONAL_STYLING',
          'error',
          filePath,
          pos.line,
          pos.column,
          `Forbidden ternary in className without cn(). Wrap conditional classes with cn(...).`,
        ),
      );
      return;
    }

    // 3. Direct binary logical or addition: className={active && "hidden"} or className={"a " + b}
    if (typescript.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;
      if (
        op === typescript.SyntaxKind.AmpersandAmpersandToken ||
        op === typescript.SyntaxKind.BarBarToken ||
        op === typescript.SyntaxKind.PlusToken
      ) {
        const pos = getNodePosition(sourceFile, expr);
        diagnostics.push(
          createDiagnostic(
            'CONDITIONAL_STYLING',
            'error',
            filePath,
            pos.line,
            pos.column,
            `Forbidden expression in className without cn(). Wrap conditional classes with cn(...).`,
          ),
        );
        return;
      }
    }

    // 4. If calling cn(...), ensure cn is imported from @/lib/utils
    if (typescript.isCallExpression(expr)) {
      if (
        typescript.isIdentifier(expr.expression) &&
        expr.expression.text === 'cn'
      ) {
        if (!cnImport) {
          const pos = getNodePosition(sourceFile, expr);
          diagnostics.push(
            createDiagnostic(
              'CONDITIONAL_STYLING',
              'error',
              filePath,
              pos.line,
              pos.column,
              `Function 'cn' used but not imported from '@/lib/utils'.`,
            ),
          );
        }
      }
    }
  }

  function visit(node) {
    if (typescript.isJsxAttribute(node)) {
      if (
        typescript.isIdentifier(node.name) &&
        node.name.text === 'className' &&
        node.initializer
      ) {
        if (typescript.isJsxExpression(node.initializer)) {
          const innerExpr = node.initializer.expression;
          if (innerExpr) {
            inspectClassExpression(innerExpr, node);
          }
        }
      }
    }

    typescript.forEachChild(node, visit);
  }

  visit(sourceFile);
  return diagnostics;
}

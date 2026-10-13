import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ignored = new Set([
  'node_modules',
  '.git',
  '.next',
  '.expo',
  '.turbo',
  'dist',
  'build',
  'coverage',
  'i18n',
  'locales',
  'messages',
  '__tests__',
  '__mocks__',
]);

export function collectSources(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory())
      return ignored.has(entry.name) ? [] : collectSources(file);
    return /\.[cm]?[jt]sx?$/.test(file) &&
      !/\.(spec|test)\.[cm]?[jt]sx?$/.test(file)
      ? [file]
      : [];
  });
}

export function parseSource(file, content) {
  return ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    /\.[jt]sx$/.test(file)
      ? ts.ScriptKind.TSX
      : /\.m?js$/.test(file)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS,
  );
}

export function position(source, node) {
  const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
  return { line: pos.line + 1, column: pos.character + 1 };
}

export function literal(node) {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

export function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node)
    ? node.text
    : undefined;
}

export { ts };

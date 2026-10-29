import path from 'node:path';
import fs from 'node:fs';
import {
  literal,
  parseSource,
  position,
  propertyName,
  ts,
} from './source-audit.mjs';
import { translationUsage } from './translation-usage.mjs';

/**
 * Resolves module specifier to an absolute file path.
 */
function resolveModuleSpecifier(
  specifier,
  fromFile,
  srcDir,
  fileExists,
  statSync = (p) => fs.statSync(p),
) {
  let basePath;
  if (specifier.startsWith('@/')) {
    basePath = path.join(srcDir, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const extensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '/index.ts',
    '/index.tsx',
    '/index.js',
    '/index.jsx',
    '',
  ];

  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (fileExists(candidate)) {
      try {
        if (!statSync(candidate).isDirectory()) {
          return candidate;
        }
      } catch {
        // If statSync fails or candidate is virtual in tests
        if (!candidate.endsWith('/') && ext !== '') {
          return candidate;
        }
      }
    }
  }

  return null;
}

/**
 * Parses file and extracts top-level imports, exports, and call expressions that pass translators.
 */
function inspectFile(filePath, content) {
  const source = parseSource(filePath, content);
  const imports = new Map(); // localName -> { specifier, originalName }
  const exports = new Map(); // exportedName -> { type: 'local' | 'reexport', originalName, specifier, node }
  const exportAll = []; // list of specifiers
  const factories = new Map([
    ['useTranslations', 'web'],
    ['getTranslations', 'web'],
    ['useTranslation', 'mobile'],
  ]);

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier =
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : null;
      if (!specifier) continue;

      const clause = statement.importClause;
      if (!clause) continue;

      if (clause.name) {
        imports.set(clause.name.text, { specifier, originalName: 'default' });
      }

      const bindings = clause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          const original = el.propertyName?.text || el.name.text;
          imports.set(el.name.text, { specifier, originalName: original });
          if (factories.has(original)) {
            factories.set(el.name.text, factories.get(original));
          }
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      const specifier =
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : null;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) {
          const original = el.propertyName?.text || el.name.text;
          const exported = el.name.text;
          if (specifier) {
            exports.set(exported, {
              type: 'reexport',
              originalName: original,
              specifier,
            });
          } else {
            exports.set(exported, { type: 'local', originalName: original });
          }
        }
      } else if (specifier && !statement.exportClause) {
        exportAll.push(specifier);
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      const isExported = statement.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (isExported) {
        exports.set(statement.name.text, {
          type: 'local',
          originalName: statement.name.text,
          node: statement,
        });
      }
    } else if (ts.isVariableStatement(statement)) {
      const isExported = statement.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (isExported) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.set(decl.name.text, {
              type: 'local',
              originalName: decl.name.text,
              node: decl,
            });
          }
        }
      }
    }
  }

  return { source, imports, exports, exportAll, factories };
}

/**
 * Follows an exported symbol through re-exports and barrel files to find the declaring function.
 */
function resolveExportedFunction(
  initialFile,
  symbolName,
  projectFiles,
  srcDir,
  fileExists,
  statSync,
  visited = new Set(),
) {
  const visitKey = `${initialFile}:${symbolName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const parsed = projectFiles.get(initialFile);
  if (!parsed) return null;

  if (parsed.exports.has(symbolName)) {
    const exp = parsed.exports.get(symbolName);
    if (exp.type === 'local') {
      return { file: initialFile, node: exp.node, name: exp.originalName };
    }
    if (exp.type === 'reexport') {
      const nextFile = resolveModuleSpecifier(
        exp.specifier,
        initialFile,
        srcDir,
        fileExists,
        statSync,
      );
      if (nextFile) {
        return resolveExportedFunction(
          nextFile,
          exp.originalName,
          projectFiles,
          srcDir,
          fileExists,
          statSync,
          visited,
        );
      }
    }
  }

  // Check export *
  for (const specifier of parsed.exportAll) {
    const nextFile = resolveModuleSpecifier(
      specifier,
      initialFile,
      srcDir,
      fileExists,
      statSync,
    );
    if (nextFile) {
      const found = resolveExportedFunction(
        nextFile,
        symbolName,
        projectFiles,
        srcDir,
        fileExists,
        statSync,
        visited,
      );
      if (found) return found;
    }
  }

  return null;
}

/**
 * Extracts finite string keys from an AST node.
 */
function finiteKeys(node) {
  if (!node) return undefined;
  if (
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    return finiteKeys(node.expression);
  const key = literal(node);
  if (key !== undefined) return [key];
  if (ts.isConditionalExpression(node)) {
    const yes = finiteKeys(node.whenTrue);
    const no = finiteKeys(node.whenFalse);
    if (yes && no) return [...new Set([...yes, ...no])];
  }
  return undefined;
}

/**
 * Analyzes whole project translation usage across module boundaries.
 */
export function analyzeProjectTranslations({
  rootDir,
  appName = 'web',
  srcDir,
  sourceFiles,
  readFile = (p) => fs.readFileSync(p, 'utf8'),
  fileExists = (p) => fs.existsSync(p),
  statSync = (p) => fs.statSync(p),
}) {
  const projectFiles = new Map();
  const directOccurrences = [];
  const dynamicPrefixes = new Set();
  const unresolved = [];

  // Phase 1: Parse AST and inspect files
  for (const filePath of sourceFiles) {
    const content = readFile(filePath);
    const parsed = inspectFile(filePath, content);
    parsed.content = content;
    projectFiles.set(filePath, parsed);

    const direct = translationUsage(filePath, content, appName);
    const relFile = path.relative(rootDir, filePath);
    for (const occ of direct.occurrences) {
      directOccurrences.push({ ...occ, file: relFile });
    }
    for (const prefix of direct.dynamicPrefixes) {
      dynamicPrefixes.add(prefix);
    }
    for (const u of direct.unresolved) {
      unresolved.push(u);
    }
  }

  // Queue of functions to analyze with specific translator parameters
  const pendingFunctionAnalyses = [];
  const queuedKeys = new Set();

  function queueFunctionParam(
    targetFile,
    functionNode,
    paramIndex,
    translator,
  ) {
    let params = null;
    let funcName = '<anonymous>';
    if (ts.isFunctionDeclaration(functionNode)) {
      params = functionNode.parameters;
      funcName = functionNode.name?.text || funcName;
    } else if (
      ts.isVariableDeclaration(functionNode) &&
      functionNode.initializer
    ) {
      let init = functionNode.initializer;
      funcName = functionNode.name?.getText() || funcName;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        params = init.parameters;
      }
    }

    if (!params || !params[paramIndex]) return;
    const param = params[paramIndex];
    if (!ts.isIdentifier(param.name)) return;
    const paramName = param.name.text;

    const queueKey = `${targetFile}:${funcName}:${paramName}:${translator.namespace}`;
    if (queuedKeys.has(queueKey)) return;
    queuedKeys.add(queueKey);

    pendingFunctionAnalyses.push({
      targetFile,
      functionNode,
      paramName,
      translator,
    });
  }

  // Helper to discover calls passing translators inside an AST tree
  function discoverTranslatorCalls(
    filePath,
    rootNode,
    initialBindings,
    factories,
  ) {
    const parsed = projectFiles.get(filePath);

    function scopeBindings(node, inherited) {
      const bindings = new Map(inherited);
      function bind(declaration) {
        const alias =
          declaration.initializer && ts.isIdentifier(declaration.initializer)
            ? bindings.get(declaration.initializer.text)
            : null;
        if (ts.isIdentifier(declaration.name))
          bindings.set(declaration.name.text, null);
        if (ts.isObjectBindingPattern(declaration.name)) {
          for (const element of declaration.name.elements) {
            if (ts.isIdentifier(element.name))
              bindings.set(element.name.text, null);
          }
        }
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isIdentifier(declaration.initializer) &&
          alias
        ) {
          bindings.set(declaration.name.text, alias);
          return;
        }
        let call = declaration.initializer;
        if (call && ts.isAwaitExpression(call)) call = call.expression;
        if (
          !call ||
          !ts.isCallExpression(call) ||
          !ts.isIdentifier(call.expression)
        )
          return;
        const kind = factories.get(call.expression.text);
        if (!kind) return;
        const arg = call.arguments[0];
        let namespace = literal(arg) || '';
        let known = !arg || literal(arg) !== undefined;
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const prop = arg.properties.find(
            (p) =>
              ts.isPropertyAssignment(p) &&
              propertyName(p.name) === 'namespace',
          );
          namespace =
            prop && ts.isPropertyAssignment(prop)
              ? literal(prop.initializer)
              : '';
          known = namespace !== undefined;
        }
        if (kind === 'mobile') {
          namespace = '';
          known = true;
          const options = call.arguments[1];
          if (options && ts.isObjectLiteralExpression(options)) {
            const prop = options.properties.find(
              (p) =>
                ts.isPropertyAssignment(p) &&
                propertyName(p.name) === 'keyPrefix',
            );
            if (prop && ts.isPropertyAssignment(prop)) {
              namespace = literal(prop.initializer);
              known = namespace !== undefined;
            }
          }
        }
        if (ts.isIdentifier(declaration.name)) {
          bindings.set(declaration.name.text, { namespace, known });
        }
      }

      if (ts.isSourceFile(node) || ts.isBlock(node)) {
        for (const statement of node.statements) {
          if (ts.isVariableStatement(statement))
            statement.declarationList.declarations.forEach(bind);
        }
      }
      if (ts.isFunctionLike(node)) {
        for (const parameter of node.parameters) bind(parameter);
      }
      return bindings;
    }

    function visit(node, inherited) {
      let bindings = inherited;
      if (
        ts.isSourceFile(node) ||
        ts.isBlock(node) ||
        ts.isFunctionLike(node)
      ) {
        bindings = scopeBindings(node, inherited);
      }

      if (ts.isCallExpression(node)) {
        // Check if any argument is a translator
        node.arguments.forEach((arg, argIndex) => {
          let translator = null;
          if (ts.isIdentifier(arg) && bindings.has(arg.text)) {
            translator = bindings.get(arg.text);
          }
          if (translator && translator.known) {
            // Found a call passing a translator: resolve callee!
            let calleeName = null;
            if (ts.isIdentifier(node.expression)) {
              calleeName = node.expression.text;
            } else if (ts.isPropertyAccessExpression(node.expression)) {
              calleeName = node.expression.name.text;
            }
            if (calleeName && parsed.imports.has(calleeName)) {
              const imp = parsed.imports.get(calleeName);
              const targetFile = resolveModuleSpecifier(
                imp.specifier,
                filePath,
                srcDir,
                fileExists,
                statSync,
              );
              if (targetFile) {
                const resolved = resolveExportedFunction(
                  targetFile,
                  imp.originalName,
                  projectFiles,
                  srcDir,
                  fileExists,
                  statSync,
                );
                if (resolved && resolved.node) {
                  queueFunctionParam(
                    resolved.file,
                    resolved.node,
                    argIndex,
                    translator,
                  );
                }
              }
            }
          }
        });
      }

      ts.forEachChild(node, (child) => visit(child, bindings));
    }

    visit(rootNode, initialBindings);
  }

  // Phase 2: Find all initial translator calls across all source files
  for (const [filePath, parsed] of projectFiles.entries()) {
    discoverTranslatorCalls(
      filePath,
      parsed.source,
      new Map(),
      parsed.factories,
    );
  }

  // Phase 3: Process queued functions with translator parameters
  const crossFileOccurrences = [];

  while (pendingFunctionAnalyses.length > 0) {
    const item = pendingFunctionAnalyses.shift();
    const parsed = projectFiles.get(item.targetFile);
    if (!parsed) continue;

    const source = parsed.source;
    const initialBindings = new Map([[item.paramName, item.translator]]);

    function visitFunctionBody(node, inherited) {
      let bindings = inherited;
      if (ts.isBlock(node) || ts.isFunctionLike(node)) {
        bindings = new Map(inherited);
        if (ts.isBlock(node)) {
          for (const stmt of node.statements) {
            if (ts.isVariableStatement(stmt)) {
              for (const decl of stmt.declarationList.declarations) {
                if (ts.isIdentifier(decl.name))
                  bindings.set(decl.name.text, null);
              }
            }
          }
        }
      }

      if (ts.isCallExpression(node)) {
        let callee = node.expression;
        if (
          ts.isPropertyAccessExpression(callee) &&
          ['rich', 'raw', 'markup', 'has'].includes(callee.name.text)
        ) {
          callee = callee.expression;
        }

        let translator = null;
        if (ts.isIdentifier(callee) && bindings.has(callee.text)) {
          translator = bindings.get(callee.text);
        }

        if (translator && translator.known) {
          const arg = node.arguments[0];
          const keys = finiteKeys(arg);
          const ns = translator.namespace;
          if (keys) {
            for (const key of keys) {
              const fullKey = ns ? `${ns}.${key}` : key;
              crossFileOccurrences.push({
                key: fullKey,
                file: path.relative(rootDir, item.targetFile),
                ...position(source, node),
              });
            }
          }
        }

        node.arguments.forEach((arg, argIndex) => {
          let passedTranslator = null;
          if (ts.isIdentifier(arg) && bindings.has(arg.text)) {
            passedTranslator = bindings.get(arg.text);
          }
          if (passedTranslator && passedTranslator.known) {
            let nextCalleeName = null;
            if (ts.isIdentifier(node.expression)) {
              nextCalleeName = node.expression.text;
            } else if (ts.isPropertyAccessExpression(node.expression)) {
              nextCalleeName = node.expression.name.text;
            }
            if (nextCalleeName && parsed.imports.has(nextCalleeName)) {
              const imp = parsed.imports.get(nextCalleeName);
              const targetFile = resolveModuleSpecifier(
                imp.specifier,
                item.targetFile,
                srcDir,
                fileExists,
                statSync,
              );
              if (targetFile) {
                const resolved = resolveExportedFunction(
                  targetFile,
                  imp.originalName,
                  projectFiles,
                  srcDir,
                  fileExists,
                  statSync,
                );
                if (resolved && resolved.node) {
                  queueFunctionParam(
                    resolved.file,
                    resolved.node,
                    argIndex,
                    passedTranslator,
                  );
                }
              }
            }
          }
        });
      }

      ts.forEachChild(node, (child) => visitFunctionBody(child, bindings));
    }

    visitFunctionBody(item.functionNode, initialBindings);
  }

  // Combine occurrences and deduplicate identical occurrences (file, line, col, key)
  const allOccurrences = [...directOccurrences, ...crossFileOccurrences];
  const seenOccurrences = new Set();
  const dedupedOccurrences = [];

  for (const occ of allOccurrences) {
    const sig = `${occ.file}:${occ.line}:${occ.column}:${occ.key}`;
    if (!seenOccurrences.has(sig)) {
      seenOccurrences.add(sig);
      dedupedOccurrences.push(occ);
    }
  }

  return {
    occurrences: dedupedOccurrences,
    dynamicPrefixes,
    unresolved,
  };
}

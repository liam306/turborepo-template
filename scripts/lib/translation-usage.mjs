import {
  literal,
  parseSource,
  position,
  propertyName,
  ts,
} from './source-audit.mjs';

// Lexical scopes prevent unrelated translators named `t` from sharing namespaces.
export function translationUsage(file, content, _app) {
  const source = parseSource(file, content);
  const occurrences = [];
  const dynamicPrefixes = new Set();
  const unresolved = [];
  const factories = new Map([
    ['useTranslations', 'web'],
    ['getTranslations', 'web'],
    ['useTranslation', 'mobile'],
  ]);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const original = element.propertyName?.text || element.name.text;
      if (factories.has(original))
        factories.set(element.name.text, factories.get(original));
    }
  }

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
            ts.isPropertyAssignment(p) && propertyName(p.name) === 'namespace',
        );
        namespace =
          prop && ts.isPropertyAssignment(prop)
            ? literal(prop.initializer)
            : '';
        known = namespace !== undefined;
      }
      if (kind === 'mobile') {
        // This repo uses nested JSON rather than separate i18next namespace files.
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
        if (ts.isObjectBindingPattern(declaration.name)) {
          for (const element of declaration.name.elements) {
            if (
              (element.propertyName?.getText(source) ||
                element.name.getText(source)) === 't'
            )
              bindings.set(element.name.getText(source), { namespace, known });
          }
        }
      } else if (ts.isIdentifier(declaration.name)) {
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
    const bindings =
      ts.isSourceFile(node) || ts.isBlock(node) || ts.isFunctionLike(node)
        ? scopeBindings(node, inherited)
        : inherited;
    if (ts.isCallExpression(node)) {
      let callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        ['rich', 'raw', 'markup', 'has'].includes(callee.name.text)
      )
        callee = callee.expression;
      let translator;
      if (ts.isIdentifier(callee)) {
        translator = bindings.has(callee.text)
          ? bindings.get(callee.text)
          : callee.text === 't'
            ? { namespace: '', known: true }
            : null;
      } else if (
        ts.isPropertyAccessExpression(callee) &&
        ['t', 'translate'].includes(callee.name.text)
      ) {
        if (/i18n/i.test(callee.expression.getText(source)))
          translator = { namespace: '', known: true };
      }
      if (translator) {
        const arg = node.arguments[0];
        const keys = finiteKeys(arg);
        const ns = translator.namespace;
        if (translator.known && keys) {
          for (const key of keys)
            occurrences.push({
              key: ns ? `${ns}.${key}` : key,
              ...position(source, node),
            });
        } else {
          unresolved.push(position(source, node));
          const prefix =
            arg && ts.isTemplateExpression(arg) ? arg.head.text : '';
          if (translator.known && (ns || prefix))
            dynamicPrefixes.add(ns ? `${ns}.${prefix}` : prefix);
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, bindings));
  }
  visit(source, new Map());
  return { occurrences, dynamicPrefixes, unresolved };
}

// Deliberately bounded: no variable, import, or arbitrary data-flow inference.
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

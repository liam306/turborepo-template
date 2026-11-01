import {
  literal,
  parseSource,
  position,
  propertyName,
  ts,
} from './source-audit.mjs';

const attributes = new Set([
  'placeholder',
  'title',
  'alt',
  'aria-label',
  'aria-description',
  'accessibilityLabel',
  'accessibilityHint',
  'label',
  'description',
  'helperText',
  'emptyText',
]);
const candidates = new Set([
  ...attributes,
  'message',
  'defaultValue',
  'text',
  'header',
]);

const COMMENT_IGNORE_RE =
  /^\s*(?:\/\/|\/\*|\{\/\*)\s*i18n-audit-ignore(?::[ \t]*(\S.*?))?(?:\*\/|\*\/\})?\s*$/;
const FILE_IGNORE_RE =
  /^\s*(?:\/\/|\/\*|\{\/\*)\s*i18n-audit-file-ignore:[ \t]*\S/m;

function isStyleOrTechnicalValue(text) {
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(text))
    return true;
  const tokens = text.trim().split(/\s+/);
  return (
    tokens.length > 0 &&
    tokens.every((t) =>
      /^(?:[a-z0-9_-]+:)*(?:(?:text|bg|border|font|opacity|rounded|shadow|gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|leading|w|h|min-w|min-h|max-w|max-h|top|bottom|left|right|inset|z|basis|grow|shrink)-[a-z0-9_./[\]#-]+|flex(?:-(?:row|col|wrap|nowrap|1|auto|initial|none))?|items-(?:start|end|center|baseline|stretch)|justify-(?:normal|start|end|center|between|around|evenly|stretch)|self-(?:auto|start|end|center|stretch)|content-(?:start|end|center|between|around|evenly)|line-through|underline|italic|not-italic|truncate|hidden|block|inline|inline-block|grid|absolute|relative|fixed|sticky)$/.test(
        t,
      ),
    )
  );
}

function hasTechnicalStyleContext(propNode) {
  const obj = propNode.parent;
  if (!obj || !ts.isObjectLiteralExpression(obj)) return false;

  const styleSiblings = new Set([
    'container',
    'background',
    'bg',
    'border',
    'style',
    'className',
    'tint',
    'fill',
    'stroke',
  ]);
  for (const sibling of obj.properties) {
    if (sibling !== propNode && ts.isPropertyAssignment(sibling)) {
      const sName = propertyName(sibling.name);
      if (styleSiblings.has(sName)) return true;
    }
  }

  let current = obj.parent;
  for (let i = 0; i < 3 && current; i++) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      if (/(?:style|theme|color|palette|variant)s?$/i.test(current.name.text)) {
        return true;
      }
    }
    if (ts.isPropertyAssignment(current)) {
      const pName = propertyName(current.name);
      if (
        /(?:style|theme|color|palette|variant|colors|light|dark)s?$/i.test(
          pName,
        )
      ) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

export function auditHardcodedText(file, content) {
  const source = parseSource(file, content);
  const issues = [];
  const parsed =
    /** @type {import('typescript').SourceFile & { parseDiagnostics: readonly import('typescript').DiagnosticWithLocation[] }} */ (
      source
    );
  for (const diagnostic of parsed.parseDiagnostics) {
    const pos = source.getLineAndCharacterOfPosition(diagnostic.start || 0);
    issues.push({
      file,
      line: pos.line + 1,
      column: pos.character + 1,
      severity: 'error',
      rule: 'source-syntax',
      snippet: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  }

  const firstLines = content.split('\n').slice(0, 3).join('\n');
  if (FILE_IGNORE_RE.test(firstLines)) return issues;

  const lines = content.split('\n');
  const seen = new Set();
  function report(node, rule, severity = 'error') {
    const { line, column } = position(source, node);
    // Suppression must be on preceding line and include an explicit reason.
    const previous = lines[line - 2] || '';
    const match = previous.match(COMMENT_IGNORE_RE);
    if (match && match[1]?.trim()) return;

    let current = node;
    while (
      current.parent &&
      (ts.isConditionalExpression(current.parent) ||
        ts.isBinaryExpression(current.parent) ||
        ts.isParenthesizedExpression(current.parent) ||
        ts.isAsExpression(current.parent) ||
        ts.isJsxExpression(current.parent) ||
        ts.isPropertyAssignment(current.parent) ||
        ts.isJsxAttribute(current.parent))
    ) {
      current = current.parent;
      const curLine = position(source, current).line;
      if (curLine !== line) {
        const curPrevious = lines[curLine - 2] || '';
        const curMatch = curPrevious.match(COMMENT_IGNORE_RE);
        if (curMatch && curMatch[1]?.trim()) return;
      }
    }

    const id = `${node.getStart(source)}:${rule}`;
    if (seen.has(id)) return;
    seen.add(id);
    issues.push({
      file,
      line,
      column,
      rule,
      severity,
      snippet: node.getText(source).slice(0, 200),
    });
  }
  function textExpression(node, rule, severity = 'error', allowStyle = false) {
    if (!node) return;
    const text = literal(node);
    if (text !== undefined) {
      if (allowStyle && isStyleOrTechnicalValue(text)) return;
      if (/\p{L}/u.test(text)) report(node, rule, severity);
    } else if (ts.isTemplateExpression(node)) {
      if (
        /\p{L}/u.test(
          node.head.text +
            node.templateSpans.map((s) => s.literal.text).join(''),
        )
      )
        report(node, rule, severity);
    } else if (ts.isConditionalExpression(node)) {
      textExpression(node.whenTrue, rule, severity, allowStyle);
      textExpression(node.whenFalse, rule, severity, allowStyle);
    } else if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        textExpression(node.left, rule, severity, allowStyle);
        textExpression(node.right, rule, severity, allowStyle);
      } else if (
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        textExpression(node.right, rule, severity, allowStyle);
      } else if (
        [
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind)
      ) {
        textExpression(node.left, rule, severity, allowStyle);
        textExpression(node.right, rule, severity, allowStyle);
      }
    } else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) {
      textExpression(node.expression, rule, severity, allowStyle);
    }
  }
  function visit(node) {
    // Swagger metadata is developer documentation, not application UI text.
    if (
      ts.isDecorator(node) &&
      ts.isCallExpression(node.expression) &&
      /^Api[A-Z]/.test(node.expression.expression.getText(source))
    )
      return;
    if (
      ts.isJsxText(node) &&
      /\p{L}/u.test(
        node.text.replace(
          /&(?:quot|apos|ldquo|rdquo|lsquo|rsquo|nbsp|amp|lt|gt);/gi,
          '',
        ),
      )
    )
      report(node, 'jsx-text');
    if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent))
      textExpression(node.expression, 'jsx-expression');
    if (ts.isJsxAttribute(node) && attributes.has(node.name.getText(source))) {
      const value = node.initializer;
      textExpression(
        value && ts.isJsxExpression(value) ? value.expression : value,
        'ui-attribute',
      );
    }
    if (
      ts.isPropertyAssignment(node) &&
      candidates.has(propertyName(node.name))
    ) {
      const name = propertyName(node.name);
      if (name === 'defaultValue') {
        const call = node.parent.parent;
        if (
          !ts.isCallExpression(call) ||
          !/(?:^|\.)(?:t|translate)$/.test(call.expression.getText(source))
        ) {
          ts.forEachChild(node, visit);
          return;
        }
      }
      if (name === 'message') {
        const text = literal(node.initializer);
        if (text && /^[a-z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)+$/.test(text)) {
          ts.forEachChild(node, visit);
          return;
        }
      }
      const allowStyle =
        name === 'text' &&
        !attributes.has(name) &&
        hasTechnicalStyleContext(node);
      textExpression(
        node.initializer,
        name === 'defaultValue' ? 'translation-fallback' : 'display-property',
        name === 'defaultValue' ? 'error' : 'warning',
        allowStyle,
      );
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression.getText(source);
      const args = node.arguments || [];
      if (ts.isNewExpression(node) && /(?:^|\.)\w*Exception$/.test(callee)) {
        textExpression(args[0], 'exception-message');
        if (args[0] && ts.isObjectLiteralExpression(args[0])) {
          for (const prop of args[0].properties)
            if (
              ts.isPropertyAssignment(prop) &&
              propertyName(prop.name) === 'message'
            )
              textExpression(prop.initializer, 'exception-message');
        }
      }
      if (
        /^(?:toast|message|notification)(?:\.(?:success|error|warning|info|loading))?$/.test(
          callee,
        )
      )
        textExpression(args[0], 'notification-text');
      if (callee === 'Alert.alert')
        args.slice(0, 2).forEach((arg) => textExpression(arg, 'alert-text'));
      if (
        [
          'alert',
          'confirm',
          'prompt',
          'window.alert',
          'window.confirm',
          'window.prompt',
        ].includes(callee)
      )
        textExpression(args[0], 'alert-text');
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ['min', 'max', 'email', 'regex', 'refine', 'nonempty', 'url'].includes(
          node.expression.name.text,
        )
      )
        textExpression(args.at(-1), 'validation-message', 'warning');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return issues;
}

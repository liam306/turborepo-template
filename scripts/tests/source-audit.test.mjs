import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditHardcodedText } from '../lib/hardcoded-text.mjs';
import { translationUsage } from '../lib/translation-usage.mjs';

test('translation namespaces stay inside lexical scopes, with aliases and rich calls', () => {
  const content = `
    import { useTranslations as useT } from 'next-intl';
    function A() { const t = useT('auth'); t.rich('login'); }
    async function B() {
      const t = await getTranslations({ locale: 'vi', namespace: 'common' });
      t.raw('save');
      t(\`status.\${status}\`);
    }
  `;
  const result = translationUsage('file.tsx', content, 'web');
  assert.deepEqual(
    result.occurrences.map((item) => item.key),
    ['auth.login', 'common.save'],
  );
  assert.deepEqual([...result.dynamicPrefixes], ['common.status.']);
  assert.equal(result.unresolved.length, 1);
});

test('mobile keyPrefix and renamed binding resolve keys', () => {
  const result = translationUsage(
    'file.tsx',
    `
    const { t: translate } = useTranslation(undefined, { keyPrefix: 'auth' });
    translate('login');
    i18n.t('common.save');
  `,
    'mobile',
  );
  assert.deepEqual(
    result.occurrences.map((item) => item.key),
    ['auth.login', 'common.save'],
  );
});

test('translator aliases and asserted finite conditional keys resolve without guessing runtime keys', () => {
  const result = translationUsage(
    'file.tsx',
    `
    const t = useTranslations('auth');
    const translate = t;
    translate((signedIn ? 'login' : 'signup') as never);
    translate(dynamicKey as never);
    function other(translate) { translate('notTranslation'); }
  `,
    'web',
  );
  assert.deepEqual(
    result.occurrences.map(({ key }) => key),
    ['auth.login', 'auth.signup'],
  );
  assert.equal(result.unresolved.length, 1);
});

test('comments ignored and shadowed t is not treated as translator', () => {
  const result = translationUsage(
    'file.ts',
    `
    // t('missing')
    const t = useTranslations('auth');
    function other(t) { t('notTranslation'); }
    t('login');
  `,
    'web',
  );
  assert.deepEqual(
    result.occurrences.map((item) => item.key),
    ['auth.login'],
  );
});

test('hardcoded JSX, Unicode attributes, expressions, alerts and exceptions caught', () => {
  const result = auditHardcodedText(
    'file.tsx',
    `
    const view = <><Button>Save</Button><Text>{'Đăng nhập'}</Text>
      <Input placeholder="Tìm kiếm" aria-label={'Search'} /></>;
    toast.error(\`Failed \${count} items\`);
    Alert.alert('Error', 'Try again');
    throw new BadRequestException('Invalid input');
  `,
  );
  assert.equal(result.filter((issue) => issue.severity === 'error').length, 8);
  assert.ok(result.every((issue) => issue.line > 0 && issue.column > 0));
});

test('technical strings, translations and comments do not trigger', () => {
  assert.deepEqual(
    auditHardcodedText(
      'file.tsx',
      `
    import Widget from './Widget';
    const route = '/login'; const code = 'INVALID_INPUT';
    console.log('Debug message');
    const settings = { defaultValue: 'user' };
    const palette = { text: '#ffffff', background: '#000000' };
    const styles = { text: 'text-emerald-700 dark:text-emerald-400 font-bold' };
    // <Button>Save</Button>
    const view = <Button className="flex gap-2">{t('save')}</Button>;
    const conditional = <Text>{mode === 'single' && t('save')}</Text>;
  `,
    ),
    [],
  );
});

test('display properties warn, translation fallback errors, suppression needs reason', () => {
  const result = auditHardcodedText(
    'file.ts',
    `
    const options = { label: 'Settings' };
    t('save', { defaultValue: 'Save' });
    // i18n-audit-ignore: product name is not translated
    toast('Starter');
    // i18n-audit-ignore:
    toast('Save');
  `,
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].severity, 'warning');
  assert.equal(result[1].severity, 'error');
});

test('syntax errors fail rather than silently skipping invalid source', () => {
  assert.ok(
    auditHardcodedText('file.tsx', 'const view = <Button>').some(
      (issue) => issue.rule === 'source-syntax',
    ),
  );
});

test('Swagger descriptions are excluded but validation messages still warn', () => {
  const result = auditHardcodedText(
    'dto.ts',
    `
    class Dto {
      @ApiProperty({ description: 'Developer documentation' })
      @IsNotEmpty({ message: 'Name is required' })
      name: string;
    }
  `,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].snippet, "'Name is required'");
});

test('punctuation entities do not count as text but real text still does', () => {
  const issues = auditHardcodedText(
    'file.tsx',
    'const view = <Text>&quot;{word}&rdquo; Hello &amp; goodbye</Text>;',
  );
  assert.equal(issues.length, 1);
  assert.ok(issues[0].snippet.includes('Hello'));
  assert.deepEqual(
    auditHardcodedText(
      'file.tsx',
      'const view = <Text>&ldquo;{word}&rdquo;</Text>;',
    ),
    [],
  );
});

test('style exemptions are context-aware and do not suppress display text', () => {
  const code = `
    toast.error('flexible');
    const view = <Input placeholder={'bold'} aria-label={'flexible'} />;
    const config = { label: 'flexible' };
    const styles = { text: 'text-emerald-700 font-bold' };
    const palette = { text: '#ffffff' };
  `;
  const issues = auditHardcodedText('file.tsx', code);
  assert.equal(issues.length, 4);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  assert.equal(errors.length, 3);
  assert.equal(warnings.length, 1);
  assert.ok(
    errors.some(
      (i) => i.rule === 'notification-text' && i.snippet.includes('flexible'),
    ),
  );
  assert.ok(
    errors.some((i) => i.rule === 'ui-attribute' && i.snippet.includes('bold')),
  );
  assert.ok(
    errors.some(
      (i) => i.rule === 'ui-attribute' && i.snippet.includes('flexible'),
    ),
  );
  assert.ok(
    warnings.some(
      (i) => i.rule === 'display-property' && i.snippet.includes('flexible'),
    ),
  );
});

test('ambiguous text properties without technical style context retain warnings', () => {
  const code = `
    const message = { text: 'hidden' };
    const conditionalMessage = { text: enabled ? 'block' : 'hidden' };
    const colorMessage = { text: '#ffffff' };
    const styleObj = { container: 'flex', text: 'hidden' };
    const themeColors = { text: '#ffffff' };
  `;
  const issues = auditHardcodedText('file.tsx', code);
  const warnings = issues.filter((i) => i.severity === 'warning');
  // message.text ('hidden'), conditionalMessage.text ('block', 'hidden'), colorMessage.text ('#ffffff')
  assert.equal(warnings.length, 4);
  assert.ok(warnings.some((i) => i.snippet.includes("'hidden'")));
  assert.ok(warnings.some((i) => i.snippet.includes("'block'")));
  assert.ok(warnings.some((i) => i.snippet.includes("'#ffffff'")));
  // styleObj has container sibling; themeColors has theme prefix in identifier -> no warnings for them
  assert.ok(!warnings.some((i) => i.snippet.includes('styleObj')));
});

test('translation key in message property and matching header key do not trigger warnings', () => {
  const code = `
    const validKey = { message: 'common.errors.invalidData' };
    const invalidText = { message: 'Audio file is too large' };
    const excelCol = { header: 'code', key: 'code' };
    const displayHeader = { header: 'User Name' };
  `;
  const issues = auditHardcodedText('file.ts', code);
  const warnings = issues.filter((i) => i.severity === 'warning');
  assert.equal(warnings.length, 2);
  assert.ok(
    warnings.some((i) => i.snippet.includes("'Audio file is too large'")),
  );
  assert.ok(warnings.some((i) => i.snippet.includes("'User Name'")));
  assert.ok(
    !warnings.some((i) => i.snippet.includes('common.errors.invalidData')),
  );
  assert.ok(!warnings.some((i) => i.snippet.includes("'code'")));
});

test('file-level suppression requires reason and suppresses file', () => {
  const ignoredWithReason = `// i18n-audit-file-ignore: Static application test fixtures
    export const SEED = [{ title: 'Travelling' }];
  `;
  assert.deepEqual(auditHardcodedText('seed.ts', ignoredWithReason), []);

  const ignoredWithoutReason = `// i18n-audit-file-ignore:
    export const SEED = [{ title: 'Travelling' }];
  `;
  const issues = auditHardcodedText('seed.ts', ignoredWithoutReason);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].rule, 'display-property');
});

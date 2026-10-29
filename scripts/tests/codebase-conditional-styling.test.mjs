import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFileConditionalStyling } from '../lib/codebase-rules/conditional-styling.mjs';

test('detects template literals with interpolation and suffixes without cn', () => {
  const code = `
    export function View({ active }) {
      return (
        <div>
          <span className={\`base \${active}\`} />
          <div className={\`base \${active} extra\`} />
        </div>
      );
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 2);
  assert.ok(
    diagnostics[0].message.includes(
      'Forbidden template literal in className without cn()',
    ),
  );
  assert.ok(
    diagnostics[1].message.includes(
      'Forbidden template literal in className without cn()',
    ),
  );
});

test('detects raw ternary and logical expressions in className', () => {
  const code = `
    export function View({ active }) {
      return (
        <div>
          <button className={active ? "bg-blue-500" : "bg-gray-500"} />
          <p className={active && "font-bold"} />
          <p className={"prefix " + active} />
        </div>
      );
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 3);
  assert.ok(diagnostics[0].message.includes('Forbidden ternary in className'));
  assert.ok(
    diagnostics[1].message.includes('Forbidden expression in className'),
  );
  assert.ok(
    diagnostics[2].message.includes('Forbidden expression in className'),
  );
});

test('unrelated cn() in another attribute does not mask invalid className', () => {
  const code = `
    import { cn } from '@/lib/utils';
    export function View({ active }) {
      return (
        <div
          title={cn('always-good')}
          className={\`p-4 \${active ? 'text-red-500' : ''}\`}
        />
      );
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, 'CONDITIONAL_STYLING');
});

test('multiline JSX with cn() passes with zero diagnostics', () => {
  const code = `
    import { cn } from '@/lib/utils';
    export function View({ active, size }) {
      return (
        <div
          className={cn(
            'flex items-center',
            active && 'bg-blue-100',
            size === 'lg' ? 'p-6' : 'p-2'
          )}
        />
      );
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 0);
});

test('static string and forwarded className prop pass with zero diagnostics', () => {
  const code = `
    export function View({ className }) {
      return <div className="static-class" id={className}><span className={className} /></div>;
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 0);
});

test('using cn() without importing it flags error', () => {
  const code = `
    export function View({ active }) {
      return <div className={cn('base', active && 'active')} />;
    }
  `;
  const diagnostics = checkFileConditionalStyling(
    '/workspace/apps/web/src/components/View.tsx',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.ok(
    diagnostics[0].message.includes("Function 'cn' used but not imported"),
  );
});

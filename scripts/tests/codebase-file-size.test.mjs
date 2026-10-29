import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFileSize } from '../lib/codebase-rules/file-size.mjs';

test('file with exactly 300 lines passes, 301 lines triggers warning', () => {
  const content300 = Array(300).fill('const a = 1;').join('\n');
  const d300 = checkFileSize(
    '/workspace/apps/api/src/feature/service.ts',
    '/workspace',
    content300,
  );
  assert.equal(d300.length, 0);

  const content301 = Array(301).fill('const a = 1;').join('\n');
  const d301 = checkFileSize(
    '/workspace/apps/api/src/feature/service.ts',
    '/workspace',
    content301,
  );
  assert.equal(d301.length, 1);
  assert.equal(d301[0].rule, 'FILE_SIZE');
  assert.equal(d301[0].severity, 'warning');
  assert.ok(d301[0].message.includes('301 lines'));
});

test('trailing newline does not falsely inflate line count', () => {
  const content = Array(300).fill('console.log(1);').join('\n') + '\n';
  const diagnostics = checkFileSize(
    '/workspace/apps/api/src/feature/service.ts',
    '/workspace',
    content,
  );
  assert.equal(diagnostics.length, 0);
});

test('CRLF line endings are handled identically to LF', () => {
  const content301Crlf = Array(301).fill('const a = 1;').join('\r\n') + '\r\n';
  const diagnostics = checkFileSize(
    '/workspace/apps/api/src/feature/service.ts',
    '/workspace',
    content301Crlf,
  );
  assert.equal(diagnostics.length, 1);
  assert.ok(diagnostics[0].message.includes('301 lines'));
});

test('documented exceptions in policy pass regardless of size', () => {
  const bigContent = Array(600).fill('// data row').join('\n');
  const diagnostics = checkFileSize(
    '/workspace/packages/types/src/admin.ts',
    '/workspace',
    bigContent,
  );
  assert.equal(diagnostics.length, 0);
});

test('test files are exempt from functional file size limit', () => {
  const bigTest = Array(500)
    .fill('it("tests something", () => {});')
    .join('\n');
  const diagnostics = checkFileSize(
    '/workspace/apps/api/src/feature/service.spec.ts',
    '/workspace',
    bigTest,
  );
  assert.equal(diagnostics.length, 0);
});

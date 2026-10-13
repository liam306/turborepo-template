#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectSources } from './lib/source-audit.mjs';
import { auditHardcodedText } from './lib/hardcoded-text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let app = 'all';
let format = 'text';
let strict = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--strict') strict = true;
  else if (arg === '--app') app = args[++i];
  else if (arg.startsWith('--app=')) app = arg.slice(6);
  else if (arg === '--format') format = args[++i];
  else if (arg.startsWith('--format=')) format = arg.slice(9);
  else if (['api', 'web', 'mobile', 'all'].includes(arg)) app = arg;
  else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}
if (
  !['api', 'web', 'mobile', 'all'].includes(app) ||
  !['text', 'json'].includes(format)
) {
  console.error(
    'Usage: pnpm check:hardcoded [--app api|web|mobile|all] [--format text|json] [--strict]',
  );
  process.exit(1);
}
const apps = app === 'all' ? ['api', 'web', 'mobile'] : [app];
const dirs = [
  ...apps.map((name) => `apps/${name}/src`),
  ...['core', 'database', 'types', 'utils'].map(
    (name) => `packages/${name}/src`,
  ),
];
const issues = dirs
  .flatMap((dir) => collectSources(path.join(root, dir)))
  .sort()
  .flatMap((file) => auditHardcodedText(file, fs.readFileSync(file, 'utf8')))
  .map((issue) => ({ ...issue, file: path.relative(root, issue.file) }));
const errors = issues.filter((issue) => issue.severity === 'error').length;
const warnings = issues.length - errors;
if (format === 'json')
  console.log(JSON.stringify({ errors, warnings, issues }, null, 2));
else {
  for (const issue of issues)
    console.log(
      `${issue.file}:${issue.line}:${issue.column} ${issue.severity.toUpperCase()} [${issue.rule}] ${issue.snippet}`,
    );
  console.log(
    `\nHardcoded text audit: ${errors} errors, ${warnings} warnings.`,
  );
}
process.exitCode = errors || (strict && warnings) ? 1 : 0;

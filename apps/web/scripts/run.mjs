import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, '..');
const rootDir = resolve(appDir, '../..');
const require = createRequire(import.meta.url);

function getEnvPort() {
  if (process.env.WEB_PORT) return process.env.WEB_PORT;
  if (process.env.PORT) return process.env.PORT;

  const envFiles = [
    resolve(appDir, '.env.local'),
    resolve(appDir, '.env.development'),
    resolve(appDir, '.env'),
    resolve(rootDir, '.env.local'),
    resolve(rootDir, '.env.development'),
    resolve(rootDir, '.env'),
  ];

  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const match = content.match(
        /^(?:export\s+)?(?:WEB_PORT|PORT)\s*=\s*(.*)$/m,
      );
      if (match) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (val) return val;
      }
    } catch {
      // ignore read errors
    }
  }

  return '3000';
}

const command = process.argv[2] || 'dev';
const extraArgs = process.argv.slice(3);
const port = getEnvPort();

const hasPortArg = extraArgs.some(
  (arg) =>
    arg === '-p' ||
    arg === '--port' ||
    arg.startsWith('-p=') ||
    arg.startsWith('--port='),
);

const nextBin = require.resolve('next/dist/bin/next');
const args = [nextBin, command];
if (!hasPortArg) {
  args.push('-p', port);
}
args.push(...extraArgs);

const child = spawn(process.execPath, args, {
  cwd: appDir,
  stdio: 'inherit',
});

const forwardSignal = (signal) => {
  if (child.pid) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

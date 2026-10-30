#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT_DIR = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  let envName = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-e' || arg === '--env') {
      envName = args[i + 1] || null;
      i++;
    } else if (arg.startsWith('-e=')) {
      envName = arg.slice(3);
    } else if (arg.startsWith('--env=')) {
      envName = arg.slice(6);
    } else if (!arg.startsWith('-') && !envName) {
      envName = arg;
    }
  }

  if (envName) {
    envName = envName
      .trim()
      .replace(/^\.env\./, '')
      .replace(/^\./, '');
  }

  return { envName: envName || null };
}

function parseEnv(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawVal] = match;
    let val = rawVal.trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    result[key] = val;
  }

  return result;
}

function formatEnvValue(val) {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str === '') return '';
  if (
    str.includes(' ') ||
    str.includes('"') ||
    str.includes("'") ||
    str.includes('<') ||
    str.includes('>') ||
    str.includes('\n')
  ) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

function parseDatabaseUrl(url) {
  if (!url) return {};
  try {
    const parsed = new URL(url);
    return {
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password:
        parsed.password !== undefined && parsed.password !== ''
          ? decodeURIComponent(parsed.password)
          : undefined,
      database: parsed.pathname
        ? parsed.pathname.replace(/^\//, '')
        : undefined,
      port: parsed.port || undefined,
    };
  } catch {
    return {};
  }
}

function resolveAppConfig(appName, envName, rootEnv, rootExampleEnv) {
  const mergedRoot = { ...rootExampleEnv, ...rootEnv };
  const dbUrl = rootEnv.DATABASE_URL || rootExampleEnv.DATABASE_URL || '';
  const parsedDb = parseDatabaseUrl(dbUrl);

  const postgresUser =
    rootEnv.POSTGRES_USER ??
    parsedDb.user ??
    rootExampleEnv.POSTGRES_USER ??
    'postgres';

  const postgresPassword =
    rootEnv.POSTGRES_PASSWORD ??
    parsedDb.password ??
    rootExampleEnv.POSTGRES_PASSWORD ??
    'postgres';

  const postgresDb =
    rootEnv.POSTGRES_DB ??
    parsedDb.database ??
    rootExampleEnv.POSTGRES_DB ??
    'app_db';

  const postgresPort =
    rootEnv.POSTGRES_PORT ??
    parsedDb.port ??
    rootExampleEnv.POSTGRES_PORT ??
    '5432';

  // Special mappings per application
  const appMappings = {
    'apps/api': {
      PORT:
        rootEnv.PORT ??
        rootEnv.API_PORT ??
        rootExampleEnv.PORT ??
        rootExampleEnv.API_PORT ??
        '4000',
      NODE_ENV: rootEnv.NODE_ENV ?? envName ?? 'development',
      POSTGRES_USER: postgresUser,
      POSTGRES_PASSWORD: postgresPassword,
      POSTGRES_DB: postgresDb,
      POSTGRES_PORT: postgresPort,
      COOKIE_DOMAIN:
        rootEnv.COOKIE_DOMAIN ?? rootExampleEnv.COOKIE_DOMAIN ?? '',
    },
    'apps/web': {
      WEB_PORT: rootEnv.WEB_PORT ?? rootExampleEnv.WEB_PORT ?? '3000',
      NEXT_PUBLIC_API_URL:
        rootEnv.NEXT_PUBLIC_API_URL ??
        rootExampleEnv.NEXT_PUBLIC_API_URL ??
        `http://localhost:${rootEnv.PORT ?? rootEnv.API_PORT ?? 4000}`,
      NEXT_PUBLIC_STORAGE_URL:
        rootEnv.NEXT_PUBLIC_STORAGE_URL ??
        rootEnv.STORAGE_PUBLIC_URL_PREFIX ??
        rootExampleEnv.NEXT_PUBLIC_STORAGE_URL ??
        rootExampleEnv.STORAGE_PUBLIC_URL_PREFIX ??
        'http://localhost:8333/app-storage',
      NEXT_PUBLIC_POSTHOG_KEY:
        rootEnv.NEXT_PUBLIC_POSTHOG_KEY ??
        rootEnv.POSTHOG_API_KEY ??
        rootExampleEnv.NEXT_PUBLIC_POSTHOG_KEY ??
        rootExampleEnv.POSTHOG_API_KEY ??
        '',
      NEXT_PUBLIC_POSTHOG_HOST:
        rootEnv.NEXT_PUBLIC_POSTHOG_HOST ??
        rootEnv.POSTHOG_HOST ??
        rootExampleEnv.NEXT_PUBLIC_POSTHOG_HOST ??
        rootExampleEnv.POSTHOG_HOST ??
        'https://us.i.posthog.com',
    },
    'apps/mobile': {
      EXPO_PUBLIC_API_URL:
        rootEnv.EXPO_PUBLIC_API_URL ??
        rootEnv.NEXT_PUBLIC_API_URL ??
        rootExampleEnv.EXPO_PUBLIC_API_URL ??
        rootExampleEnv.NEXT_PUBLIC_API_URL ??
        `http://localhost:${rootEnv.PORT ?? rootEnv.API_PORT ?? 4000}`,
      EXPO_PUBLIC_STORAGE_URL:
        rootEnv.EXPO_PUBLIC_STORAGE_URL ??
        rootEnv.STORAGE_PUBLIC_URL_PREFIX ??
        rootExampleEnv.EXPO_PUBLIC_STORAGE_URL ??
        rootExampleEnv.STORAGE_PUBLIC_URL_PREFIX ??
        'http://localhost:8333/app-storage',
      EXPO_PUBLIC_POSTHOG_API_KEY:
        rootEnv.EXPO_PUBLIC_POSTHOG_API_KEY ??
        rootEnv.POSTHOG_API_KEY ??
        rootExampleEnv.EXPO_PUBLIC_POSTHOG_API_KEY ??
        rootExampleEnv.POSTHOG_API_KEY ??
        '',
      EXPO_PUBLIC_POSTHOG_HOST:
        rootEnv.EXPO_PUBLIC_POSTHOG_HOST ??
        rootEnv.POSTHOG_HOST ??
        rootExampleEnv.EXPO_PUBLIC_POSTHOG_HOST ??
        rootExampleEnv.POSTHOG_HOST ??
        'https://us.i.posthog.com',
    },
  };

  return { mergedRoot, customMap: appMappings[appName] || {} };
}

function syncAppEnv(appName, envName, rootEnv, rootExampleEnv, targetFileName) {
  const appDir = resolve(ROOT_DIR, appName);

  // Check specific example template (e.g. .env.production.example) or fallback to .env.example
  const specificExamplePath = envName
    ? join(appDir, `.env.${envName}.example`)
    : null;
  const examplePath =
    specificExamplePath && existsSync(specificExamplePath)
      ? specificExamplePath
      : join(appDir, '.env.example');

  const targetPath = join(appDir, targetFileName);

  if (!existsSync(examplePath)) {
    console.warn(`[skip] ${appName}: .env.example not found`);
    return;
  }

  const exampleContent = readFileSync(examplePath, 'utf-8');
  const exampleLines = exampleContent.split(/\r?\n/);
  const { mergedRoot, customMap } = resolveAppConfig(
    appName,
    envName,
    rootEnv,
    rootExampleEnv,
  );

  let syncedCount = 0;
  const outputLines = exampleLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return line;

    const [, key, defaultValue] = match;
    let resolvedValue;

    if (key in customMap) {
      resolvedValue = customMap[key];
    } else if (key in mergedRoot) {
      resolvedValue = mergedRoot[key];
    } else {
      let cleanedDefault = defaultValue.trim();
      if (
        (cleanedDefault.startsWith('"') && cleanedDefault.endsWith('"')) ||
        (cleanedDefault.startsWith("'") && cleanedDefault.endsWith("'"))
      ) {
        cleanedDefault = cleanedDefault.slice(1, -1);
      }
      resolvedValue = cleanedDefault;
    }

    syncedCount++;
    return `${key}=${formatEnvValue(resolvedValue)}`;
  });

  writeFileSync(targetPath, outputLines.join('\n') + '\n', 'utf-8');
  console.log(
    `[synced] ${appName}/${targetFileName} (${syncedCount} variables)`,
  );
}

function main() {
  const { envName } = parseArgs();
  const targetFileName = envName ? `.env.${envName}` : '.env';

  const rootExamplePath = resolve(ROOT_DIR, '.env.example');
  const rootExampleEnv = existsSync(rootExamplePath)
    ? parseEnv(readFileSync(rootExamplePath, 'utf-8'))
    : {};

  const baseEnvPath = resolve(ROOT_DIR, '.env');
  const baseEnv = existsSync(baseEnvPath)
    ? parseEnv(readFileSync(baseEnvPath, 'utf-8'))
    : {};

  let envSourcePath = null;
  let envSpecific = {};

  if (envName) {
    const targetSourcePath = resolve(ROOT_DIR, `.env.${envName}`);
    if (existsSync(targetSourcePath)) {
      envSourcePath = targetSourcePath;
      envSpecific = parseEnv(readFileSync(targetSourcePath, 'utf-8'));
    } else if (existsSync(baseEnvPath)) {
      console.warn(
        `[notice] Root .env.${envName} not found. Using root .env as base source.`,
      );
      envSourcePath = baseEnvPath;
    } else {
      console.warn(
        `[warning] Root .env.${envName} and root .env not found. Falling back to .env.example.`,
      );
      envSourcePath = rootExamplePath;
    }
  } else {
    if (existsSync(baseEnvPath)) {
      envSourcePath = baseEnvPath;
    } else {
      console.warn(
        '[warning] Root .env not found. Falling back to root .env.example values.',
      );
      envSourcePath = rootExamplePath;
    }
  }

  // Final root env composition: example -> base .env -> .env.<envName>
  const rootEnv = {
    ...baseEnv,
    ...envSpecific,
  };

  const targets = ['apps/api', 'apps/web', 'apps/mobile'];

  console.log(
    `Syncing [${targetFileName}] to applications (source: ${envSourcePath ? envSourcePath.replace(ROOT_DIR + '/', '') : 'none'})...`,
  );

  for (const target of targets) {
    syncAppEnv(target, envName, rootEnv, rootExampleEnv, targetFileName);
  }

  console.log('Sync completed.');
}

main();

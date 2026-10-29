/**
 * Architectural policy rules, dependency matrix, and documented exceptions for turborepo-template.
 */

export const PROHIBITED_DOMAIN_TABLES = new Set(['user', 'users']);

export const PACKAGE_IMPORT_POLICY = {
  types: {
    name: '@repo/types',
    allowedWorkspacePackages: [],
    prohibitedImportPatterns: [
      '@nestjs',
      'drizzle-orm',
      'better-auth',
      'class-validator',
      'class-transformer',
      '@repo/core',
      '@repo/database',
      '@repo/utils',
    ],
  },
  utils: {
    name: '@repo/utils',
    allowedWorkspacePackages: ['@repo/types'],
    prohibitedImportPatterns: [
      '@nestjs',
      'drizzle-orm',
      'better-auth',
      'class-validator',
      'class-transformer',
      '@repo/core',
      '@repo/database',
    ],
  },
  core: {
    name: '@repo/core',
    allowedWorkspacePackages: ['@repo/types', '@repo/utils'],
    prohibitedImportPatterns: [
      '@nestjs',
      'drizzle-orm',
      'better-auth',
      'class-validator',
      'class-transformer',
      '@repo/database',
    ],
  },
  database: {
    name: '@repo/database',
    allowedWorkspacePackages: ['@repo/types', '@repo/utils'],
    prohibitedImportPatterns: [
      '@nestjs',
      'better-auth',
      'class-validator',
      'class-transformer',
      '@repo/core',
    ],
  },
  web: {
    name: '@repo/web',
    allowedWorkspacePackages: ['@repo/types', '@repo/utils', '@repo/core'],
    prohibitedImportPatterns: [
      '@repo/database',
      'class-validator',
      'class-transformer',
    ],
  },
  mobile: {
    name: '@repo/mobile',
    allowedWorkspacePackages: ['@repo/types', '@repo/utils', '@repo/core'],
    prohibitedImportPatterns: [
      '@repo/database',
      'class-validator',
      'class-transformer',
    ],
  },
  api: {
    name: '@repo/api',
    allowedWorkspacePackages: [
      '@repo/types',
      '@repo/utils',
      '@repo/core',
      '@repo/database',
    ],
    prohibitedImportPatterns: [],
  },
};

export const FILE_SIZE_LIMIT = 300;

export const DOCUMENTED_FILE_SIZE_EXCEPTIONS = new Map([
  [
    'packages/types/src/admin.ts',
    'Aggregated administrative domain contracts and models',
  ],
]);

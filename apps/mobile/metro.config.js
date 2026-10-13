const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from both mobile and monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force Metro to use CommonJS (require) instead of ESM (import) for libraries that provide both.
// This avoids issues like 'import.meta' syntax errors on the web.
config.resolver.unstable_conditionNames = [
  'browser',
  'require',
  'react-native',
];

// Ensure we handle .mjs and .cjs files correctly
if (!config.resolver.sourceExts.includes('mjs'))
  config.resolver.sourceExts.push('mjs');
if (!config.resolver.sourceExts.includes('cjs'))
  config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './src/global.css' });

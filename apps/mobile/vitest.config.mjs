import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    environment: 'node',
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'react-native': 'react-native-web',
    },
  },
});

import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  const envFiles = [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env.production'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env.production'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const match = content.match(/^NEXT_PUBLIC_API_URL\s*=\s*(.*)$/m);
        if (match?.[1]) {
          return match[1].trim().replace(/^['"]|['"]$/g, '');
        }
      } catch {
        // ignore read errors
      }
    }
  }
  return '';
}

const isDev = process.env.NODE_ENV !== 'production';
const isCI = Boolean(process.env.CI);
const apiUrl = getApiUrl();
const isLocalhostApi = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(
  apiUrl,
);
const allowLocalhost = isDev || isCI || isLocalhostApi;

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://*.sentry.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https: ${allowLocalhost ? 'http: http://localhost:* http://127.0.0.1:*' : ''};
  font-src 'self' data:;
  media-src 'self' blob: data: https: ${allowLocalhost ? 'http: http://localhost:* http://127.0.0.1:*' : ''};
  worker-src 'self' blob:;
  connect-src 'self' https: wss: ws: ${allowLocalhost ? 'http: ws: http://localhost:* http://127.0.0.1:*' : ''};
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  transpilePackages: ['@repo/core', '@repo/types', '@repo/utils'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppress logs unless in CI
  silent: !process.env.CI,
  // Only upload source maps if auth token is present
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});

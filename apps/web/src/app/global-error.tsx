'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const MESSAGES = {
  en: {
    // i18n-audit-ignore: Standalone root error fallback dictionary outside next-intl provider
    title: 'Something went wrong',
    // i18n-audit-ignore: Standalone root error fallback dictionary outside next-intl provider
    description:
      'An unexpected error occurred. Please try reloading or return to the home page.',
    errorId: 'Error ID',
    devDetails: 'Error details (Development only)',
    tryAgain: 'Try again',
    home: 'Return to home',
  },
  vi: {
    // i18n-audit-ignore: Standalone root error fallback dictionary outside next-intl provider
    title: 'Đã có sự cố xảy ra',
    // i18n-audit-ignore: Standalone root error fallback dictionary outside next-intl provider
    description:
      'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc quay lại trang chủ.',
    errorId: 'Mã lỗi',
    devDetails: 'Chi tiết lỗi (Chế độ phát triển)',
    tryAgain: 'Thử lại',
    home: 'Quay lại trang chủ',
  },
} as const;

function resolveLocale(): 'en' | 'vi' {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match?.[1] === 'vi') return 'vi';
  }
  return 'en';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale] = useState<'en' | 'vi'>(resolveLocale);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isProduction = process.env.NODE_ENV === 'production';
  const t = MESSAGES[locale];

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center antialiased dark:bg-slate-950 dark:text-slate-100">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.title}
          </h2>

          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {t.description}
          </p>

          {error.digest && (
            <div className="mt-4 rounded bg-slate-100 px-3 py-2 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {t.errorId}: {error.digest}
            </div>
          )}

          {!isProduction && error.message && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-red-600 dark:text-red-400">
                {t.devDetails}
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-200">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Home className="h-4 w-4" />
              {t.home}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

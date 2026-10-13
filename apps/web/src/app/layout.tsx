import type { Metadata } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import { ThemeProvider, THEME_COOKIE_NAME } from '@/context/ThemeContext';
import { Toaster } from '@/components/Toaster';
import { ReactQueryProvider } from '@/providers/react-query-provider';
import { PostHogProvider } from '@/providers/posthog-provider';
import type { ThemeMode } from '@repo/types';

export const metadata: Metadata = {
  title: 'Starter',
  description: 'Turborepo Monorepo Starter',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

const themeScript = `
(function() {
  try {
    var m = document.cookie.match(/${THEME_COOKIE_NAME}=([^;]+)/);
    var t = m ? m[1] : (localStorage.getItem('theme') || 'system');
    var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const theme =
    (cookieStore.get(THEME_COOKIE_NAME)?.value as ThemeMode) || 'system';

  return (
    <html
      lang={locale}
      className={theme === 'dark' ? 'dark' : ''}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PostHogProvider>
            <ReactQueryProvider>
              <ThemeProvider defaultTheme={theme}>
                {children}
                <Toaster />
              </ThemeProvider>
            </ReactQueryProvider>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-extrabold text-foreground">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-muted-foreground">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export async function LandingHero() {
  const t = await getTranslations('landing');

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />

      <div className="mx-auto max-w-5xl px-6 text-center">
        <Badge
          variant="outline"
          className="mb-6 gap-2 border-primary/30 bg-primary/5 px-4 py-1.5 text-xs text-primary dark:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t('heroBadge')}</span>
        </Badge>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.15]">
          {t('heroTitle')}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto text-base shadow-lg shadow-primary/25"
          >
            <Link href="/login" className="flex items-center gap-2">
              <span>{t('ctaStart')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-base"
          >
            <Link href="/dashboard">{t('openDashboard')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

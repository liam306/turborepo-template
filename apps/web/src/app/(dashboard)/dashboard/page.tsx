'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from '@/lib/auth-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function DashboardPage() {
  const { data: session } = useSession();
  const tDash = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {tDash('welcome')}, {session?.user?.name || tCommon('user')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tDash('subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tDash('card1Title')}
            </CardTitle>
            <CardDescription>{tDash('card1Desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tDash('card1Value')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tDash('card2Title')}
            </CardTitle>
            <CardDescription>{tDash('card2Desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tDash('card2Value')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tDash('card3Title')}
            </CardTitle>
            <CardDescription>{tDash('card3Desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tDash('card3Value')}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

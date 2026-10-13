import React, { type ReactNode } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-react-native';
import { posthog } from '@/services/analytics';

export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!posthog) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog} autocapture={{ captureScreens: false }}>
      {children}
    </PHProvider>
  );
}

'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme === 'system' ? 'system' : theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          closeButton: '!left-auto !right-0 !translate-x-[35%]',
        },
      }}
    />
  );
}

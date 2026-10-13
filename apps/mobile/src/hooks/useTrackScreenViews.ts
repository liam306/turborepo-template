import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { trackScreen } from '@/services/analytics';

export function useTrackScreenViews() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      trackScreen(pathname);
    }
  }, [pathname]);
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { debounce, type DebouncedFunc } from '@repo/utils';

export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 400,
): DebouncedFunc<T> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const debounced = useMemo(() => {
    const handler = (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    };
    // eslint-disable-next-line react-hooks/refs
    return debounce(handler, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
}

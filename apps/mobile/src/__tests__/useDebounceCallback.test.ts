/* eslint-disable import/first */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const cleanupFns: (() => void)[] = [];
let mockRefTarget = { current: null as any };

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: vi.fn((initial) => {
      mockRefTarget = { current: initial };
      return mockRefTarget;
    }),
    useMemo: vi.fn((fn) => fn()),
    useEffect: vi.fn((effect) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        cleanupFns.push(cleanup);
      }
    }),
  };
});

import { useDebounceCallback } from '../hooks/useDebounceCallback';

describe('useDebounceCallback hook mobile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupFns.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('delays callback execution on mobile and executes with parameters', () => {
    const callback = vi.fn();
    const debounced = useDebounceCallback(callback, 350);

    debounced('mobile search');
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(349);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('mobile search');
  });

  it('cleans up pending execution on unmount', () => {
    const callback = vi.fn();
    const debounced = useDebounceCallback(callback, 300);

    debounced('mobile search');
    cleanupFns.forEach((cleanup) => cleanup());

    vi.advanceTimersByTime(350);
    expect(callback).not.toHaveBeenCalled();
  });
});

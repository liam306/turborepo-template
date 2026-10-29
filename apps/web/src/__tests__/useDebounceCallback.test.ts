import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const cleanupFns: Array<() => void> = [];
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

describe('useDebounceCallback hook (Seam 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupFns.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('delays callback execution and passes arguments', () => {
    const callback = vi.fn();
    const debounced = useDebounceCallback(callback, 300);

    debounced('query');
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('query');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('always calls the most recent callback function via ref', () => {
    const currentMsg = 'first';
    const callback1 = vi.fn(() => currentMsg);

    const debounced = useDebounceCallback(callback1, 300);
    debounced();

    // Callback updates before timer fires
    const callback2 = vi.fn(() => 'updated');
    mockRefTarget.current = callback2;

    vi.advanceTimersByTime(300);
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('cleans up pending execution on unmount', () => {
    const callback = vi.fn();
    const debounced = useDebounceCallback(callback, 300);

    debounced('query');

    // Trigger cleanup
    cleanupFns.forEach((cleanup) => cleanup());

    vi.advanceTimersByTime(400);
    expect(callback).not.toHaveBeenCalled();
  });
});

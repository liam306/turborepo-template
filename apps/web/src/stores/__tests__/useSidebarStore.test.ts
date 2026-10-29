import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { useSidebarStore } from '../useSidebarStore';

describe('useSidebarStore (Seam 1)', () => {
  beforeAll(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
    };
    // @ts-expect-error - mock global localStorage
    globalThis.localStorage = mockStorage;
    // @ts-expect-error - mock global window
    globalThis.window = { localStorage: mockStorage };
  });

  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ isCollapsed: false });
  });

  it('defaults isCollapsed to false', () => {
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });

  it('toggles isCollapsed state', () => {
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().isCollapsed).toBe(true);

    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });

  it('sets isCollapsed directly', () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().isCollapsed).toBe(true);

    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });
});

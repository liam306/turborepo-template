import { vi } from 'vitest';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

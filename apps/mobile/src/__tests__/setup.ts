import { vi } from 'vitest';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

vi.mock('nativewind', () => ({
  colorScheme: {
    set: vi.fn(),
  },
}));

vi.mock('@better-auth/expo/client', () => ({ expoClient: vi.fn() }));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

vi.mock('expo-apple-authentication', () => ({
  signInAsync: vi.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

vi.mock('react-native-svg', () => ({
  default: 'svg',
  Path: 'path',
}));

vi.mock('lucide-react-native', () => {
  const Dummy = () => null;
  return {
    __esModule: true,
    X: Dummy,
    MailCheck: Dummy,
    default: Dummy,
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  loadSavedLocale,
  saveUserLocale,
  STORAGE_KEY_LOCALE,
} from '../i18n';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Mobile i18n Persistence & Restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSavedLocale', () => {
    it('restores English preference from storage and changes i18n language', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('en');

      const restored = await loadSavedLocale();

      expect(restored).toBe('en');
      expect(i18n.language).toBe('en');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY_LOCALE);
    });

    it('restores Vietnamese preference from storage and changes i18n language', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('vi');

      const restored = await loadSavedLocale();

      expect(restored).toBe('vi');
      expect(i18n.language).toBe('vi');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY_LOCALE);
    });

    it('falls back to default locale when no stored preference exists', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const restored = await loadSavedLocale();

      expect(['vi', 'en']).toContain(restored);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY_LOCALE);
    });

    it('falls back to default locale when stored value is invalid', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('fr_FR');

      const restored = await loadSavedLocale();

      expect(['vi', 'en']).toContain(restored);
    });

    it('falls back to default locale when storage read throws', async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(
        new Error('Disk read error'),
      );

      const restored = await loadSavedLocale();

      expect(['vi', 'en']).toContain(restored);
    });
  });

  describe('saveUserLocale', () => {
    it('persists selected locale to storage and switches active i18n language', async () => {
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      await saveUserLocale('en');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_LOCALE,
        'en',
      );
      expect(i18n.language).toBe('en');
    });

    it('updates runtime language even if AsyncStorage write fails', async () => {
      vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(
        new Error('Storage quota exceeded'),
      );

      await saveUserLocale('vi');

      expect(i18n.language).toBe('vi');
    });
  });
});

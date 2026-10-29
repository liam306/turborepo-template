import { describe, expect, it } from 'vitest';
import { getLocalizedText } from '../i18n';

describe('getLocalizedText', () => {
  it('returns fallback when val is null or undefined', () => {
    expect(getLocalizedText(null, 'vi', 'Default')).toBe('Default');
    expect(getLocalizedText(undefined, 'en', 'Default')).toBe('Default');
  });

  it('returns plain string trimmed or fallback if empty', () => {
    expect(getLocalizedText(' Hello ')).toBe('Hello');
    expect(getLocalizedText('   ', 'vi', 'Fallback')).toBe('Fallback');
  });

  it('resolves Vietnamese text when locale is vi', () => {
    const textObj = { vi: 'Xin chào', en: 'Hello' };
    expect(getLocalizedText(textObj, 'vi')).toBe('Xin chào');
  });

  it('resolves English text when locale is en', () => {
    const textObj = { vi: 'Xin chào', en: 'Hello' };
    expect(getLocalizedText(textObj, 'en')).toBe('Hello');
  });

  it('falls back to alternate language or default fallback if preferred language is missing', () => {
    expect(getLocalizedText({ en: 'Hello' }, 'vi')).toBe('Hello');
    expect(getLocalizedText({ vi: 'Xin chào' }, 'en')).toBe('Xin chào');
    expect(getLocalizedText({}, 'vi', 'Fallback')).toBe('Fallback');
  });
});

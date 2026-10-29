import { describe, expect, it } from 'vitest';
import { getClientFallbackErrorMessage } from '../api-errors';

describe('getClientFallbackErrorMessage', () => {
  it('returns Vietnamese error messages by default or when vi locale is provided', () => {
    expect(getClientFallbackErrorMessage('networkError', 'vi')).toBe(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng',
    );
    expect(getClientFallbackErrorMessage('unexpectedError', 'vi')).toBe(
      'Đã xảy ra lỗi không mong muốn',
    );
  });

  it('returns English error messages when en locale is provided', () => {
    expect(getClientFallbackErrorMessage('networkError', 'en')).toBe(
      'Unable to connect to server. Please check your network connection',
    );
    expect(getClientFallbackErrorMessage('unexpectedError', 'en')).toBe(
      'An unexpected error occurred',
    );
  });

  it('falls back to English when an unknown locale is passed', () => {
    expect(getClientFallbackErrorMessage('networkError', 'fr')).toBe(
      'Unable to connect to server. Please check your network connection',
    );
  });
});

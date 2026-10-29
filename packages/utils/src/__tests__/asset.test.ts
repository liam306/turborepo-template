import { describe, expect, it } from 'vitest';
import { buildAssetUrl } from '../asset';

describe('buildAssetUrl', () => {
  it('returns null for empty, null, or non-string inputs', () => {
    expect(buildAssetUrl(null)).toBeNull();
    expect(buildAssetUrl(undefined)).toBeNull();
    expect(buildAssetUrl('')).toBeNull();
    expect(buildAssetUrl('   ')).toBeNull();
  });

  it('preserves absolute URLs unchanged', () => {
    expect(buildAssetUrl('http://example.com/image.png')).toBe(
      'http://example.com/image.png',
    );
    expect(buildAssetUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png',
    );
    expect(buildAssetUrl('blob:http://localhost:3000/uuid')).toBe(
      'blob:http://localhost:3000/uuid',
    );
    expect(buildAssetUrl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    );
    expect(buildAssetUrl('file:///path/to/image.png')).toBe(
      'file:///path/to/image.png',
    );
  });

  it('combines relative path with default storage base URL', () => {
    expect(buildAssetUrl('avatars/1.webp')).toBe(
      'http://localhost:8333/app/avatars/1.webp',
    );
    expect(buildAssetUrl('/avatars/1.webp')).toBe(
      'http://localhost:8333/app/avatars/1.webp',
    );
  });

  it('combines relative path with custom storage base URL and strips duplicate slashes', () => {
    expect(
      buildAssetUrl('images/logo.png', 'https://cdn.mysite.com/storage/'),
    ).toBe('https://cdn.mysite.com/storage/images/logo.png');
    expect(
      buildAssetUrl('/images/logo.png', 'https://cdn.mysite.com/storage///'),
    ).toBe('https://cdn.mysite.com/storage/images/logo.png');
  });
});

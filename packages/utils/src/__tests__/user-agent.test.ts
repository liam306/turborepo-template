import { describe, expect, it } from 'vitest';
import { parseUserAgent } from '../user-agent';

describe('user-agent parser', () => {
  it('returns unknown values for null or empty user-agent', () => {
    expect(parseUserAgent(null)).toEqual({
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    });
    expect(parseUserAgent('')).toEqual({
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    });
  });

  it('detects desktop operating systems and browsers', () => {
    const macChrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(macChrome)).toEqual({
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'macOS',
    });

    const winEdge =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    expect(parseUserAgent(winEdge)).toEqual({
      deviceType: 'desktop',
      browser: 'Microsoft Edge',
      os: 'Windows',
    });

    const linuxFirefox =
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
    expect(parseUserAgent(linuxFirefox)).toEqual({
      deviceType: 'desktop',
      browser: 'Firefox',
      os: 'Linux',
    });
  });

  it('detects mobile devices and browsers', () => {
    const iPhoneSafari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(iPhoneSafari)).toEqual({
      deviceType: 'mobile',
      browser: 'Safari',
      os: 'iOS',
    });

    const androidMobileChrome =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(parseUserAgent(androidMobileChrome)).toEqual({
      deviceType: 'mobile',
      browser: 'Chrome',
      os: 'Android',
    });
  });

  it('detects tablets and iPadOS', () => {
    const iPad =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(iPad)).toEqual({
      deviceType: 'tablet',
      browser: 'Safari',
      os: 'iPadOS',
    });

    const androidTablet =
      'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(androidTablet)).toEqual({
      deviceType: 'tablet',
      browser: 'Chrome',
      os: 'Android',
    });
  });

  it('detects tools and apps (cURL, Postman, Expo)', () => {
    expect(parseUserAgent('curl/8.1.2')).toEqual({
      deviceType: 'unknown',
      browser: 'cURL',
      os: 'Unknown',
    });
    expect(parseUserAgent('PostmanRuntime/7.32.3')).toEqual({
      deviceType: 'unknown',
      browser: 'Postman',
      os: 'Unknown',
    });
    expect(parseUserAgent('okhttp/4.9.2 StarterMobile/1.0.0 (Expo)')).toEqual({
      deviceType: 'mobile',
      browser: 'Mobile App',
      os: 'Unknown',
    });
  });
});

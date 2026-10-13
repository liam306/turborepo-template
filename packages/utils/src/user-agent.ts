import type { DeviceType } from '@repo/types';

export interface ParsedDeviceInfo {
  deviceType: DeviceType;
  browser: string;
  os: string;
}

export function parseUserAgent(uaString?: string | null): ParsedDeviceInfo {
  if (!uaString || typeof uaString !== 'string') {
    return {
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  const ua = uaString.trim();

  // OS detection
  let os = 'Unknown';
  if (/windows phone/i.test(ua)) {
    os = 'Windows Phone';
  } else if (/win(dows|98|nt|xp|7|8|10|11)/i.test(ua)) {
    os = 'Windows';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
  } else if (/iphone|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/cros/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Device type detection
  let deviceType: DeviceType = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (os === 'Unknown') {
    deviceType = 'unknown';
  }

  // Browser detection (order matters because modern browsers include legacy tokens)
  let browser = 'Unknown';
  if (/edg([ea]|ios)?\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/starter|expo/i.test(ua)) {
    browser = 'Mobile App';
  } else if (/postmanruntime/i.test(ua)) {
    browser = 'Postman';
  } else if (/curl/i.test(ua)) {
    browser = 'cURL';
  }

  return { deviceType, browser, os };
}

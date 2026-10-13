export interface ClientCookieOptions {
  path?: string;
  maxAge?: number;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

export function setClientCookie(
  name: string,
  value: string,
  options: ClientCookieOptions = {},
): void {
  if (typeof document === 'undefined') return;

  const { path = '/', maxAge = 31536000, sameSite = 'Lax' } = options;
  const isSecure =
    typeof window !== 'undefined' && window.location.protocol === 'https:';

  let cookieStr = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`;
  if (isSecure) {
    cookieStr += '; Secure';
  }

  document.cookie = cookieStr;
}

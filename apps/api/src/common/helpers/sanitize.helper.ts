const SENSITIVE_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'otp',
  'authorization',
  'cookie',
  'cvv',
  'creditcard',
]);

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 5;

export function sanitizePayload(data: unknown, depth = 0): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (data.length > MAX_STRING_LENGTH) {
      return `${data.slice(0, MAX_STRING_LENGTH)}... [truncated ${data.length} chars]`;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (depth >= MAX_DEPTH) {
    return '[MaxDepth]';
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      sanitized[key] = '***';
    } else {
      sanitized[key] = sanitizePayload(value, depth + 1);
    }
  }

  return sanitized;
}

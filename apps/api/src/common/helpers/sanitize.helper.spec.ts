import { sanitizePayload } from './sanitize.helper';

describe('sanitizePayload', () => {
  it('should return primitive values unchanged', () => {
    expect(sanitizePayload(null)).toBeNull();
    expect(sanitizePayload(undefined)).toBeUndefined();
    expect(sanitizePayload(123)).toBe(123);
    expect(sanitizePayload(true)).toBe(true);
    expect(sanitizePayload('hello')).toBe('hello');
  });

  it('should mask sensitive keys', () => {
    const input = {
      email: 'test@example.com',
      password: 'supersecretpassword',
      token: 'jwt.token.here',
      refreshToken: 'refresh.token.here',
      otp: '123456',
      creditCard: '1234-5678-9012-3456',
    };

    const output = sanitizePayload(input) as Record<string, unknown>;

    expect(output.email).toBe('test@example.com');
    expect(output.password).toBe('***');
    expect(output.token).toBe('***');
    expect(output.refreshToken).toBe('***');
    expect(output.otp).toBe('***');
    expect(output.creditCard).toBe('***');
  });

  it('should handle nested objects and arrays', () => {
    const input = {
      user: {
        username: 'john',
        password: 'secretPassword',
      },
      list: [
        { token: 'secretToken', name: 'item1' },
        { token: 'anotherSecret', name: 'item2' },
      ],
    };

    const output = sanitizePayload(input) as any;

    expect(output.user.username).toBe('john');
    expect(output.user.password).toBe('***');
    expect(output.list[0].token).toBe('***');
    expect(output.list[0].name).toBe('item1');
    expect(output.list[1].token).toBe('***');
  });

  it('should truncate strings longer than 500 characters', () => {
    const longString = 'a'.repeat(600);
    const output = sanitizePayload(longString) as string;

    expect(output.length).toBeLessThan(600);
    expect(output).toContain('... [truncated 600 chars]');
  });
});

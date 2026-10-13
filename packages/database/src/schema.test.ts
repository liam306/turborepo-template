import { describe, expect, it } from 'vitest';
import { user, session, account, verification } from './schema';

describe('schema', () => {
  it('exports auth schema tables', () => {
    expect(user).toBeDefined();
    expect(session).toBeDefined();
    expect(account).toBeDefined();
    expect(verification).toBeDefined();
  });
});

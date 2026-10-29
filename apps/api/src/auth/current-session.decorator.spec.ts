import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CurrentSession } from './current-session.decorator';
import { AuthSession } from './auth.types';

function getParamDecoratorFactory() {
  class TestController {
    testMethod(@CurrentSession() _session: AuthSession) {
      return _session;
    }
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'testMethod',
  );
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentSession decorator', () => {
  const factory = getParamDecoratorFactory();

  const mockSession: AuthSession = {
    id: 'sess_123',
    userId: 'user_1',
    token: 'tok_abc',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    expiresAt: new Date('2026-02-01'),
  };

  const createMockContext = (session?: AuthSession): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ session }),
      }),
    } as unknown as ExecutionContext;
  };

  it('returns entire session object when no property key is specified', () => {
    const context = createMockContext(mockSession);
    const result = factory(undefined, context);
    expect(result).toEqual(mockSession);
  });

  it('returns specific session property when key is specified', () => {
    const context = createMockContext(mockSession);
    const result = factory('id', context);
    expect(result).toBe('sess_123');
  });

  it('returns null when request has no session', () => {
    const context = createMockContext(undefined);
    const result = factory(undefined, context);
    expect(result).toBeNull();
  });
});

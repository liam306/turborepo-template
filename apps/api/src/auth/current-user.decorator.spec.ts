import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from './auth.types';

function getParamDecoratorFactory() {
  class TestController {
    testMethod(@CurrentUser() _user: AuthUser) {
      return _user;
    }
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'testMethod',
  );
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser decorator', () => {
  const factory = getParamDecoratorFactory();

  const mockUser: AuthUser = {
    id: 'user_test_1',
    name: 'Test User',
    email: 'test@example.local',
    emailVerified: true,
  };

  const createMockContext = (user?: AuthUser): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should return entire user object when no property key is specified', () => {
    const context = createMockContext(mockUser);
    const result = factory(undefined, context);
    expect(result).toEqual(mockUser);
  });

  it('should return specific user property when key is specified', () => {
    const context = createMockContext(mockUser);
    const result = factory('id', context);
    expect(result).toBe('user_test_1');
  });

  it('should return null when request has no user', () => {
    const context = createMockContext(undefined);
    const result = factory(undefined, context);
    expect(result).toBeNull();
  });
});

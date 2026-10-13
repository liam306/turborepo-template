import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthSession } from './auth.types';

export const CurrentSession = createParamDecorator(
  (data: keyof AuthSession | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session as AuthSession | undefined;

    if (!session) {
      return null;
    }

    return data ? session[data] : session;
  },
);

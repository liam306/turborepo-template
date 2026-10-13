import { Controller, All, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: VERSION_NEUTRAL })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  @ApiOperation({ summary: 'Handle authentication endpoints (Better Auth)' })
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    const handler = toNodeHandler(this.authService.auth.handler);
    return handler(req, res);
  }
}

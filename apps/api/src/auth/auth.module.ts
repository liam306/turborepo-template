import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BootstrapController } from './bootstrap.controller';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard],
  controllers: [AuthController, BootstrapController],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard],
})
export class AuthModule {}

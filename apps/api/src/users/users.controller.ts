import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  ParseFilePipeBuilder,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AdminOnly } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentSession } from '../auth/current-session.decorator';
import { AuthSession, AuthUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get user profile and linked authentication providers',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'User profile details' })
  async getProfile(
    @CurrentUser() user: AuthUser,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.getProfile(user.id, lang || 'vi');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile (display name, etc.)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.updateProfile(user.id, dto, lang || 'vi');
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload and optimize avatar image (convert to WebP 512x512)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|heic)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB limit
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: Express.Multer.File,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.uploadAvatar(user.id, file, lang || 'vi');
  }

  @Post('set-password')
  @ApiOperation({
    summary: 'Set initial password for OAuth account (create credential login)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password set successfully',
  })
  async setPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetPasswordDto,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.setPassword(user.id, dto, lang || 'vi');
  }

  @Post('change-password')
  @ApiOperation({
    summary: 'Change password for account with existing password',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Headers() headersRecord: Record<string, string>,
  ) {
    const lang = headersRecord['x-lang'] || 'vi';
    return this.usersService.changePassword(user.id, dto, headersRecord, lang);
  }

  @Delete('me/data')
  @ApiOperation({
    summary:
      'Delete all user-generated application data while preserving account credentials',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User data deleted successfully',
  })
  async deleteUserData(
    @CurrentUser() user: AuthUser,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.deleteUserData(user.id, lang || 'vi');
  }

  @Delete('me')
  @ApiOperation({
    summary: 'Permanently delete user account and all associated data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User account and data permanently deleted',
  })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
    @Headers() headersRecord: Record<string, string>,
  ) {
    const lang = headersRecord['x-lang'] || 'vi';
    return this.usersService.deleteAccount(user.id, dto, headersRecord, lang);
  }

  @Post(':id/restore')
  @AdminOnly()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Restore a soft-deleted user account (Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User account restored successfully',
  })
  async restoreUser(@Param('id') id: string, @Headers('x-lang') lang?: string) {
    return this.usersService.restoreUser(id, lang || 'vi');
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get all active user sessions with parsed device information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active sessions retrieved successfully',
  })
  async getSessions(
    @CurrentUser() user: AuthUser,
    @CurrentSession() session?: AuthSession,
  ) {
    return this.usersService.getSessions(user.id, session?.id);
  }

  @Delete('sessions/others')
  @ApiOperation({
    summary: 'Revoke all active sessions except the current session',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Other sessions revoked successfully',
  })
  async revokeOtherSessions(
    @CurrentUser() user: AuthUser,
    @CurrentSession() session?: AuthSession,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.revokeOtherSessions(
      user.id,
      session?.id,
      lang || 'vi',
    );
  }

  @Delete('sessions/:id')
  @ApiOperation({
    summary: 'Revoke a specific user session by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session revoked successfully',
  })
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') sessionId: string,
    @Headers('x-lang') lang?: string,
  ) {
    return this.usersService.revokeSession(user.id, sessionId, lang || 'vi');
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IChangePasswordDto } from '@repo/types';

export class ChangePasswordDto implements IChangePasswordDto {
  @ApiProperty({ example: 'OldSecretPass123@' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecretPass123@', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

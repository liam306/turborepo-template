import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ISetPasswordDto } from '@repo/types';

export class SetPasswordDto implements ISetPasswordDto {
  @ApiProperty({ example: 'NewSecretPass123@', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

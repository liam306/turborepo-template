import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IDeleteAccountDto } from '@repo/types';

export class DeleteAccountDto implements IDeleteAccountDto {
  @ApiPropertyOptional({
    example: 'SecretPass123@',
    description: 'Current password for verification if account has password',
  })
  @IsOptional()
  @IsString()
  password?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { IUpdateProfileDto, SupportedLocale, ThemeMode } from '@repo/types';

export class UpdateProfileDto implements IUpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @ApiPropertyOptional({ enum: ['system', 'light', 'dark'], example: 'system' })
  @IsOptional()
  @IsIn(['system', 'light', 'dark'])
  theme?: ThemeMode;

  @ApiPropertyOptional({ enum: ['vi', 'en'], example: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  locale?: SupportedLocale;
}

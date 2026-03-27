import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSecretDto {
  @ApiPropertyOptional({ example: 'NEW_KEY_NAME' })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ example: 'new-secret-value' })
  @IsString()
  @IsOptional()
  value?: string;
}

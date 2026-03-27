import { IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDomainDto {
  @ApiPropertyOptional({ example: 'uuid-of-environment' })
  @IsUUID()
  @IsOptional()
  environment_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  redirect_www?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  force_https?: boolean;
}

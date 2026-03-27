import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceLinkDto {
  @ApiPropertyOptional({
    example: 'REDIS',
    description: 'Prefix for injected env vars',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'injected_env_prefix must start with an uppercase letter and contain only A-Z, 0-9, _',
  })
  injected_env_prefix?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  cascade_restart?: boolean;
}

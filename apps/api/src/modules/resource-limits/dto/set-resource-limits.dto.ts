import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetResourceLimitsDto {
  @ApiPropertyOptional({ description: 'CPU limit in millicores', example: 1000 })
  @IsInt()
  @IsOptional()
  cpu_limit?: number;

  @ApiPropertyOptional({ description: 'Memory limit in MB', example: 512 })
  @IsInt()
  @IsOptional()
  memory_limit_mb?: number;
}

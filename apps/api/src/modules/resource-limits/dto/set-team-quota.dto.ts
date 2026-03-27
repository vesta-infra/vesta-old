import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetTeamQuotaDto {
  @ApiPropertyOptional({ description: 'Max CPU in millicores', example: 8000 })
  @IsInt()
  @IsOptional()
  max_cpu?: number;

  @ApiPropertyOptional({ description: 'Max memory in MB', example: 16384 })
  @IsInt()
  @IsOptional()
  max_memory_mb?: number;

  @ApiPropertyOptional({ description: 'Max number of containers', example: 20 })
  @IsInt()
  @IsOptional()
  max_containers?: number;

  @ApiPropertyOptional({ description: 'Max number of projects', example: 10 })
  @IsInt()
  @IsOptional()
  max_projects?: number;
}

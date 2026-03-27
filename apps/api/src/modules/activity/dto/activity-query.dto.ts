import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ActivityQueryDto {
  @ApiPropertyOptional({ description: 'Filter by action type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}

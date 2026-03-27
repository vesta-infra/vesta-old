import { IsString, IsEnum, IsInt, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchLogsDto {
  @ApiPropertyOptional({ description: 'Text search query' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Start timestamp (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End timestamp (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: ['debug', 'info', 'warn', 'error'] })
  @IsEnum(['debug', 'info', 'warn', 'error'])
  @IsOptional()
  level?: 'debug' | 'info' | 'warn' | 'error';

  @ApiPropertyOptional({ enum: ['stdout', 'stderr'] })
  @IsEnum(['stdout', 'stderr'])
  @IsOptional()
  stream?: 'stdout' | 'stderr';

  @ApiPropertyOptional({ default: 100 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number = 100;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  offset?: number = 0;
}

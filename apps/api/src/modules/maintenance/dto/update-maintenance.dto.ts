import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaintenanceDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: ['10.0.0.1', '192.168.1.0/24'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowed_ips?: string[];

  @ApiPropertyOptional({ example: '<h1>Under Maintenance</h1>' })
  @IsString()
  @IsOptional()
  custom_page_html?: string;

  @ApiPropertyOptional({ example: 503, default: 503 })
  @IsInt()
  @IsOptional()
  status_code?: number;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduled_start?: string;

  @ApiPropertyOptional({ example: '2026-04-01T06:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduled_end?: string;

  @ApiPropertyOptional({ description: 'Token to bypass maintenance mode' })
  @IsString()
  @IsOptional()
  bypass_token?: string;
}

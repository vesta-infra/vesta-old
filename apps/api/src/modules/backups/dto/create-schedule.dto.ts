import { IsEnum, IsString, IsInt, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ enum: ['database', 'volume'], example: 'database' })
  @IsEnum(['database', 'volume'])
  resource_type!: 'database' | 'volume';

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  resource_id!: string;

  @ApiProperty({ example: '0 2 * * *' })
  @IsString()
  cron_expression!: string;

  @ApiPropertyOptional({ example: 7 })
  @IsInt()
  @IsOptional()
  retention_count?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @IsOptional()
  retention_days?: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  storage_destination_id!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

import { IsString, IsInt, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCronJobDto {
  @ApiProperty({ example: 'cleanup-temp-files' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '/bin/sh -c "rm -rf /tmp/cache/*"' })
  @IsString()
  command!: string;

  @ApiProperty({ example: '0 */6 * * *', description: 'Cron expression' })
  @IsString()
  schedule!: string;

  @ApiPropertyOptional({ example: 300, default: 300 })
  @IsInt()
  @IsOptional()
  timeout_seconds?: number = 300;

  @ApiPropertyOptional({
    enum: ['allow', 'forbid', 'replace'],
    default: 'forbid',
  })
  @IsEnum(['allow', 'forbid', 'replace'])
  @IsOptional()
  concurrency_policy?: 'allow' | 'forbid' | 'replace';

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

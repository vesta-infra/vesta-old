import { IsString, IsEnum, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeployHookDto {
  @ApiProperty({ enum: ['pre_deploy', 'post_deploy'] })
  @IsEnum(['pre_deploy', 'post_deploy'])
  phase!: 'pre_deploy' | 'post_deploy';

  @ApiProperty({ example: 'npm run migrate' })
  @IsString()
  command!: string;

  @ApiPropertyOptional({ default: 60, description: 'Timeout in seconds' })
  @IsInt()
  @IsOptional()
  timeout_seconds?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

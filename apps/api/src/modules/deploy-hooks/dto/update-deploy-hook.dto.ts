import { IsString, IsEnum, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeployHookDto {
  @ApiPropertyOptional({ enum: ['pre_deploy', 'post_deploy'] })
  @IsEnum(['pre_deploy', 'post_deploy'])
  @IsOptional()
  phase?: 'pre_deploy' | 'post_deploy';

  @ApiPropertyOptional({ example: 'npm run migrate' })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiPropertyOptional({ default: 60, description: 'Timeout in seconds' })
  @IsInt()
  @IsOptional()
  timeout_seconds?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

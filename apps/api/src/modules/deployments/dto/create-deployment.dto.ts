import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeploymentDto {
  @ApiPropertyOptional({ example: 'abc123def456' })
  @IsString()
  @IsOptional()
  commit_sha?: string;

  @ApiPropertyOptional({ example: 'myapp:latest' })
  @IsString()
  @IsOptional()
  image_tag?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  desired_replicas?: number;
}

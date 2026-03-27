import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEnvironmentDto } from './create-environment.dto';

export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {
  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  replicas?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  min_replicas?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @IsOptional()
  max_replicas?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  scale_to_zero?: boolean;
}

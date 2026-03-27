import { IsInt, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetRetentionDto {
  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  retention_days!: number;

  @ApiPropertyOptional({ example: 'local', default: 'local' })
  @IsString()
  @IsOptional()
  storage_backend?: string = 'local';
}

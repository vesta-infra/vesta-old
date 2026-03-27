import { IsString, MinLength, IsInt, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiProperty({ example: 'production-1', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '192.168.1.100' })
  @IsString()
  host!: string;

  @ApiPropertyOptional({ example: 22, default: 22 })
  @IsInt()
  @IsOptional()
  port?: number = 22;

  @ApiPropertyOptional({ example: ['web', 'production'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

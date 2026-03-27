import { IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatabaseDto {
  @ApiProperty({ example: 'my-postgres', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    enum: ['postgres', 'mysql', 'mongo', 'redis', 'clickhouse', 'minio'],
    example: 'postgres',
  })
  @IsEnum(['postgres', 'mysql', 'mongo', 'redis', 'clickhouse', 'minio'])
  engine!: 'postgres' | 'mysql' | 'mongo' | 'redis' | 'clickhouse' | 'minio';

  @ApiPropertyOptional({ example: '16' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  server_id!: string;
}

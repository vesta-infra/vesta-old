import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStorageDestinationDto {
  @ApiProperty({ example: 'S3 Production' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 's3', default: 's3' })
  @IsString()
  @IsOptional()
  type?: string = 's3';

  @ApiProperty({
    example: {
      bucket: 'my-backups',
      region: 'us-east-1',
      endpoint: 'https://s3.amazonaws.com',
      access_key_id: 'AKIA...',
      secret_access_key: '...',
    },
  })
  @IsObject()
  config!: Record<string, unknown>;
}

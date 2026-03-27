import { IsString, IsUrl, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'Deploy Notifications' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'https://example.com/webhook' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: 'HMAC signing secret' })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiProperty({ example: ['deployment.succeeded', 'deployment.failed'] })
  @IsArray()
  @IsString({ each: true })
  event_types!: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

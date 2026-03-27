import {
  IsEnum,
  IsObject,
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    enum: ['email', 'slack', 'discord', 'telegram', 'webhook'],
    example: 'slack',
  })
  @IsEnum(['email', 'slack', 'discord', 'telegram', 'webhook'])
  type!: 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

  @ApiProperty({
    example: { webhook_url: 'https://hooks.slack.com/services/...' },
    description: 'Channel-specific configuration',
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiProperty({
    example: ['deployment.succeeded', 'deployment.failed'],
    description: 'Event types to subscribe to',
  })
  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

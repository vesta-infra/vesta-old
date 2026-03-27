import {
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceLinkDto {
  @ApiProperty({
    enum: ['project', 'database'],
    example: 'database',
  })
  @IsEnum(['project', 'database'])
  dependency_type!: 'project' | 'database';

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  dependency_id!: string;

  @ApiProperty({
    example: 'DATABASE',
    description: 'Prefix for injected env vars (e.g. DATABASE_HOST)',
  })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'injected_env_prefix must start with an uppercase letter and contain only A-Z, 0-9, _',
  })
  injected_env_prefix!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  cascade_restart?: boolean;
}

import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSecretDto {
  @ApiProperty({ enum: ['global', 'project', 'environment'] })
  @IsEnum(['global', 'project', 'environment'])
  scope!: 'global' | 'project' | 'environment';

  @ApiProperty({ example: 'project-uuid-or-env-uuid' })
  @IsString()
  scope_id!: string;

  @ApiProperty({ example: 'DATABASE_URL' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'postgres://...' })
  @IsString()
  value!: string;
}

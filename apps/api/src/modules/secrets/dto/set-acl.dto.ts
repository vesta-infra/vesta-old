import { IsString, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAclDto {
  @ApiProperty({ enum: ['user', 'role', 'api_token'] })
  @IsEnum(['user', 'role', 'api_token'])
  grantee_type!: 'user' | 'role' | 'api_token';

  @ApiProperty({ example: 'user-uuid-or-role-name' })
  @IsString()
  grantee_id!: string;

  @ApiProperty({
    example: ['read', 'use'],
    description: 'Permissions: read, write, use, manage',
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RestoreBackupDto {
  @ApiPropertyOptional({
    description: 'Target resource ID to restore into (defaults to original)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  target_id?: string;
}

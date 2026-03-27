import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Renamed Team' })
  @IsString()
  @IsOptional()
  name?: string;
}

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '@vesta/shared';

export class UpdateRoleDto {
  @ApiProperty({ enum: TeamRole, example: TeamRole.DEVELOPER })
  @IsEnum(TeamRole)
  role!: TeamRole;
}

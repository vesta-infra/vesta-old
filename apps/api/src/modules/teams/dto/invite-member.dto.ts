import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '@vesta/shared';

export class InviteMemberDto {
  @ApiProperty({ example: 'newmember@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: TeamRole, example: TeamRole.DEVELOPER })
  @IsEnum(TeamRole)
  role!: TeamRole;
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List teams for current user' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  async findAll(@CurrentUser('userId') userId: string) {
    return this.teamsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({ status: 200, description: 'Team updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 204, description: 'Team deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.delete(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List team members' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite a member to the team' })
  @ApiResponse({ status: 201, description: 'Member invited' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.addMember(id, dto.email, dto.role);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.teamsService.updateMemberRole(id, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the team' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.teamsService.removeMember(id, memberId);
  }
}

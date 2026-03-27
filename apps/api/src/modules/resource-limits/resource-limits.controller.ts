import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { ResourceLimitsService } from './resource-limits.service';
import { SetResourceLimitsDto } from './dto/set-resource-limits.dto';
import { SetTeamQuotaDto } from './dto/set-team-quota.dto';

@ApiTags('Resource Limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ResourceLimitsController {
  constructor(
    private readonly resourceLimitsService: ResourceLimitsService,
  ) {}

  @Get('environments/:envId/resource-limits')
  @ApiOperation({ summary: 'Get resource limits for an environment' })
  @ApiResponse({ status: 200, description: 'Resource limits' })
  async getForEnvironment(
    @Param('envId', ParseUUIDPipe) envId: string,
  ) {
    return this.resourceLimitsService.getForEnvironment(envId);
  }

  @Put('environments/:envId/resource-limits')
  @ApiOperation({ summary: 'Set resource limits for an environment' })
  @ApiResponse({ status: 200, description: 'Resource limits updated' })
  async setForEnvironment(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: SetResourceLimitsDto,
  ) {
    return this.resourceLimitsService.setForEnvironment(envId, dto);
  }

  @Get('teams/:teamId/quota')
  @ApiOperation({ summary: 'Get team quota' })
  @ApiResponse({ status: 200, description: 'Team quota' })
  async getTeamQuota(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.resourceLimitsService.getTeamQuota(teamId);
  }

  @Put('teams/:teamId/quota')
  @ApiOperation({ summary: 'Set team quota' })
  @ApiResponse({ status: 200, description: 'Team quota updated' })
  async setTeamQuota(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: SetTeamQuotaDto,
  ) {
    return this.resourceLimitsService.setTeamQuota(teamId, dto);
  }

  @Get('teams/:teamId/quota/usage')
  @ApiOperation({ summary: 'Get current resource usage vs team quota' })
  @ApiResponse({ status: 200, description: 'Current usage and quota' })
  async getTeamUsage(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    const [quota, usage] = await Promise.all([
      this.resourceLimitsService.getTeamQuota(teamId),
      this.resourceLimitsService.getTeamUsage(teamId),
    ]);
    return { quota, usage };
  }
}

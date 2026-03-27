import {
  Controller,
  Get,
  Param,
  Query,
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
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('teams/:teamId/activity')
  @ApiOperation({ summary: 'Get activity feed for a team' })
  @ApiResponse({ status: 200, description: 'Paginated activity feed' })
  async getTeamActivity(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getTeamActivity(teamId, query);
  }

  @Get('projects/:projectId/activity')
  @ApiOperation({ summary: 'Get activity for a project' })
  @ApiResponse({ status: 200, description: 'Project activity' })
  async getProjectActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getProjectActivity(projectId, query);
  }

  @Get('environments/:envId/activity')
  @ApiOperation({ summary: 'Get activity for an environment' })
  @ApiResponse({ status: 200, description: 'Environment activity' })
  async getEnvironmentActivity(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getEnvironmentActivity(envId, query);
  }

  @Get('servers/:serverId/activity')
  @ApiOperation({ summary: 'Get activity for a server' })
  @ApiResponse({ status: 200, description: 'Server activity' })
  async getServerActivity(
    @Param('serverId', ParseUUIDPipe) serverId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.getServerActivity(serverId, query);
  }
}

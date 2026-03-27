import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';

@ApiTags('Deployments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('environments/:envId/deployments')
  @ApiOperation({ summary: 'Trigger a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment queued' })
  async create(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: CreateDeploymentDto,
  ) {
    return this.deploymentsService.create(envId, dto);
  }

  @Get('environments/:envId/deployments')
  @ApiOperation({ summary: 'List deployments for an environment' })
  @ApiResponse({ status: 200, description: 'Paginated list of deployments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByEnvironment(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deploymentsService.findByEnvironment(envId, {
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('deployments/:id')
  @ApiOperation({ summary: 'Get deployment details' })
  @ApiResponse({ status: 200, description: 'Deployment details' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deploymentsService.findById(id);
  }

  @Post('deployments/:id/rollback')
  @ApiOperation({ summary: 'Rollback to this deployment' })
  @ApiResponse({ status: 201, description: 'Rollback deployment queued' })
  async rollback(@Param('id', ParseUUIDPipe) id: string) {
    return this.deploymentsService.rollback(id);
  }

  @Post('deployments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment cancelled' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.deploymentsService.cancel(id);
  }
}

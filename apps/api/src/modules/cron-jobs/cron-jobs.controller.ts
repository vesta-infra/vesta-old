import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { CronJobsService } from './cron-jobs.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';

@ApiTags('Cron Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CronJobsController {
  constructor(private readonly cronJobsService: CronJobsService) {}

  @Post('environments/:envId/cron-jobs')
  @ApiOperation({ summary: 'Create a cron job' })
  @ApiResponse({ status: 201, description: 'Cron job created' })
  async create(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: CreateCronJobDto,
  ) {
    return this.cronJobsService.create(envId, dto);
  }

  @Get('environments/:envId/cron-jobs')
  @ApiOperation({ summary: 'List cron jobs for an environment' })
  @ApiResponse({ status: 200, description: 'List of cron jobs' })
  async findByEnvironment(@Param('envId', ParseUUIDPipe) envId: string) {
    return this.cronJobsService.findByEnvironment(envId);
  }

  @Get('cron-jobs/:id')
  @ApiOperation({ summary: 'Get cron job details' })
  @ApiResponse({ status: 200, description: 'Cron job details' })
  @ApiResponse({ status: 404, description: 'Cron job not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cronJobsService.findById(id);
  }

  @Patch('cron-jobs/:id')
  @ApiOperation({ summary: 'Update a cron job' })
  @ApiResponse({ status: 200, description: 'Cron job updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCronJobDto,
  ) {
    return this.cronJobsService.update(id, dto);
  }

  @Delete('cron-jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cron job' })
  @ApiResponse({ status: 204, description: 'Cron job deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cronJobsService.delete(id);
  }

  @Post('cron-jobs/:id/trigger')
  @ApiOperation({ summary: 'Manually trigger a cron job execution' })
  @ApiResponse({ status: 201, description: 'Execution triggered' })
  async trigger(@Param('id', ParseUUIDPipe) id: string) {
    return this.cronJobsService.trigger(id);
  }

  @Get('cron-jobs/:id/executions')
  @ApiOperation({ summary: 'List executions for a cron job' })
  @ApiResponse({ status: 200, description: 'Paginated execution history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExecutions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cronJobsService.getExecutions(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('cron-job-executions/:id/logs')
  @ApiOperation({ summary: 'Get execution details with logs' })
  @ApiResponse({ status: 200, description: 'Execution details with logs' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecutionLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.cronJobsService.getExecutionById(id);
  }
}

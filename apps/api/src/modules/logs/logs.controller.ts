import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
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
import { LogsService } from './logs.service';
import { SearchLogsDto } from './dto/search-logs.dto';
import { SetRetentionDto } from './dto/set-retention.dto';

@ApiTags('Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('environments/:envId/logs')
  @ApiOperation({ summary: 'Search logs for an environment' })
  @ApiResponse({ status: 200, description: 'Paginated log entries' })
  async search(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Query() query: SearchLogsDto,
  ) {
    return this.logsService.search(envId, query);
  }

  @Get('environments/:envId/logs/export')
  @ApiOperation({ summary: 'Export logs for download' })
  @ApiResponse({ status: 200, description: 'Log entries for export' })
  async export(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Query() query: SearchLogsDto,
  ) {
    return this.logsService.export(envId, query);
  }

  @Get('environments/:envId/log-retention')
  @ApiOperation({ summary: 'Get log retention policy' })
  @ApiResponse({ status: 200, description: 'Retention policy' })
  async getRetention(@Param('envId', ParseUUIDPipe) envId: string) {
    return this.logsService.getRetentionPolicy(envId);
  }

  @Put('environments/:envId/log-retention')
  @ApiOperation({ summary: 'Set log retention policy' })
  @ApiResponse({ status: 200, description: 'Retention policy updated' })
  async setRetention(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: SetRetentionDto,
  ) {
    return this.logsService.setRetentionPolicy(envId, dto);
  }
}

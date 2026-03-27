import {
  Controller,
  Get,
  Put,
  Post,
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
import { MaintenanceService } from './maintenance.service';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('environments/:envId/maintenance')
  @ApiOperation({ summary: 'Get maintenance window for environment' })
  @ApiResponse({ status: 200, description: 'Maintenance window details' })
  async get(@Param('envId', ParseUUIDPipe) envId: string) {
    return this.maintenanceService.getForEnvironment(envId);
  }

  @Put('environments/:envId/maintenance')
  @ApiOperation({ summary: 'Update maintenance window settings' })
  @ApiResponse({ status: 200, description: 'Maintenance window updated' })
  async update(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(envId, dto);
  }

  @Post('environments/:envId/maintenance/toggle')
  @ApiOperation({ summary: 'Toggle maintenance mode on/off' })
  @ApiResponse({ status: 200, description: 'Maintenance mode toggled' })
  async toggle(@Param('envId', ParseUUIDPipe) envId: string) {
    return this.maintenanceService.toggle(envId);
  }
}

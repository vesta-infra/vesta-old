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
import { BackupsService } from './backups.service';
import { BackupSchedulesService } from './backup-schedules.service';
import { StorageDestinationsService } from './storage-destinations.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateStorageDestinationDto } from './dto/create-storage-destination.dto';
import { UpdateStorageDestinationDto } from './dto/update-storage-destination.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@ApiTags('Backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly schedulesService: BackupSchedulesService,
    private readonly storageService: StorageDestinationsService,
  ) {}

  // --- Storage Destinations ---

  @Post('teams/:teamId/storage-destinations')
  @ApiOperation({ summary: 'Create a storage destination' })
  @ApiResponse({ status: 201, description: 'Storage destination created' })
  async createStorageDestination(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateStorageDestinationDto,
  ) {
    return this.storageService.create(teamId, dto);
  }

  @Get('teams/:teamId/storage-destinations')
  @ApiOperation({ summary: 'List storage destinations for a team' })
  @ApiResponse({ status: 200, description: 'List of storage destinations' })
  async listStorageDestinations(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.storageService.findByTeam(teamId);
  }

  @Patch('storage-destinations/:id')
  @ApiOperation({ summary: 'Update a storage destination' })
  @ApiResponse({ status: 200, description: 'Storage destination updated' })
  async updateStorageDestination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStorageDestinationDto,
  ) {
    return this.storageService.update(id, dto);
  }

  @Delete('storage-destinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a storage destination' })
  @ApiResponse({ status: 204, description: 'Storage destination deleted' })
  async deleteStorageDestination(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.delete(id);
  }

  @Post('storage-destinations/:id/test')
  @ApiOperation({ summary: 'Test storage destination connectivity' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testStorageDestination(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.testConnection(id);
  }

  // --- Backups ---

  @Post('teams/:teamId/backups')
  @ApiOperation({ summary: 'Trigger a new backup' })
  @ApiResponse({ status: 201, description: 'Backup scheduled' })
  async createBackup(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backupsService.triggerBackup(teamId, dto);
  }

  @Get('backups')
  @ApiOperation({ summary: 'List backups for a resource' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  @ApiQuery({ name: 'resourceType', required: true })
  @ApiQuery({ name: 'resourceId', required: true })
  async listBackups(
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ) {
    return this.backupsService.findByResource(resourceType, resourceId);
  }

  @Get('backups/:id')
  @ApiOperation({ summary: 'Get backup details' })
  @ApiResponse({ status: 200, description: 'Backup details' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async findBackup(@Param('id', ParseUUIDPipe) id: string) {
    return this.backupsService.findById(id);
  }

  @Delete('backups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 204, description: 'Backup deleted' })
  async deleteBackup(@Param('id', ParseUUIDPipe) id: string) {
    return this.backupsService.delete(id);
  }

  @Post('backups/:id/restore')
  @ApiOperation({ summary: 'Restore from a backup' })
  @ApiResponse({ status: 200, description: 'Restore job created' })
  async restoreBackup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreBackupDto,
  ) {
    return this.backupsService.restore(id, dto.target_id);
  }

  // --- Backup Schedules ---

  @Get('backup-schedules')
  @ApiOperation({ summary: 'List backup schedules for a resource' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  @ApiQuery({ name: 'resourceType', required: true })
  @ApiQuery({ name: 'resourceId', required: true })
  async listSchedules(
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ) {
    return this.schedulesService.findByResource(resourceType, resourceId);
  }

  @Post('backup-schedules')
  @ApiOperation({ summary: 'Create a backup schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Patch('backup-schedules/:id')
  @ApiOperation({ summary: 'Update a backup schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, dto);
  }

  @Delete('backup-schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a backup schedule' })
  @ApiResponse({ status: 204, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.delete(id);
  }
}

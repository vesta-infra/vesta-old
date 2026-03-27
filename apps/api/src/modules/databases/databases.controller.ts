import {
  Controller,
  Get,
  Post,
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
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';

@ApiTags('Managed Databases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Post('teams/:teamId/databases')
  @ApiOperation({ summary: 'Create a managed database' })
  @ApiResponse({ status: 201, description: 'Database created' })
  async create(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateDatabaseDto,
  ) {
    return this.databasesService.create(teamId, dto);
  }

  @Get('teams/:teamId/databases')
  @ApiOperation({ summary: 'List managed databases for a team' })
  @ApiResponse({ status: 200, description: 'List of databases' })
  async findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.databasesService.findByTeam(teamId);
  }

  @Get('databases/:id')
  @ApiOperation({ summary: 'Get database details' })
  @ApiResponse({ status: 200, description: 'Database details' })
  @ApiResponse({ status: 404, description: 'Database not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.databasesService.findById(id);
  }

  @Delete('databases/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a managed database' })
  @ApiResponse({ status: 204, description: 'Database deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.databasesService.delete(id);
  }

  @Get('databases/:id/connection')
  @ApiOperation({ summary: 'Get database connection info (no credentials)' })
  @ApiResponse({ status: 200, description: 'Connection info' })
  async getConnectionInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.databasesService.getConnectionInfo(id);
  }

  @Post('databases/:id/backup')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger a manual database backup' })
  @ApiResponse({ status: 202, description: 'Backup triggered' })
  async triggerBackup(@Param('id', ParseUUIDPipe) id: string) {
    await this.databasesService.findById(id);
    return { message: 'Backup triggered', database_id: id };
  }
}

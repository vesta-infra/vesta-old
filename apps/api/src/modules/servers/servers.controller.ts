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
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@ApiTags('Servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post('teams/:teamId/servers')
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({ status: 201, description: 'Server created' })
  async create(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateServerDto,
  ) {
    return this.serversService.create(teamId, dto);
  }

  @Get('teams/:teamId/servers')
  @ApiOperation({ summary: 'List servers for a team' })
  @ApiResponse({ status: 200, description: 'List of servers' })
  async findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.serversService.findByTeam(teamId);
  }

  @Get('servers/:id')
  @ApiOperation({ summary: 'Get server details' })
  @ApiResponse({ status: 200, description: 'Server details' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.findById(id);
  }

  @Patch('servers/:id')
  @ApiOperation({ summary: 'Update server' })
  @ApiResponse({ status: 200, description: 'Server updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServerDto,
  ) {
    return this.serversService.update(id, dto);
  }

  @Delete('servers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete server' })
  @ApiResponse({ status: 204, description: 'Server deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.delete(id);
  }

  @Get('servers/:id/metrics')
  @ApiOperation({ summary: 'Get server metrics' })
  @ApiResponse({ status: 200, description: 'Server metrics' })
  async getMetrics(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.getMetrics(id);
  }
}

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
import { ServiceLinksService } from './service-links.service';
import { CreateServiceLinkDto } from './dto/create-service-link.dto';
import { UpdateServiceLinkDto } from './dto/update-service-link.dto';

@ApiTags('Service Links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ServiceLinksController {
  constructor(private readonly serviceLinksService: ServiceLinksService) {}

  @Post('projects/:projectId/service-links')
  @ApiOperation({ summary: 'Create a service link for a project' })
  @ApiResponse({ status: 201, description: 'Service link created' })
  @ApiResponse({ status: 400, description: 'Circular dependency detected' })
  @ApiResponse({ status: 404, description: 'Project or dependency not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateServiceLinkDto,
  ) {
    return this.serviceLinksService.create(projectId, dto);
  }

  @Get('projects/:projectId/service-links')
  @ApiOperation({ summary: 'List service links for a project' })
  @ApiResponse({ status: 200, description: 'List of service links' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.serviceLinksService.findByProject(projectId);
  }

  @Patch('service-links/:id')
  @ApiOperation({ summary: 'Update a service link' })
  @ApiResponse({ status: 200, description: 'Service link updated' })
  @ApiResponse({ status: 404, description: 'Service link not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceLinkDto,
  ) {
    return this.serviceLinksService.update(id, dto);
  }

  @Delete('service-links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service link' })
  @ApiResponse({ status: 204, description: 'Service link deleted' })
  @ApiResponse({ status: 404, description: 'Service link not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceLinksService.delete(id);
  }

  @Get('teams/:teamId/dependency-graph')
  @ApiOperation({ summary: 'Get full dependency graph for a team' })
  @ApiResponse({ status: 200, description: 'Dependency graph' })
  async getDependencyGraph(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.serviceLinksService.getDependencyGraph(teamId);
  }
}

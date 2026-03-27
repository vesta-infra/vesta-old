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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ScaleDto } from './dto/scale.dto';

@ApiTags('Environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post('projects/:projectId/environments')
  @ApiOperation({ summary: 'Create a new environment' })
  @ApiResponse({ status: 201, description: 'Environment created' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.environmentsService.create(projectId, dto);
  }

  @Get('projects/:projectId/environments')
  @ApiOperation({ summary: 'List environments for a project' })
  @ApiResponse({ status: 200, description: 'List of environments' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.environmentsService.findByProject(projectId);
  }

  @Patch('environments/:id')
  @ApiOperation({ summary: 'Update environment' })
  @ApiResponse({ status: 200, description: 'Environment updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(id, dto);
  }

  @Delete('environments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete environment' })
  @ApiResponse({ status: 204, description: 'Environment deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.environmentsService.delete(id);
  }

  @Get('environments/:id/scale')
  @ApiOperation({ summary: 'Get environment scaling info' })
  @ApiResponse({ status: 200, description: 'Scaling info' })
  async getScale(@Param('id', ParseUUIDPipe) id: string) {
    const env = await this.environmentsService.findById(id);
    return {
      replicas: env.replicas,
      min_replicas: env.min_replicas,
      max_replicas: env.max_replicas,
      scale_to_zero: env.scale_to_zero,
    };
  }

  @Patch('environments/:id/scale')
  @ApiOperation({ summary: 'Update environment scale' })
  @ApiResponse({ status: 200, description: 'Scale updated' })
  async updateScale(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScaleDto,
  ) {
    return this.environmentsService.updateScale(id, dto.replicas);
  }
}

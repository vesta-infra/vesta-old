import {
  Controller,
  Get,
  Post,
  Put,
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
import { DeployHooksService } from './deploy-hooks.service';
import { CreateDeployHookDto } from './dto/create-deploy-hook.dto';
import { UpdateDeployHookDto } from './dto/update-deploy-hook.dto';
import { ReorderHooksDto } from './dto/reorder-hooks.dto';

@ApiTags('Deploy Hooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DeployHooksController {
  constructor(private readonly deployHooksService: DeployHooksService) {}

  @Post('environments/:envId/hooks')
  @ApiOperation({ summary: 'Create a deploy hook' })
  @ApiResponse({ status: 201, description: 'Hook created' })
  async create(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: CreateDeployHookDto,
  ) {
    return this.deployHooksService.create(envId, dto);
  }

  @Get('environments/:envId/hooks')
  @ApiOperation({ summary: 'List deploy hooks for an environment' })
  @ApiResponse({ status: 200, description: 'List of hooks ordered by execution order' })
  async findByEnvironment(
    @Param('envId', ParseUUIDPipe) envId: string,
  ) {
    return this.deployHooksService.findByEnvironment(envId);
  }

  @Patch('hooks/:id')
  @ApiOperation({ summary: 'Update a deploy hook' })
  @ApiResponse({ status: 200, description: 'Hook updated' })
  @ApiResponse({ status: 404, description: 'Hook not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeployHookDto,
  ) {
    return this.deployHooksService.update(id, dto);
  }

  @Delete('hooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a deploy hook' })
  @ApiResponse({ status: 204, description: 'Hook deleted' })
  @ApiResponse({ status: 404, description: 'Hook not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deployHooksService.delete(id);
  }

  @Put('environments/:envId/hooks/reorder')
  @ApiOperation({ summary: 'Reorder deploy hooks' })
  @ApiResponse({ status: 200, description: 'Hooks reordered' })
  async reorder(
    @Param('envId', ParseUUIDPipe) envId: string,
    @Body() dto: ReorderHooksDto,
  ) {
    return this.deployHooksService.reorder(envId, dto.ordered_ids);
  }
}

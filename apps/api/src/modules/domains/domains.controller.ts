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
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post('projects/:projectId/domains')
  @ApiOperation({ summary: 'Create a domain for a project' })
  @ApiResponse({ status: 201, description: 'Domain created' })
  @ApiResponse({ status: 409, description: 'Domain FQDN already in use' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDomainDto,
  ) {
    return this.domainsService.create(projectId, dto);
  }

  @Get('projects/:projectId/domains')
  @ApiOperation({ summary: 'List domains for a project' })
  @ApiResponse({ status: 200, description: 'List of domains' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.domainsService.findByProject(projectId);
  }

  @Patch('domains/:id')
  @ApiOperation({ summary: 'Update a domain' })
  @ApiResponse({ status: 200, description: 'Domain updated' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.domainsService.update(id, dto);
  }

  @Delete('domains/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a domain' })
  @ApiResponse({ status: 204, description: 'Domain deleted' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.delete(id);
  }
}

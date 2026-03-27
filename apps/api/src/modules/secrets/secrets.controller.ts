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
import { SecretsService } from './secrets.service';
import { SecretAclService } from './secret-acl.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { SetAclDto } from './dto/set-acl.dto';

@ApiTags('Secrets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('secrets')
export class SecretsController {
  constructor(
    private readonly secretsService: SecretsService,
    private readonly secretAclService: SecretAclService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List secrets by scope' })
  @ApiQuery({ name: 'scope', required: true, enum: ['global', 'project', 'environment'] })
  @ApiQuery({ name: 'scopeId', required: true })
  @ApiResponse({ status: 200, description: 'List of secrets (metadata only)' })
  async findByScope(
    @Query('scope') scope: string,
    @Query('scopeId') scopeId: string,
  ) {
    return this.secretsService.findByScope(scope, scopeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a secret' })
  @ApiResponse({ status: 201, description: 'Secret created' })
  @ApiResponse({ status: 409, description: 'Secret key already exists in scope' })
  async create(@Body() dto: CreateSecretDto) {
    return this.secretsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get secret metadata' })
  @ApiResponse({ status: 200, description: 'Secret metadata' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.secretsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a secret' })
  @ApiResponse({ status: 200, description: 'Secret updated' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecretDto,
  ) {
    return this.secretsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a secret' })
  @ApiResponse({ status: 204, description: 'Secret deleted' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.secretsService.delete(id);
  }

  @Post(':id/rotate')
  @ApiOperation({ summary: 'Rotate a secret (re-encrypt with new version)' })
  @ApiResponse({ status: 200, description: 'Secret rotated' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async rotate(@Param('id', ParseUUIDPipe) id: string) {
    return this.secretsService.rotate(id);
  }

  @Get(':id/acl')
  @ApiOperation({ summary: 'Get ACL entries for a secret' })
  @ApiResponse({ status: 200, description: 'ACL entries' })
  async getAcl(@Param('id', ParseUUIDPipe) id: string) {
    return this.secretAclService.getAcl(id);
  }

  @Post(':id/acl')
  @ApiOperation({ summary: 'Set ACL entry for a secret' })
  @ApiResponse({ status: 201, description: 'ACL entry set' })
  async setAcl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAclDto,
  ) {
    return this.secretAclService.setAcl(id, dto);
  }

  @Delete('acl/:aclId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an ACL entry' })
  @ApiResponse({ status: 204, description: 'ACL entry removed' })
  async removeAcl(@Param('aclId', ParseUUIDPipe) aclId: string) {
    return this.secretAclService.removeAcl(aclId);
  }
}

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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('teams/:teamId/webhooks')
  @ApiOperation({ summary: 'Create an outbound webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async create(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooksService.create(teamId, dto);
  }

  @Get('teams/:teamId/webhooks')
  @ApiOperation({ summary: 'List webhooks for a team' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.webhooksService.findByTeam(teamId);
  }

  @Get('webhooks/outbound/:id')
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.findById(id);
  }

  @Patch('webhooks/outbound/:id')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(id, dto);
  }

  @Delete('webhooks/outbound/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.delete(id);
  }

  @Post('webhooks/outbound/:id/test')
  @ApiOperation({ summary: 'Send a test event to webhook' })
  @ApiResponse({ status: 200, description: 'Test event sent' })
  async test(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.sendTestEvent(id);
  }

  @Get('webhooks/outbound/:id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for webhook' })
  @ApiResponse({ status: 200, description: 'Delivery history' })
  async getDeliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getDeliveries(id, { page, limit });
  }
}

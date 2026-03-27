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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('teams/:teamId/notifications')
  @ApiOperation({ summary: 'Create a notification channel' })
  @ApiResponse({ status: 201, description: 'Notification channel created' })
  async create(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(teamId, dto);
  }

  @Get('teams/:teamId/notifications')
  @ApiOperation({ summary: 'List notification channels for a team' })
  @ApiResponse({ status: 200, description: 'List of notification channels' })
  async findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.notificationsService.findByTeam(teamId);
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification channel details' })
  @ApiResponse({ status: 200, description: 'Notification channel details' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.findById(id);
  }

  @Patch('notifications/:id')
  @ApiOperation({ summary: 'Update notification channel' })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, dto);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification channel' })
  @ApiResponse({ status: 204, description: 'Channel deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.delete(id);
  }

  @Post('notifications/:id/test')
  @ApiOperation({ summary: 'Send a test notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async test(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.test(id);
  }
}

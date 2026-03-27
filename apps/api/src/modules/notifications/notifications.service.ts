import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from '@vesta/db';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepo: Repository<NotificationChannel>,
  ) {}

  async create(
    teamId: string,
    dto: CreateNotificationDto,
  ): Promise<NotificationChannel> {
    const channel = this.channelRepo.create({
      team_id: teamId,
      type: dto.type,
      config: dto.config,
      events: dto.events,
      enabled: dto.enabled ?? true,
    });
    return this.channelRepo.save(channel);
  }

  async findByTeam(teamId: string): Promise<NotificationChannel[]> {
    return this.channelRepo.find({ where: { team_id: teamId } });
  }

  async findById(id: string): Promise<NotificationChannel> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Notification channel not found');
    }
    return channel;
  }

  async update(
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<NotificationChannel> {
    const channel = await this.findById(id);

    if (dto.type !== undefined) channel.type = dto.type;
    if (dto.config !== undefined) channel.config = dto.config;
    if (dto.events !== undefined) channel.events = dto.events;
    if (dto.enabled !== undefined) channel.enabled = dto.enabled;

    return this.channelRepo.save(channel);
  }

  async delete(id: string): Promise<void> {
    const result = await this.channelRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Notification channel not found');
    }
  }

  async send(
    teamId: string,
    eventType: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    const channels = await this.channelRepo.find({
      where: { team_id: teamId, enabled: true },
    });

    const matching = channels.filter((ch) => ch.events.includes(eventType));

    for (const channel of matching) {
      this.logger.log(
        `[${channel.type}] Dispatching ${eventType} to channel ${channel.id}: ${JSON.stringify(message)}`,
      );
    }

    this.logger.log(
      `Dispatched ${eventType} to ${matching.length} notification channel(s) for team ${teamId}`,
    );
  }

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const channel = await this.findById(id);

    this.logger.log(
      `[${channel.type}] Test notification sent to channel ${channel.id}`,
    );

    return {
      success: true,
      message: `Test notification dispatched to ${channel.type} channel`,
    };
  }
}

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboundWebhook, WebhookDelivery } from '@vesta/db';
import { createHash } from 'crypto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(OutboundWebhook)
    private readonly webhookRepo: Repository<OutboundWebhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue('webhooks')
    private readonly webhookQueue: Queue,
  ) {}

  async create(teamId: string, dto: CreateWebhookDto): Promise<OutboundWebhook> {
    const webhook = this.webhookRepo.create({
      team_id: teamId,
      name: dto.name,
      url: dto.url,
      secret_hash: dto.secret
        ? createHash('sha256').update(dto.secret).digest('hex')
        : null,
      event_types: dto.event_types,
      enabled: dto.enabled ?? true,
    });
    return this.webhookRepo.save(webhook);
  }

  async findByTeam(teamId: string): Promise<OutboundWebhook[]> {
    return this.webhookRepo.find({ where: { team_id: teamId } });
  }

  async findById(id: string): Promise<OutboundWebhook> {
    const webhook = await this.webhookRepo.findOne({ where: { id } });
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    return webhook;
  }

  async update(id: string, dto: UpdateWebhookDto): Promise<OutboundWebhook> {
    const webhook = await this.findById(id);

    if (dto.name !== undefined) webhook.name = dto.name;
    if (dto.url !== undefined) webhook.url = dto.url;
    if (dto.event_types !== undefined) webhook.event_types = dto.event_types;
    if (dto.enabled !== undefined) webhook.enabled = dto.enabled;
    if (dto.secret !== undefined) {
      webhook.secret_hash = dto.secret
        ? createHash('sha256').update(dto.secret).digest('hex')
        : null;
    }

    return this.webhookRepo.save(webhook);
  }

  async delete(id: string): Promise<void> {
    const result = await this.webhookRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Webhook not found');
    }
  }

  async sendTestEvent(id: string): Promise<WebhookDelivery> {
    const webhook = await this.findById(id);

    const delivery = this.deliveryRepo.create({
      webhook_id: webhook.id,
      event_type: 'test.ping',
      payload: {
        event: 'test.ping',
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id,
      },
    });
    const saved = await this.deliveryRepo.save(delivery);

    await this.webhookQueue.add('deliver', { deliveryId: saved.id });

    return saved;
  }

  async getDeliveries(
    webhookId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: WebhookDelivery[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [data, total] = await this.deliveryRepo.findAndCount({
      where: { webhook_id: webhookId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async dispatch(
    eventType: string,
    payload: Record<string, unknown>,
    teamId: string,
  ): Promise<void> {
    const webhooks = await this.webhookRepo.find({
      where: { team_id: teamId, enabled: true },
    });

    const matching = webhooks.filter((w) =>
      w.event_types.includes(eventType),
    );

    for (const webhook of matching) {
      const delivery = this.deliveryRepo.create({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: {
          event: eventType,
          timestamp: new Date().toISOString(),
          ...payload,
        },
      });
      const saved = await this.deliveryRepo.save(delivery);

      await this.webhookQueue.add('deliver', { deliveryId: saved.id });
    }

    this.logger.log(
      `Dispatched ${eventType} to ${matching.length} webhook(s) for team ${teamId}`,
    );
  }
}

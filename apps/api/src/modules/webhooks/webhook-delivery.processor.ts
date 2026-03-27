import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { WebhookDelivery, OutboundWebhook } from '@vesta/db';
import { createHmac } from 'crypto';

const RETRY_DELAYS = [1_000, 5_000, 30_000, 300_000, 900_000];
const MAX_RETRIES = 5;

@Processor('webhooks')
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectRepository(OutboundWebhook)
    private readonly webhookRepo: Repository<OutboundWebhook>,
  ) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: job.data.deliveryId },
    });
    if (!delivery) {
      this.logger.warn(`Delivery ${job.data.deliveryId} not found, skipping`);
      return;
    }

    const webhook = await this.webhookRepo.findOne({
      where: { id: delivery.webhook_id },
    });
    if (!webhook) {
      this.logger.warn(`Webhook ${delivery.webhook_id} not found, skipping`);
      return;
    }

    const body = JSON.stringify(delivery.payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vesta-Webhooks/1.0',
    };

    if (webhook.secret_hash) {
      const signature = createHmac('sha256', webhook.secret_hash)
        .update(body)
        .digest('hex');
      headers['X-Vesta-Signature'] = signature;
    }

    const start = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(30_000),
      });

      delivery.status_code = response.status;
      delivery.response_body = await response.text().catch(() => null);
      delivery.duration_ms = Date.now() - start;
      delivery.attempts += 1;

      if (!response.ok && delivery.attempts < MAX_RETRIES) {
        const delay = RETRY_DELAYS[delivery.attempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        delivery.next_retry_at = new Date(Date.now() + delay);
        await this.deliveryRepo.save(delivery);

        throw new Error(
          `Webhook delivery failed with status ${response.status}, scheduling retry`,
        );
      }

      delivery.next_retry_at = null;
      await this.deliveryRepo.save(delivery);
    } catch (error) {
      delivery.duration_ms = Date.now() - start;
      delivery.attempts += 1;

      if (delivery.attempts < MAX_RETRIES) {
        const delay = RETRY_DELAYS[delivery.attempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        delivery.next_retry_at = new Date(Date.now() + delay);
        await this.deliveryRepo.save(delivery);

        throw error;
      }

      delivery.next_retry_at = null;
      await this.deliveryRepo.save(delivery);

      this.logger.error(
        `Webhook delivery ${delivery.id} failed after ${MAX_RETRIES} attempts`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

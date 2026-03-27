import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OutboundWebhook, WebhookDelivery } from '@vesta/db';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboundWebhook, WebhookDelivery]),
    BullModule.registerQueue({ name: 'webhooks' }),
  ],
  providers: [WebhooksService, WebhookDeliveryProcessor],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}

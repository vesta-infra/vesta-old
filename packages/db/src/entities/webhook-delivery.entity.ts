import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OutboundWebhook } from './outbound-webhook.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  webhook_id!: string;

  @Column({ type: 'varchar' })
  event_type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  status_code!: number | null;

  @Column({ type: 'text', nullable: true })
  response_body!: string | null;

  @Column({ type: 'int', nullable: true })
  duration_ms!: number | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  next_retry_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => OutboundWebhook, (w) => w.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'webhook_id' })
  webhook!: OutboundWebhook;
}

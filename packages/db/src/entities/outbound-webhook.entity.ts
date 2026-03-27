import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { WebhookDelivery } from './webhook-delivery.entity';

@Entity('outbound_webhooks')
export class OutboundWebhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar', nullable: true })
  secret_hash!: string | null;

  @Column({ type: 'jsonb' })
  event_types!: string[];

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @OneToMany(() => WebhookDelivery, (wd) => wd.webhook)
  deliveries!: WebhookDelivery[];
}

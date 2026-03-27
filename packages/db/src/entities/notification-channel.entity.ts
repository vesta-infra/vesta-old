import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({
    type: 'enum',
    enum: ['email', 'slack', 'discord', 'telegram', 'webhook'],
  })
  type!: 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  events!: string[];

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

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

@Entity('audit_logs')
@Index(['team_id', 'created_at'])
@Index(['resource_type', 'resource_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'uuid', nullable: true })
  actor_id!: string | null;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar' })
  resource_type!: string;

  @Column({ type: 'varchar' })
  resource_id!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  ip_address!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

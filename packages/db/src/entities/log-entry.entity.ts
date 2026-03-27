import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Environment } from './environment.entity';

@Entity('log_entries')
@Index(['environment_id', 'timestamp'])
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  environment_id!: string;

  @Column({ type: 'varchar' })
  container_id!: string;

  @Column({ type: 'enum', enum: ['stdout', 'stderr'] })
  stream!: 'stdout' | 'stderr';

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info',
  })
  level!: 'info' | 'warn' | 'error' | 'debug';

  @Column({ type: 'jsonb', nullable: true })
  structured_fields!: Record<string, unknown> | null;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @ManyToOne(() => Environment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CronJob } from './cron-job.entity';

@Entity('cron_job_executions')
export class CronJobExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  cron_job_id!: string;

  @Column({
    type: 'enum',
    enum: ['running', 'succeeded', 'failed', 'timed_out'],
  })
  status!: 'running' | 'succeeded' | 'failed' | 'timed_out';

  @Column({ type: 'int', nullable: true })
  exit_code!: number | null;

  @Column({ type: 'text', nullable: true })
  logs!: string | null;

  @Column({ type: 'int', nullable: true })
  duration_ms!: number | null;

  @Column({ type: 'timestamp' })
  started_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  finished_at!: Date | null;

  @ManyToOne(() => CronJob, (cj) => cj.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cron_job_id' })
  cron_job!: CronJob;
}

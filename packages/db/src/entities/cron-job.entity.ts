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
import { Environment } from './environment.entity';
import { CronJobExecution } from './cron-job-execution.entity';

@Entity('cron_jobs')
export class CronJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  environment_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  command!: string;

  @Column({ type: 'varchar' })
  schedule!: string;

  @Column({ type: 'int', default: 300 })
  timeout_seconds!: number;

  @Column({
    type: 'enum',
    enum: ['allow', 'forbid', 'replace'],
    default: 'forbid',
  })
  concurrency_policy!: 'allow' | 'forbid' | 'replace';

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Environment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;

  @OneToMany(() => CronJobExecution, (e) => e.cron_job)
  executions!: CronJobExecution[];
}

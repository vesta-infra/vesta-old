import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Environment } from './environment.entity';
import { Server } from './server.entity';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  environment_id!: string;

  @Column({ type: 'uuid', nullable: true })
  server_id!: string | null;

  @Column({
    type: 'enum',
    enum: [
      'queued',
      'building',
      'deploying',
      'running',
      'failed',
      'rolled_back',
      'cancelled',
    ],
  })
  status!:
    | 'queued'
    | 'building'
    | 'deploying'
    | 'running'
    | 'failed'
    | 'rolled_back'
    | 'cancelled';

  @Column({ type: 'varchar', nullable: true })
  commit_sha!: string | null;

  @Column({ type: 'varchar', nullable: true })
  commit_message!: string | null;

  @Column({ type: 'varchar', nullable: true })
  image_tag!: string | null;

  @Column({ type: 'text', nullable: true })
  build_logs!: string | null;

  @Column({ type: 'text', nullable: true })
  deploy_logs!: string | null;

  @Column({ type: 'int' })
  desired_replicas!: number;

  @Column({ type: 'int', default: 0 })
  running_replicas!: number;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finished_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Environment, (e) => e.deployments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;

  @ManyToOne(() => Server, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'server_id' })
  server!: Server | null;
}

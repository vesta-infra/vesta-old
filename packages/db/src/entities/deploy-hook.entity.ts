import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Environment } from './environment.entity';

@Entity('deploy_hooks')
export class DeployHook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  environment_id!: string;

  @Column({ type: 'enum', enum: ['pre_deploy', 'post_deploy'] })
  phase!: 'pre_deploy' | 'post_deploy';

  @Column({ type: 'varchar' })
  command!: string;

  @Column({ type: 'int', default: 60 })
  timeout_seconds!: number;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Environment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;
}

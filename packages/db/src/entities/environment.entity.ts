import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Deployment } from './deployment.entity';
import { ResourceLimit } from './resource-limit.entity';
import { MaintenanceWindow } from './maintenance-window.entity';
import { LogRetentionPolicy } from './log-retention-policy.entity';

@Entity('environments')
export class Environment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: false })
  auto_deploy!: boolean;

  @Column({ type: 'varchar', nullable: true })
  domain_suffix!: string | null;

  @Column({ type: 'int', default: 1 })
  replicas!: number;

  @Column({ type: 'int', nullable: true })
  min_replicas!: number | null;

  @Column({ type: 'int', nullable: true })
  max_replicas!: number | null;

  @Column({ type: 'boolean', default: false })
  scale_to_zero!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Project, (p) => p.environments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => Deployment, (d) => d.environment)
  deployments!: Deployment[];

  @OneToOne(() => ResourceLimit, (rl) => rl.environment)
  resource_limit?: ResourceLimit;

  @OneToOne(() => MaintenanceWindow, (mw) => mw.environment)
  maintenance_window?: MaintenanceWindow;

  @OneToOne(() => LogRetentionPolicy, (lrp) => lrp.environment)
  log_retention_policy?: LogRetentionPolicy;
}

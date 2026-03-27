import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('service_links')
export class ServiceLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id!: string;

  @Column({ type: 'enum', enum: ['project', 'database'] })
  dependency_type!: 'project' | 'database';

  @Column({ type: 'uuid' })
  dependency_id!: string;

  @Column({ type: 'varchar' })
  injected_env_prefix!: string;

  @Column({ type: 'boolean', default: false })
  cascade_restart!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Project, (p) => p.service_links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}

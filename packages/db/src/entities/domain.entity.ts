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
import { Environment } from './environment.entity';

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id!: string;

  @Column({ type: 'uuid', nullable: true })
  environment_id!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  fqdn!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'error'],
    default: 'pending',
  })
  ssl_status!: 'pending' | 'active' | 'error';

  @Column({ type: 'boolean', default: false })
  redirect_www!: boolean;

  @Column({ type: 'boolean', default: true })
  force_https!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Project, (p) => p.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => Environment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment | null;
}

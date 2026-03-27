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
import { Team } from './team.entity';
import { Environment } from './environment.entity';
import { Domain } from './domain.entity';
import { ServiceLink } from './service-link.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  slug!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  git_provider!: string | null;

  @Column({ type: 'varchar', nullable: true })
  git_url!: string | null;

  @Column({
    type: 'enum',
    enum: ['nixpacks', 'dockerfile', 'compose', 'image'],
  })
  build_method!: 'nixpacks' | 'dockerfile' | 'compose' | 'image';

  @Column({ type: 'jsonb', nullable: true })
  build_config!: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'main' })
  default_branch!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Team, (t) => t.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @OneToMany(() => Environment, (e) => e.project)
  environments!: Environment[];

  @OneToMany(() => Domain, (d) => d.project)
  domains!: Domain[];

  @OneToMany(() => ServiceLink, (sl) => sl.project)
  service_links!: ServiceLink[];
}

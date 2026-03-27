import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { TeamMember } from './team-member.entity';
import { Project } from './project.entity';
import { Server } from './server.entity';
import { TeamQuota } from './team-quota.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => TeamMember, (tm) => tm.team)
  members!: TeamMember[];

  @OneToMany(() => Project, (p) => p.team)
  projects!: Project[];

  @OneToMany(() => Server, (s) => s.team)
  servers!: Server[];

  @OneToOne(() => TeamQuota, (q) => q.team)
  quota?: TeamQuota;
}

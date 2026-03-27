import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('team_quotas')
export class TeamQuota {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  team_id!: string;

  @Column({ type: 'int', nullable: true })
  max_cpu!: number | null;

  @Column({ type: 'int', nullable: true })
  max_memory_mb!: number | null;

  @Column({ type: 'int', nullable: true })
  max_containers!: number | null;

  @Column({ type: 'int', nullable: true })
  max_projects!: number | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Team, (t) => t.quota, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from './user.entity';

@Entity('team_members')
@Unique(['team_id', 'user_id'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'enum', enum: ['owner', 'admin', 'developer', 'viewer'] })
  role!: 'owner' | 'admin' | 'developer' | 'viewer';

  @Column({ type: 'timestamp' })
  invited_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at!: Date | null;

  @ManyToOne(() => Team, (t) => t.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => User, (u) => u.team_memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Team } from './team.entity';

@Entity('api_tokens')
export class ApiToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  token_hash!: string;

  @Column({ type: 'jsonb' })
  scopes!: string[];

  @Column({ type: 'timestamp', nullable: true })
  last_used_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => User, (u) => u.api_tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

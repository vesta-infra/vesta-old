import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('ssh_keys')
export class SshKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  encrypted_private_key!: string;

  @Column({ type: 'text' })
  public_key!: string;

  @Column({ type: 'varchar' })
  fingerprint!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

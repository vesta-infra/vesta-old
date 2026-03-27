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
import { SshKey } from './ssh-key.entity';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  host!: string;

  @Column({ type: 'int', default: 22 })
  port!: number;

  @Column({ type: 'uuid', nullable: true })
  ssh_key_id!: string | null;

  @Column({ type: 'varchar', nullable: true })
  agent_version!: string | null;

  @Column({
    type: 'enum',
    enum: ['online', 'offline', 'installing'],
    default: 'offline',
  })
  agent_status!: 'online' | 'offline' | 'installing';

  @Column({ type: 'int', nullable: true })
  cpu_cores!: number | null;

  @Column({ type: 'int', nullable: true })
  memory_mb!: number | null;

  @Column({ type: 'int', nullable: true })
  disk_gb!: number | null;

  @Column({ type: 'boolean', default: false })
  is_local!: boolean;

  @Column({ type: 'jsonb', default: [] })
  tags!: string[];

  @Column({ type: 'timestamp', nullable: true })
  last_heartbeat_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Team, (t) => t.servers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => SshKey, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ssh_key_id' })
  ssh_key!: SshKey | null;
}

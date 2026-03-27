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
import { StorageDestination } from './storage-destination.entity';

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  resource_type!: string;

  @Column({ type: 'uuid' })
  resource_id!: string;

  @Column({ type: 'uuid' })
  storage_destination_id!: string;

  @Column({
    type: 'enum',
    enum: ['scheduled', 'running', 'completed', 'failed'],
  })
  status!: 'scheduled' | 'running' | 'completed' | 'failed';

  @Column({ type: 'bigint', nullable: true })
  size_bytes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  encryption_key_ref!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finished_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => StorageDestination, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storage_destination_id' })
  storage_destination!: StorageDestination;
}

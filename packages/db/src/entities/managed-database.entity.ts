import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Server } from './server.entity';
import { Team } from './team.entity';

@Entity('managed_databases')
export class ManagedDatabase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  server_id!: string;

  @Index()
  @Column({ type: 'uuid' })
  team_id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['postgres', 'mysql', 'mongo', 'redis', 'clickhouse', 'minio'],
  })
  engine!: 'postgres' | 'mysql' | 'mongo' | 'redis' | 'clickhouse' | 'minio';

  @Column({ type: 'varchar' })
  version!: string;

  @Column({ type: 'int' })
  port!: number;

  @Column({ type: 'uuid', nullable: true })
  credentials_secret_id!: string | null;

  @Column({ type: 'varchar', default: 'provisioning' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Server, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'server_id' })
  server!: Server;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}

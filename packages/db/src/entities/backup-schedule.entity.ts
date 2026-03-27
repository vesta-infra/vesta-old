import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StorageDestination } from './storage-destination.entity';

@Entity('backup_schedules')
export class BackupSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  resource_type!: string;

  @Column({ type: 'uuid' })
  resource_id!: string;

  @Column({ type: 'varchar' })
  cron_expression!: string;

  @Column({ type: 'int', nullable: true })
  retention_count!: number | null;

  @Column({ type: 'int', nullable: true })
  retention_days!: number | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'uuid' })
  storage_destination_id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => StorageDestination, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storage_destination_id' })
  storage_destination!: StorageDestination;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Environment } from './environment.entity';

@Entity('log_retention_policies')
export class LogRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  environment_id!: string;

  @Column({ type: 'int', default: 30 })
  retention_days!: number;

  @Column({ type: 'varchar', default: 'local' })
  storage_backend!: string;

  @Column({ type: 'uuid', nullable: true })
  storage_destination_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Environment, (e) => e.log_retention_policy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;
}

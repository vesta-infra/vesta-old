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

@Entity('maintenance_windows')
export class MaintenanceWindow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  environment_id!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'jsonb', default: [] })
  allowed_ips!: string[];

  @Column({ type: 'varchar', nullable: true })
  bypass_token_hash!: string | null;

  @Column({ type: 'text', nullable: true })
  custom_page_html!: string | null;

  @Column({ type: 'int', default: 503 })
  status_code!: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_start!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_end!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Environment, (e) => e.maintenance_window, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;
}

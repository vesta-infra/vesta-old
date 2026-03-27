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

@Entity('resource_limits')
export class ResourceLimit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  environment_id!: string;

  @Column({ type: 'int', nullable: true })
  cpu_limit!: number | null;

  @Column({ type: 'int', nullable: true })
  memory_limit_mb!: number | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Environment, (e) => e.resource_limit, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'environment_id' })
  environment!: Environment;
}

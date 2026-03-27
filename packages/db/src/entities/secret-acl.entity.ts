import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Secret } from './secret.entity';

@Entity('secret_acls')
export class SecretAcl {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  secret_id!: string | null;

  @Column({ type: 'enum', enum: ['global', 'project', 'environment'] })
  scope!: 'global' | 'project' | 'environment';

  @Column({ type: 'varchar' })
  scope_id!: string;

  @Column({ type: 'enum', enum: ['user', 'role', 'api_token'] })
  grantee_type!: 'user' | 'role' | 'api_token';

  @Column({ type: 'varchar' })
  grantee_id!: string;

  @Column({ type: 'jsonb' })
  permissions!: string[];

  @Column({ type: 'uuid', nullable: true })
  created_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Secret, (s) => s.acls, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'secret_id' })
  secret!: Secret | null;
}

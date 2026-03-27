import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SecretAcl } from './secret-acl.entity';

@Entity('secrets')
@Index(['scope', 'scope_id', 'key'], { unique: true })
export class Secret {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['global', 'project', 'environment'] })
  scope!: 'global' | 'project' | 'environment';

  @Column({ type: 'varchar' })
  scope_id!: string;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  encrypted_value!: string;

  @Column({ type: 'varchar', default: 'builtin' })
  provider_type!: string;

  @Column({ type: 'varchar', nullable: true })
  provider_ref!: string | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => SecretAcl, (acl) => acl.secret)
  acls!: SecretAcl[];
}

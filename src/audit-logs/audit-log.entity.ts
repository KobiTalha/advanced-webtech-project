import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { User } from '../users/user.entity';

@Entity('audit_logs')
@Index(['user_id'])
@Index(['entity_type', 'entity_id'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100 })
  entity_type: string;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  old_value: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_value: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.audit_logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

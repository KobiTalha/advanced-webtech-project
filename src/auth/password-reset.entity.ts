import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @Column({ length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

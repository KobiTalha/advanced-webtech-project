
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';

import { User } from '../users/user.entity';
import { Submission } from '../submissions/submission.entity';

@Entity('ta_reviews')
@Index(['submission_id'])
@Index(['teaching_assistant_id'])
@Check(
  'CHK_ta_review_marks',
  '"recommended_marks" >= 0',
)
export class TaReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  submission_id: string;

  @Column({ type: 'uuid' })
  teaching_assistant_id: string;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
  })
  recommended_marks: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  feedback: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(
    () => Submission,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @ManyToOne(
    () => User,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'teaching_assistant_id' })
  teaching_assistant: User;
}

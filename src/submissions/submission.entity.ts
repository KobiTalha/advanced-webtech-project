import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
  Index,
} from 'typeorm';

import { User } from '../users/user.entity';
import { Assignment } from '../assignments/assignment.entity';

@Entity('submissions')
@Unique('UQ_submission_assignment_student', [
  'assignment_id',
  'student_id',
])
@Check(
  'CHK_submission_marks',
  '"marks_obtained" IS NULL OR "marks_obtained" >= 0',
)
@Index(['assignment_id'])
@Index(['student_id'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assignment_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'text' })
  submission_url: string;

  @CreateDateColumn()
  submitted_at: Date;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  marks_obtained: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'timestamp', nullable: true })
  graded_at: Date;

  @Column({ type: 'uuid', nullable: true })
  graded_by_id: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  recommended_marks: number | null;

  @Column({ type: 'text', nullable: true })
  recommendation_feedback: string | null;

  @Column({ type: 'uuid', nullable: true })
  recommended_by_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  recommended_at: Date | null;

  @ManyToOne(
    () => Assignment,
    (assignment) => assignment.submissions,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, (user) => user.submissions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, (user) => user.graded_submissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'graded_by_id' })
  graded_by: User;
}

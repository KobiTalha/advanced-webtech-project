import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { Lesson } from './lesson.entity';
import { Enrollment } from '../enrollments/enrollment.entity';

@Entity('lesson_progress')
@Unique('UQ_lesson_progress_enrollment_lesson', ['enrollment_id', 'lesson_id'])
@Index(['enrollment_id'])
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  enrollment_id: string;

  @Column({ type: 'uuid' })
  lesson_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  completed_at: Date;

  @ManyToOne(() => Enrollment, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @ManyToOne(() => Lesson, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;
}

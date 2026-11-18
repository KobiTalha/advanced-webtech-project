import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';

import { Course } from '../courses/course.entity';
import { Submission } from '../submissions/submission.entity';

@Entity('assignments')
@Check('CHK_assignment_max_marks', '"max_marks" > 0')
@Index(['course_id'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  course_id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  instructions: string;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  max_marks: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Course, (course) => course.assignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(
    () => Submission,
    (submission) => submission.assignment,
  )
  submissions: Submission[];
}
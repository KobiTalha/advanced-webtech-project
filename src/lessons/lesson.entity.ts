import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';

import { Course } from '../courses/course.entity';

@Entity('lessons')
@Unique('UQ_lesson_course_sequence', ['course_id', 'sequence_number'])
@Index(['course_id'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  course_id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  content_url: string;

  @Column({ type: 'int' })
  sequence_number: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Course, (course) => course.lessons, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
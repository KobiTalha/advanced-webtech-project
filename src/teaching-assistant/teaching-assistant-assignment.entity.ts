import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

@Entity('teaching_assistant_assignments')
@Unique('UQ_ta_course', ['teaching_assistant_id', 'course_id'])
@Index(['course_id'])
export class TeachingAssistantAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teaching_assistant_id: string;

  @Column({ type: 'uuid' })
  course_id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaching_assistant_id' })
  teaching_assistant: User;

  @ManyToOne(() => Course, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}

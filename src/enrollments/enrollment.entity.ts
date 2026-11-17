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

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';

import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

@Entity('enrollments')
@Unique('UQ_enrollment_student_course', [
  'student_id',
  'course_id',
])
@Index(['course_id'])
@Index(['student_id'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'uuid' })
  course_id: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @CreateDateColumn()
  enrolled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @ManyToOne(() => User, (user) => user.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
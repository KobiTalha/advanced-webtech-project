import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';

import { CourseStatus } from '../common/enums/course-status.enum';

import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Lesson } from '../lessons/lesson.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Assignment } from '../assignments/assignment.entity';

@Entity('courses')
@Check('CHK_course_capacity', '"capacity" > 0')
@Check(
  'CHK_course_enrolled_count',
  '"enrolled_count" >= 0 AND "enrolled_count" <= "capacity"',
)
@Index(['instructor_id'])
@Index(['category_id'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid' })
  instructor_id: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  enrolled_count: number;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.courses, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @ManyToOne(() => Category, (category) => category.courses, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Assignment, (assignment) => assignment.course)
  assignments: Assignment[];
}
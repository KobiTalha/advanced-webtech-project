import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { UserRole } from '../common/enums/user-role.enum';

import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Submission } from '../submissions/submission.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { Notification } from '../notifications/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  full_name: string;

  @Column({ unique: true, length: 254 })
  email: string;

  @Column({ length: 255, select: false })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'integer', default: 0 })
  token_version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // One instructor can create many courses
  @OneToMany(() => Course, (course) => course.instructor)
  courses: Course[];

  // One student can have many enrollments
  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  // Student submissions
  @OneToMany(() => Submission, (submission) => submission.student)
  submissions: Submission[];

  // Submissions graded by this user
  @OneToMany(() => Submission, (submission) => submission.graded_by)
  graded_submissions: Submission[];

  @OneToMany(() => AuditLog, (log) => log.user)
  audit_logs: AuditLog[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

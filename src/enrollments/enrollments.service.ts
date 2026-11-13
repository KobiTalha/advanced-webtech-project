import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Course } from '../courses/course.entity';
import { Enrollment } from './enrollment.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { User } from '../users/user.entity';

import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from '../common/enums/course-status.enum';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';

import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async enroll(courseId: string, studentId: string, ipAddress?: string) {
    const result = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const courseRepository = manager.getRepository(Course);
        const enrollmentRepository = manager.getRepository(Enrollment);
        const auditRepository = manager.getRepository(AuditLog);

        const course = await courseRepository
          .createQueryBuilder('course')
          .setLock('pessimistic_write')
          .where('course.id = :courseId', { courseId })
          .getOne();

        if (!course) {
          throw new NotFoundException('Course not found');
        }

        if (course.status !== CourseStatus.PUBLISHED) {
          throw new BadRequestException(
            'You can only enroll in published courses',
          );
        }

        if (course.enrolled_count >= course.capacity) {
          throw new ConflictException(
            'Course has reached its enrollment capacity',
          );
        }

        const existing = await enrollmentRepository.findOne({
          where: {
            student_id: studentId,
            course_id: courseId,
          },
        });
        const previousEnrollment = existing ? { ...existing } : null;

        if (
          existing &&
          existing.status !== EnrollmentStatus.CANCELLED
        ) {
          throw new ConflictException(
            'You are already enrolled in this course',
          );
        }

        let enrollment: Enrollment;

        if (existing) {
          existing.status = EnrollmentStatus.ACTIVE;
          existing.enrolled_at = new Date();
          existing.completed_at = null as any;
          enrollment = await enrollmentRepository.save(existing);
        } else {
          enrollment = enrollmentRepository.create({
            student_id: studentId,
            course_id: courseId,
            status: EnrollmentStatus.ACTIVE,
          });
          enrollment = await enrollmentRepository.save(enrollment);
        }

        course.enrolled_count += 1;
        await courseRepository.save(course);

        const audit = auditRepository.create({
          user_id: studentId,
          action: 'COURSE_ENROLLED',
          entity_type: 'ENROLLMENT',
          entity_id: enrollment.id,
          old_value: previousEnrollment,
          new_value: enrollment,
          ip_address: ipAddress ?? null,
          details: {
            course_id: courseId,
            course_title: course.title,
            enrollment_status: EnrollmentStatus.ACTIVE,
          },
        });

        await auditRepository.save(audit);

        return {
          message: 'Successfully enrolled in course',
          enrollment: {
            id: enrollment.id,
            course_id: enrollment.course_id,
            student_id: enrollment.student_id,
            status: enrollment.status,
            enrolled_at: enrollment.enrolled_at,
          },
          course: {
            id: course.id,
            title: course.title,
            enrolled_count: course.enrolled_count,
            capacity: course.capacity,
          },
        };
      },
    );

    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (student) {
      await this.notificationsService.sendEnrollmentEmail(
        student.id,
        student.email,
        result.course.title,
      );
    }

    return result;
  }

  async cancel(courseId: string, studentId: string, ipAddress?: string) {
    return this.dataSource.transaction(
      async (manager: EntityManager) => {
        const courseRepository = manager.getRepository(Course);
        const enrollmentRepository = manager.getRepository(Enrollment);
        const auditRepository = manager.getRepository(AuditLog);

        const course = await courseRepository
          .createQueryBuilder('course')
          .setLock('pessimistic_write')
          .where('course.id = :courseId', { courseId })
          .getOne();

        if (!course) {
          throw new NotFoundException('Course not found');
        }

        const enrollment = await enrollmentRepository
          .createQueryBuilder('enrollment')
          .setLock('pessimistic_write')
          .where('enrollment.course_id = :courseId', { courseId })
          .andWhere('enrollment.student_id = :studentId', { studentId })
          .getOne();

        if (!enrollment) {
          throw new NotFoundException('Enrollment not found');
        }

        if (enrollment.status !== EnrollmentStatus.ACTIVE) {
          throw new BadRequestException(
            'Only active enrollments can be cancelled',
          );
        }

        const previousEnrollment = { ...enrollment };
        enrollment.status = EnrollmentStatus.CANCELLED;
        await enrollmentRepository.save(enrollment);

        course.enrolled_count = Math.max(
          0,
          course.enrolled_count - 1,
        );
        await courseRepository.save(course);

        const audit = auditRepository.create({
          user_id: studentId,
          action: 'COURSE_ENROLLMENT_CANCELLED',
          entity_type: 'ENROLLMENT',
          entity_id: enrollment.id,
          old_value: previousEnrollment,
          new_value: enrollment,
          ip_address: ipAddress ?? null,
          details: {
            course_id: courseId,
            course_title: course.title,
          },
        });

        await auditRepository.save(audit);

        return {
          message: 'Enrollment cancelled successfully',
          enrollment_id: enrollment.id,
          course_id: courseId,
          status: EnrollmentStatus.CANCELLED,
          enrolled_count: course.enrolled_count,
        };
      },
    );
  }

  async getMyEnrollments(studentId: string, query: EnrollmentQueryDto) {
    const repository = this.dataSource.getRepository(Enrollment);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [enrollments, total] = await repository.findAndCount({
      where: { student_id: studentId },
      relations: { course: true },
      select: {
        id: true,
        student_id: true,
        course_id: true,
        status: true,
        enrolled_at: true,
        completed_at: true,
        course: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
      },
      order: {
        enrolled_at: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCourseEnrollments(
    courseId: string,
    user: { id: string; role: UserRole },
    query: EnrollmentQueryDto,
  ) {
    const courseRepository = this.dataSource.getRepository(Course);
    const enrollmentRepository = this.dataSource.getRepository(Enrollment);

    const course = await courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (
      user.role === UserRole.INSTRUCTOR &&
      course.instructor_id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot view enrollments for another instructor’s course',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [enrollments, total] = await enrollmentRepository.findAndCount({
      where: { course_id: courseId },
      relations: { student: true },
      select: {
        id: true,
        student_id: true,
        course_id: true,
        status: true,
        enrolled_at: true,
        completed_at: true,
        student: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      order: {
        enrolled_at: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

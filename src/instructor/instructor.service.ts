
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Submission } from '../submissions/submission.entity';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';
import { InstructorListQueryDto } from './dto/instructor-list-query.dto';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  // -----------------------------------------
  // INSTRUCTOR DASHBOARD
  // -----------------------------------------

  async getDashboard(instructorId: string) {
    const courses = await this.courseRepository.find({
      where: { instructor_id: instructorId },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    const courseIds = courses.map((course) => course.id);

    if (courseIds.length === 0) {
      return {
        statistics: {
          total_courses: 0,
          active_students: 0,
          total_assignments: 0,
          pending_submissions: 0,
        },
        courses: [],
      };
    }

    const [
      activeStudents,
      totalAssignments,
      pendingSubmissions,
    ] = await Promise.all([
      this.enrollmentRepository.count({
        where: {
          course_id: In(courseIds),
          status: EnrollmentStatus.ACTIVE,
        },
      }),

      this.assignmentRepository.count({
        where: {
          course_id: In(courseIds),
        },
      }),

      this.submissionRepository
        .createQueryBuilder('submission')
        .innerJoin('submission.assignment', 'assignment')
        .where('assignment.course_id IN (:...courseIds)', {
          courseIds,
        })
        .andWhere('submission.marks_obtained IS NULL')
        .getCount(),
    ]);

    return {
      statistics: {
        total_courses: courses.length,
        active_students: activeStudents,
        total_assignments: totalAssignments,
        pending_submissions: pendingSubmissions,
      },
      courses,
    };
  }

  // -----------------------------------------
  // LIST INSTRUCTOR COURSES
  // -----------------------------------------

  async getMyCourses(
    instructorId: string,
    query: InstructorListQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [courses, total] = await this.courseRepository.findAndCount({
      where: {
        instructor_id: instructorId,
      },
      relations: {
        category: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        capacity: true,
        enrolled_count: true,
        status: true,
        created_at: true,
        category: {
          id: true,
          name: true,
        },
      },
      order: {
        created_at: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -----------------------------------------
  // VIEW COURSE STUDENTS
  // -----------------------------------------

  async getCourseStudents(
    courseId: string,
    instructorId: string,
    query: InstructorListQueryDto,
  ) {
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not own this course',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [enrollments, total] = await this.enrollmentRepository.findAndCount({
      where: {
        course_id: courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      relations: {
        student: true,
      },
      select: {
        id: true,
        student_id: true,
        course_id: true,
        status: true,
        enrolled_at: true,
        student: {
          id: true,
          full_name: true,
          email: true,
          is_active: true,
        },
      },
      order: {
        enrolled_at: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      total_students: total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      students: enrollments.map((enrollment) => ({
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        full_name: enrollment.student.full_name,
        email: enrollment.student.email,
        is_active: enrollment.student.is_active,
        enrolled_at: enrollment.enrolled_at,
      })),
    };
  }
}

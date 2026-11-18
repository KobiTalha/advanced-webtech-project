import { assertTaAssigned } from '../common/course-access';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Assignment } from './assignment.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Submission } from '../submissions/submission.entity';

import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from '../common/enums/course-status.enum';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';

import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  // ---------------------------------------------
  // CREATE ASSIGNMENT
  // ---------------------------------------------

  async create(
    courseId: string,
    dto: CreateAssignmentDto,
    user: { id: string; role: UserRole },
  ) {
    const course = await this.getCourse(courseId);

    this.checkInstructorOwnership(course, user);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot create assignments in an archived course',
      );
    }

    const deadline = new Date(dto.deadline);

    if (deadline.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Assignment deadline must be in the future',
      );
    }

    const assignment = this.assignmentRepository.create({
      course_id: courseId,
      title: dto.title,
      instructions: dto.instructions,
      deadline,
      max_marks: dto.max_marks,
    });

    return this.assignmentRepository.save(assignment);
  }

  // ---------------------------------------------
  // LIST COURSE ASSIGNMENTS
  // ---------------------------------------------

  async findAll(
    courseId: string,
    user: { id: string; role: UserRole },
    page = 1,
    limit = 10,
  ) {
    await this.checkCourseAccess(courseId, user);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(100, Math.floor(limit))
        : 10;
    const [assignments, total] = await this.assignmentRepository.findAndCount({
      where: {
        course_id: courseId,
      },
      select: {
        id: true,
        course_id: true,
        title: true,
        instructions: true,
        deadline: true,
        max_marks: true,
        created_at: true,
      },
      order: {
        deadline: 'ASC',
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      data: assignments,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ---------------------------------------------
  // GET SINGLE ASSIGNMENT
  // ---------------------------------------------

  async findOne(assignmentId: string, user: { id: string; role: UserRole }) {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.checkCourseAccess(assignment.course_id, user);

    return assignment;
  }

  // ---------------------------------------------
  // UPDATE ASSIGNMENT
  // ---------------------------------------------

  async update(
    assignmentId: string,
    dto: UpdateAssignmentDto,
    user: { id: string; role: UserRole },
  ) {
    return this.assignmentRepository.manager.transaction(async (manager) => {
      const assignment = await manager.findOne(Assignment, {
        where: { id: assignmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const course = await this.getCourse(assignment.course_id);

      this.checkInstructorOwnership(course, user);

      if (course.status === CourseStatus.ARCHIVED) {
        throw new BadRequestException(
          'Cannot update assignments in an archived course',
        );
      }

      if (dto.deadline !== undefined) {
        const deadline = new Date(dto.deadline);

        if (deadline.getTime() <= Date.now()) {
          throw new BadRequestException(
            'Assignment deadline must be in the future',
          );
        }

        assignment.deadline = deadline;
      }

      if (dto.title !== undefined) {
        assignment.title = dto.title;
      }

      if (dto.instructions !== undefined) {
        assignment.instructions = dto.instructions;
      }

      if (
        dto.max_marks !== undefined &&
        Number(dto.max_marks) !== Number(assignment.max_marks)
      ) {
        const submitted = await manager.count(Submission, {
          where: { assignment_id: assignmentId },
        });
        if (submitted > 0)
          throw new BadRequestException(
            'Maximum marks cannot change after students have submitted',
          );
        assignment.max_marks = dto.max_marks;
      }

      return manager.save(Assignment, assignment);
    });
  }

  // ---------------------------------------------
  // DELETE ASSIGNMENT
  // ---------------------------------------------

  async remove(assignmentId: string, user: { id: string; role: UserRole }) {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const course = await this.getCourse(assignment.course_id);

    this.checkInstructorOwnership(course, user);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot delete assignments from an archived course',
      );
    }

    // Preserve student academic records.
    const submissionCount = await this.submissionRepository.count({
      where: {
        assignment_id: assignmentId,
      },
    });

    if (submissionCount > 0) {
      throw new BadRequestException(
        'Cannot delete an assignment that already has submissions',
      );
    }

    await this.assignmentRepository.remove(assignment);

    return {
      message: 'Assignment deleted successfully',
    };
  }

  // ---------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------

  private async getCourse(courseId: string) {
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private checkInstructorOwnership(
    course: Course,
    user: { id: string; role: UserRole },
  ) {
    if (user.role === UserRole.INSTRUCTOR && course.instructor_id !== user.id) {
      throw new ForbiddenException(
        'You cannot manage assignments in another instructor’s course',
      );
    }

    if (user.role !== UserRole.INSTRUCTOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to manage assignments',
      );
    }
  }

  private async checkCourseAccess(
    courseId: string,
    user: { id: string; role: UserRole },
  ) {
    const course = await this.getCourse(courseId);

    if (user.role === UserRole.TA) {
      await assertTaAssigned(this.courseRepository.manager, courseId, user.id);
      return course;
    }

    if (user.role === UserRole.ADMIN) {
      return course;
    }

    if (user.role === UserRole.INSTRUCTOR) {
      if (course.instructor_id !== user.id) {
        throw new NotFoundException('Course not found');
      }

      return course;
    }

    if (
      user.role === UserRole.STUDENT &&
      course.status === CourseStatus.PUBLISHED
    ) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          course_id: courseId,
          student_id: user.id,
        },
      });

      if (
        enrollment &&
        (enrollment.status === EnrollmentStatus.ACTIVE ||
          enrollment.status === EnrollmentStatus.COMPLETED)
      ) {
        return course;
      }
    }

    throw new NotFoundException('Course not found');
  }
}

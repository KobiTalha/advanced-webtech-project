import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  QueryFailedError,
} from 'typeorm';

import { Lesson } from './lesson.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';

import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from '../common/enums/course-status.enum';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';

import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonProgress } from './lesson-progress.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
  ) {}

  async markComplete(lessonId: string, studentId: string) {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.enrollmentRepository.findOne({ where: { course_id: lesson.course_id, student_id: studentId } });
    if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) {
      throw new ForbiddenException('An active course enrollment is required');
    }
    let progress = await this.progressRepository.findOne({ where: { enrollment_id: enrollment.id, lesson_id: lessonId } });
    if (!progress) {
      progress = this.progressRepository.create({ enrollment_id: enrollment.id, lesson_id: lessonId });
      await this.progressRepository.save(progress);
    }
    const [lessonCount, completedCount] = await Promise.all([
      this.lessonRepository.count({ where: { course_id: lesson.course_id } }),
      this.progressRepository.count({ where: { enrollment_id: enrollment.id } }),
    ]);
    if (lessonCount > 0 && lessonCount === completedCount && enrollment.status !== EnrollmentStatus.COMPLETED) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completed_at = new Date();
      await this.enrollmentRepository.save(enrollment);
    }
    return { lesson_id: lessonId, completed_at: progress.completed_at, completed_lessons: completedCount, total_lessons: lessonCount, completed: lessonCount > 0 && lessonCount === completedCount };
  }

  async getProgress(courseId: string, studentId: string) {
    const enrollment = await this.enrollmentRepository.findOne({ where: { course_id: courseId, student_id: studentId } });
    if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) throw new NotFoundException('Enrollment not found');
    const lessons = await this.lessonRepository.find({ where: { course_id: courseId }, order: { sequence_number: 'ASC' }, select: { id: true, title: true, sequence_number: true } });
    const progress = await this.progressRepository.find({ where: { enrollment_id: enrollment.id } });
    const completed = new Map(progress.map((item) => [item.lesson_id, item.completed_at]));
    const data = lessons.map((lesson) => ({ ...lesson, completed_at: completed.get(lesson.id) ?? null }));
    const completedCount = progress.length;
    return { course_id: courseId, completed_lessons: completedCount, total_lessons: lessons.length, percentage: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0, lessons: data };
  }

  // Create a lesson inside a course.
  async create(
    courseId: string,
    dto: CreateLessonDto,
    user: { id: string; role: UserRole },
  ) {
    const course = await this.getCourse(courseId);

    this.checkInstructorOwnership(course, user);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot add lessons to an archived course',
      );
    }

    const existingLesson = await this.lessonRepository.findOne({
      where: {
        course_id: courseId,
        sequence_number: dto.sequence_number,
      },
    });

    if (existingLesson) {
      throw new ConflictException(
        'This lesson sequence number is already in use',
      );
    }

    const lesson = this.lessonRepository.create({
      ...dto,
      course_id: courseId,
    });

    try {
      return await this.lessonRepository.save(lesson);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // List lessons belonging to a course.
  async findAll(
    courseId: string,
    user: { id: string; role: UserRole },
    page = 1,
    limit = 10,
  ) {
    await this.checkCourseAccess(courseId, user);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.floor(limit)) : 10;
    const [lessons, total] = await this.lessonRepository.findAndCount({
      where: { course_id: courseId },
      order: {
        sequence_number: 'ASC',
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        id: true,
        course_id: true,
        title: true,
        description: true,
        content_url: true,
        sequence_number: true,
        created_at: true,
      },
    });
    return {
      data: lessons,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // Retrieve one lesson.
  async findOne(
    lessonId: string,
    user: { id: string; role: UserRole },
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.checkCourseAccess(lesson.course_id, user);

    return lesson;
  }

  // Update a lesson.
  async update(
    lessonId: string,
    dto: UpdateLessonDto,
    user: { id: string; role: UserRole },
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = await this.getCourse(lesson.course_id);

    this.checkInstructorOwnership(course, user);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot update lessons in an archived course',
      );
    }

    if (dto.sequence_number !== undefined) {
      const duplicate = await this.lessonRepository.findOne({
        where: {
          course_id: lesson.course_id,
          sequence_number: dto.sequence_number,
        },
      });

      if (duplicate && duplicate.id !== lesson.id) {
        throw new ConflictException(
          'This lesson sequence number is already in use',
        );
      }
    }

    Object.assign(lesson, dto);

    try {
      return await this.lessonRepository.save(lesson);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Delete a lesson.
  async remove(
    lessonId: string,
    user: { id: string; role: UserRole },
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = await this.getCourse(lesson.course_id);

    this.checkInstructorOwnership(course, user);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot delete lessons from an archived course',
      );
    }

    await this.lessonRepository.remove(lesson);

    return {
      message: 'Lesson deleted successfully',
    };
  }

  // Retrieve the course or return 404.
  private async getCourse(courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  // Instructor ownership check.
  private checkInstructorOwnership(
    course: Course,
    user: { id: string; role: UserRole },
  ) {
    if (
      user.role === UserRole.INSTRUCTOR &&
      course.instructor_id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot manage another instructor’s course',
      );
    }

    if (
      user.role !== UserRole.INSTRUCTOR &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage lessons',
      );
    }
  }

  // Check whether the current user can access a course's lessons.
  private async checkCourseAccess(
    courseId: string,
    user: { id: string; role: UserRole },
  ) {
    const course = await this.getCourse(courseId);

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
        (
          enrollment.status === EnrollmentStatus.ACTIVE ||
          enrollment.status === EnrollmentStatus.COMPLETED
        )
      ) {
        return course;
      }
    }

    throw new NotFoundException('Course not found');
  }

  // Convert PostgreSQL unique-constraint errors into HTTP 409.
  private handleDatabaseError(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error as any).driverError?.code === '23505'
    ) {
      throw new ConflictException(
        'A lesson with this sequence number already exists in this course',
      );
    }

    throw error;
  }
}

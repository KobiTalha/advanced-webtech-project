import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto';
import { Course } from '../courses/course.entity';
import { CourseStatus } from '../common/enums/course-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { TeachingAssistantAssignment } from '../teaching-assistant/teaching-assistant-assignment.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Submission } from '../submissions/submission.entity';
import { AuthService } from '../auth/auth.service';
import { AssignTaDto } from './dto/assign-ta.dto';
import { TaAssignmentQueryDto } from './dto/ta-assignment-query.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { InstructorAdminQueryDto } from './dto/instructor-admin-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(TeachingAssistantAssignment)
    private readonly assignments: Repository<TeachingAssistantAssignment>,
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private readonly courseAssignments: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalTeachingAssistants,
      activeUsers,
      inactiveUsers,
      totalCourses,
      publishedCourses,
      archivedCourses,
      totalEnrollments,
      totalAssignments,
      totalSubmissions,
      totalTaCourseAssignments,
    ] = await Promise.all([
      this.users.count(),
      this.users.countBy({ role: UserRole.STUDENT }),
      this.users.countBy({ role: UserRole.INSTRUCTOR }),
      this.users.countBy({ role: UserRole.TA }),
      this.users.countBy({ is_active: true }),
      this.users.countBy({ is_active: false }),
      this.courses.count(),
      this.courses.countBy({ status: CourseStatus.PUBLISHED }),
      this.courses.countBy({ status: CourseStatus.ARCHIVED }),
      this.enrollments.count(),
      this.courseAssignments.count(),
      this.submissions.count(),
      this.assignments.count(),
    ]);
    return {
      total_users: totalUsers,
      total_students: totalStudents,
      total_instructors: totalInstructors,
      total_teaching_assistants: totalTeachingAssistants,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      total_courses: totalCourses,
      published_courses: publishedCourses,
      archived_courses: archivedCourses,
      total_enrollments: totalEnrollments,
      total_assignments: totalAssignments,
      total_submissions: totalSubmissions,
      total_ta_course_assignments: totalTaCourseAssignments,
    };
  }

  async assignTeachingAssistant(dto: AssignTaDto) {
    const [user, course] = await Promise.all([
      this.users.findOne({ where: { id: dto.teaching_assistant_id } }),
      this.courses.findOne({ where: { id: dto.course_id } }),
    ]);
    if (!user) throw new NotFoundException('Teaching assistant not found');
    if (user.role !== UserRole.TA || !user.is_active)
      throw new BadRequestException('An active TA user is required');
    if (!course) throw new NotFoundException('Course not found');
    if (
      await this.assignments.findOne({
        where: { teaching_assistant_id: user.id, course_id: course.id },
      })
    ) {
      throw new ConflictException('TA is already assigned to this course');
    }
    try {
      return await this.assignments.save(
        this.assignments.create({
          teaching_assistant_id: user.id,
          course_id: course.id,
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error, 'UQ_ta_course'))
        throw new ConflictException('TA is already assigned to this course');
      throw error;
    }
  }

  async listTeachingAssistantAssignments(query: TaAssignmentQueryDto) {
    const qb = this.assignments
      .createQueryBuilder('taAssignment')
      .leftJoinAndSelect('taAssignment.teaching_assistant', 'ta')
      .leftJoinAndSelect('taAssignment.course', 'course')
      .select([
        'taAssignment.id',
        'taAssignment.teaching_assistant_id',
        'taAssignment.course_id',
        'ta.id',
        'ta.full_name',
        'ta.email',
        'ta.role',
        'ta.is_active',
        'course.id',
        'course.title',
        'course.status',
      ]);
    if (query.teaching_assistant_id)
      qb.andWhere('taAssignment.teaching_assistant_id = :taId', {
        taId: query.teaching_assistant_id,
      });
    if (query.course_id)
      qb.andWhere('taAssignment.course_id = :courseId', {
        courseId: query.course_id,
      });
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [data, total] = await qb
      .orderBy('taAssignment.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTeachingAssistantAssignment(id: string) {
    const assignment = await this.assignments.findOne({
      where: { id },
      relations: { teaching_assistant: true, course: true },
      select: {
        id: true,
        teaching_assistant_id: true,
        course_id: true,
        teaching_assistant: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          is_active: true,
        },
        course: { id: true, title: true, status: true },
      },
    });
    if (!assignment) throw new NotFoundException('TA assignment not found');
    return assignment;
  }

  async removeTeachingAssistantAssignment(id: string) {
    const assignment = await this.assignments.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('TA assignment not found');
    await this.assignments.remove(assignment);
    return { message: 'TA assignment removed' };
  }

  async createInstructor(dto: CreateInstructorDto) {
    const password_hash = await this.authService.hashPassword(dto.password);
    try {
      const user = await this.usersService.create({
        full_name: dto.full_name,
        email: dto.email,
        password_hash,
        role: UserRole.INSTRUCTOR,
      });
      return this.instructorProfile(user);
    } catch (error) {
      if (error instanceof ConflictException || this.isUniqueViolation(error))
        throw new ConflictException('Email already registered');
      throw error;
    }
  }

  async listInstructors(query: InstructorAdminQueryDto) {
    const qb = this.users
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.INSTRUCTOR })
      .select([
        'user.id',
        'user.full_name',
        'user.email',
        'user.is_active',
        'user.created_at',
        'user.updated_at',
      ]);
    if (query.search?.trim())
      qb.andWhere(
        '(LOWER(user.full_name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${query.search.trim()}%` },
      );
    if (query.is_active !== undefined)
      qb.andWhere('user.is_active = :isActive', { isActive: query.is_active });
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [data, total] = await qb
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInstructor(id: string) {
    const user = await this.findInstructor(id);
    const [
      totalCourses,
      publishedCourses,
      archivedCourses,
      totalAssignments,
      totalEnrollments,
    ] = await Promise.all([
      this.courses.countBy({ instructor_id: id }),
      this.courses.countBy({
        instructor_id: id,
        status: CourseStatus.PUBLISHED,
      }),
      this.courses.countBy({
        instructor_id: id,
        status: CourseStatus.ARCHIVED,
      }),
      this.courseAssignments
        .createQueryBuilder('assignment')
        .innerJoin('assignment.course', 'course')
        .where('course.instructor_id = :id', { id })
        .getCount(),
      this.enrollments
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.course', 'course')
        .where('course.instructor_id = :id', { id })
        .getCount(),
    ]);
    return {
      ...this.instructorProfile(user),
      course_statistics: {
        total_courses: totalCourses,
        published_courses: publishedCourses,
        archived_courses: archivedCourses,
        total_assignments: totalAssignments,
        total_enrollments: totalEnrollments,
      },
    };
  }

  async updateInstructor(id: string, dto: UpdateProfileDto) {
    const user = await this.findInstructor(id);
    try {
      const updated = await this.usersService.updateProfile(id, dto);
      return updated;
    } catch (error) {
      if (error instanceof ConflictException || this.isUniqueViolation(error))
        throw new ConflictException('Email already registered');
      throw error;
    }
  }

  async updateInstructorStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actingAdminId: string,
  ) {
    await this.findInstructor(id);
    await this.usersService.updateStatus(id, dto, actingAdminId);
    return this.instructorProfile(await this.findInstructor(id));
  }

  private async findInstructor(id: string) {
    const user = await this.users.findOne({
      where: { id, role: UserRole.INSTRUCTOR },
    });
    if (!user) throw new NotFoundException('Instructor not found');
    return user;
  }

  private instructorProfile(user: User) {
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  private isUniqueViolation(error: unknown, constraint?: string) {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (
      error as QueryFailedError & {
        driverError?: { code?: string; constraint?: string };
      }
    ).driverError;
    return (
      driverError?.code === '23505' &&
      (!constraint || driverError.constraint === constraint)
    );
  }
}

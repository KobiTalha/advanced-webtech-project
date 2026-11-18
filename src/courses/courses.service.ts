import { User } from '../users/user.entity';
import { assertTaAssigned } from '../common/course-access';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './course.entity';
import { Category } from '../categories/category.entity';

import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from '../common/enums/course-status.enum';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCourseDto, instructorId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.courseRepository.manager.transaction(async (manager) => {
      const instructor = await manager.findOne(User, {
        where: { id: instructorId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instructor?.is_active || instructor.role !== UserRole.INSTRUCTOR) {
        throw new ForbiddenException(
          'An active instructor must own the course',
        );
      }
      const course = manager.create(Course, {
        title: dto.title,
        description: dto.description,
        category_id: dto.category_id,
        instructor_id: instructorId,
        capacity: dto.capacity,
        enrolled_count: 0,
        status: CourseStatus.DRAFT,
      });

      return manager.save(Course, course);
    });
  }

  async findAll(query: CourseQueryDto, user: { id: string; role: UserRole }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .select([
        'course.id',
        'course.title',
        'course.description',
        'course.category_id',
        'course.instructor_id',
        'course.capacity',
        'course.enrolled_count',
        'course.status',
        'course.created_at',
        'course.updated_at',
        'category.id',
        'category.name',
        'instructor.id',
        'instructor.full_name',
      ]);

    if (user.role === UserRole.STUDENT) {
      qb.andWhere('course.status = :status', {
        status: CourseStatus.PUBLISHED,
      });
    } else if (user.role === UserRole.TA) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM teaching_assistant_assignments ta WHERE ta.course_id = course.id AND ta.teaching_assistant_id = :taId)',
        { taId: user.id },
      );
    } else if (user.role === UserRole.INSTRUCTOR) {
      qb.andWhere('course.instructor_id = :instructorId', {
        instructorId: user.id,
      });
    }

    if (query.status) {
      qb.andWhere('course.status = :filterStatus', {
        filterStatus: query.status,
      });
    }

    if (query.category_id) {
      qb.andWhere('course.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.search?.trim()) {
      qb.andWhere(
        '(LOWER(course.title) LIKE LOWER(:search) OR LOWER(course.description) LIKE LOWER(:search))',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('course.created_at', 'DESC');

    const [courses, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async findOne(id: string, user: { id: string; role: UserRole }) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: {
        category: true,
        instructor: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category_id: true,
        instructor_id: true,
        capacity: true,
        enrolled_count: true,
        status: true,
        created_at: true,
        updated_at: true,
        category: {
          id: true,
          name: true,
        },
        instructor: {
          id: true,
          full_name: true,
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (
      user.role === UserRole.STUDENT &&
      course.status !== CourseStatus.PUBLISHED
    ) {
      throw new NotFoundException('Course not found');
    }

    if (user.role === UserRole.INSTRUCTOR && course.instructor_id !== user.id) {
      throw new ForbiddenException(
        'You cannot access another instructor’s course',
      );
    }

    if (user.role === UserRole.TA) {
      await assertTaAssigned(this.courseRepository.manager, course.id, user.id);
    }
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, userId: string) {
    const course = await this.findOwnedCourse(id, userId);

    if (dto.capacity !== undefined && dto.capacity < course.enrolled_count) {
      throw new BadRequestException(
        'Capacity cannot be lower than the current enrollment count',
      );
    }

    if (dto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    Object.assign(course, dto);

    return this.courseRepository.save(course);
  }

  async publish(id: string, userId: string) {
    const course = await this.findOwnedCourse(id, userId);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Archived courses cannot be published');
    }

    course.status = CourseStatus.PUBLISHED;

    return this.courseRepository.save(course);
  }

  async archive(id: string, user: { id: string; role: UserRole }) {
    const course = await this.courseRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role !== UserRole.ADMIN && course.instructor_id !== user.id) {
      throw new ForbiddenException(
        'You cannot archive another instructor’s course',
      );
    }

    course.status = CourseStatus.ARCHIVED;

    return this.courseRepository.save(course);
  }

  async transferInstructor(id: string, instructorId: string) {
    return this.courseRepository.manager.transaction(async (manager) => {
      const instructor = await manager.findOne(User, {
        where: { id: instructorId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instructor) throw new NotFoundException('Instructor not found');
      if (!instructor.is_active || instructor.role !== UserRole.INSTRUCTOR) {
        throw new BadRequestException('Choose an active instructor');
      }
      const course = await manager.findOne(Course, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!course) throw new NotFoundException('Course not found');
      course.instructor_id = instructorId;
      return manager.save(Course, course);
    });
  }

  private async findOwnedCourse(id: string, instructorId: string) {
    const course = await this.courseRepository.findOne({
      where: {
        id,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not own this course',
      );
    }

    return course;
  }
}

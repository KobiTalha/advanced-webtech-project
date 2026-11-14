import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './entities/course.entity';
import { CourseStatus } from '../common/enums/course-status.enum';
import { CourseQueryDto } from './dto/course-query.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async findPublishedCourses(query: CourseQueryDto) {
    const {
      search,
      categoryId,
      page = 1,
      limit = 10,
      sort = 'newest',
    } = query;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoin('course.instructor', 'instructor')
      .addSelect([
        'instructor.id',
        'instructor.name',
      ])
      .where('course.status = :status', {
        status: CourseStatus.PUBLISHED,
      });

    if (search?.trim()) {
      queryBuilder.andWhere(
        'course.title ILIKE :search',
        { search: `%${search.trim()}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere(
        'category.id = :categoryId',
        { categoryId },
      );
    }

    const sortMap = {
      newest: { 'course.createdAt': 'DESC' as const },
      oldest: { 'course.createdAt': 'ASC' as const },
      title: { 'course.title': 'ASC' as const },
    };

    queryBuilder
      .orderBy(
        Object.keys(sortMap[sort])[0],
        Object.values(sortMap[sort])[0],
      )
      .skip((page - 1) * limit)
      .take(limit);

    const [courses, total] =
      await queryBuilder.getManyAndCount();

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

  async findPublishedCourse(id: string) {
    const course = await this.courseRepository.findOne({
      where: {
        id,
        status: CourseStatus.PUBLISHED,
      },
      relations: {
        category: true,
        instructor: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          id: true,
          name: true,
          description: true,
        },
        instructor: {
          id: true,
          name: true,
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Published course not found');
    }

    return course;
  }
}
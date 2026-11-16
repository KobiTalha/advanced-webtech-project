import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  private async findOwnedCourse(
    courseId: string,
    instructorId: string,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
        instructor: { id: instructorId },
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not own this course',
      );
    }

    return course;
  }

  async createCourse(
    instructorId: string,
    dto: CreateCourseDto,
  ) {
    const [instructor, category] = await Promise.all([
      this.userRepository.findOne({
        where: { id: instructorId },
      }),

      this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      }),
    ]);

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const course = this.courseRepository.create({
      title: dto.title,
      description: dto.description,
      instructor,
      category,
    });

    return this.courseRepository.save(course);
  }

  async getMyCourses(instructorId: string) {
    return this.courseRepository.find({
      where: {
        instructor: { id: instructorId },
      },
      relations: {
        category: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateCourse(
    courseId: string,
    instructorId: string,
    dto: UpdateCourseDto,
  ) {
    const course = await this.findOwnedCourse(
      courseId,
      instructorId,
    );

    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      course.category = category;
    }

    if (dto.title !== undefined) {
      course.title = dto.title;
    }

    if (dto.description !== undefined) {
      course.description = dto.description;
    }

    if (dto.status !== undefined) {
      course.status = dto.status;
    }

    return this.courseRepository.save(course);
  }

  async createLesson(
    courseId: string,
    instructorId: string,
    dto: CreateLessonDto,
  ) {
    const course = await this.findOwnedCourse(
      courseId,
      instructorId,
    );

    const lesson = this.lessonRepository.create({
      title: dto.title,
      description: dto.description,
      content: dto.content,
      videoUrl: dto.videoUrl,
      position: dto.position ?? 1,
      course,
    });

    return this.lessonRepository.save(lesson);
  }

  async getCourseLessons(
    courseId: string,
    instructorId: string,
  ) {
    await this.findOwnedCourse(courseId, instructorId);

    return this.lessonRepository.find({
      where: {
        course: { id: courseId },
      },
      order: {
        position: 'ASC',
      },
    });
  }

  async updateLesson(
    lessonId: string,
    instructorId: string,
    dto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: {
        id: lessonId,
        course: {
          instructor: { id: instructorId },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(
        'Lesson not found or you do not own its course',
      );
    }

    Object.assign(lesson, dto);

    return this.lessonRepository.save(lesson);
  }

  async deleteLesson(
    lessonId: string,
    instructorId: string,
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: {
        id: lessonId,
        course: {
          instructor: { id: instructorId },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(
        'Lesson not found or you do not own its course',
      );
    }

    await this.lessonRepository.remove(lesson);

    return {
      message: 'Lesson deleted successfully',
    };
  }
}
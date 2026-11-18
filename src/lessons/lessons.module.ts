import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lesson } from './lesson.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { LessonProgress } from './lesson-progress.entity';

import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lesson,
      Course,
      Enrollment,
      LessonProgress,
    ]),
  ],

  controllers: [
    LessonsController,
  ],

  providers: [
    LessonsService,
  ],

  exports: [
    LessonsService,
  ],
})
export class LessonsModule {}

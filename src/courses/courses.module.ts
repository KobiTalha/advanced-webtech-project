import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './course.entity';
import { Category } from '../categories/category.entity';

import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Category,
    ]),
  ],

  controllers: [
    CoursesController,
  ],

  providers: [
    CoursesService,
  ],

  exports: [
    CoursesService,
  ],
})
export class CoursesModule {}
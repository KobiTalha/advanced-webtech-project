import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';

import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      User,
      Category,
      Course,
      Lesson,
    ]),
  ],

  controllers: [InstructorController],
  providers: [InstructorService],
})
export class InstructorModule {}
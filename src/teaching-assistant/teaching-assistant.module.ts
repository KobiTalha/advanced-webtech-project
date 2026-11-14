import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachingAssistantCourse } from '../teaching-assistant/entities/teaching-assistant-course.entity';

import { AuthModule } from '../auth/auth.module';

import { TeachingAssistantCourse } from './entities/teaching-assistant-course.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission } from '../submissions/entities/submission.entity';

import { TeachingAssistantController } from './teaching-assistant.controller';
import { TeachingAssistantService } from './teaching-assistant.service';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      TeachingAssistantCourse,
      Course,
      Lesson,
      Assignment,
      Submission,
    ]),
  ],

  controllers: [TeachingAssistantController],
  providers: [TeachingAssistantService],
})
export class TeachingAssistantModule {}
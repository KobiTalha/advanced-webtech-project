import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Assignment } from './assignment.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Submission } from '../submissions/submission.entity';

import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Course,
      Enrollment,
      Submission,
    ]),
  ],

  controllers: [
    AssignmentsController,
  ],

  providers: [
    AssignmentsService,
  ],

  exports: [
    AssignmentsService,
  ],
})
export class AssignmentsModule {}
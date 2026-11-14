import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';

import { Assignment } from './entities/assignment.entity';
import { Course } from '../courses/entities/course.entity';

import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Assignment,
      Course,
      Enrollment,
    ]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
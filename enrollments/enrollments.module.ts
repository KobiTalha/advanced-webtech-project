import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from './enrollment.entity';
import { Course } from '../courses/course.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { User } from '../users/user.entity';

import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Course,
      AuditLog,
      User,
    ]),
    NotificationsModule,
  ],

  controllers: [
    EnrollmentsController,
  ],

  providers: [
    EnrollmentsService,
  ],

  exports: [
    EnrollmentsService,
  ],
})
export class EnrollmentsModule {}
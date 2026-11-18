import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { TeachingAssistantAssignment } from '../teaching-assistant/teaching-assistant-assignment.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Submission } from '../submissions/submission.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      TeachingAssistantAssignment,
      Enrollment,
      Assignment,
      Submission,
      AuditLog,
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeachingAssistantController } from './teaching-assistant.controller';
import { TeachingAssistantService } from './teaching-assistant.service';

import { TeachingAssistantAssignment } from './teaching-assistant-assignment.entity';
import { TaReview } from './ta-review.entity';

import { Assignment } from '../assignments/assignment.entity';
import { Submission } from '../submissions/submission.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeachingAssistantAssignment,
      TaReview,
      Assignment,
      Submission,
      AuditLog,
    ]),
  ],
  controllers: [TeachingAssistantController],
  providers: [TeachingAssistantService],
  exports: [TeachingAssistantService],
})
export class TeachingAssistantModule {}

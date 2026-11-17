import { UserRole } from '../common/enums/user-role.enum';

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RecommendSubmissionDto } from '../submissions/dto/recommend-submission.dto';

import { TeachingAssistantService } from './teaching-assistant.service';

@Controller('teaching-assistant')
@ApiTags('Teaching Assistant')
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.TA)
export class TeachingAssistantController {
  constructor(
    private readonly teachingAssistantService: TeachingAssistantService,
  ) {}

  @Get('courses')
  listAssignedCourses(@CurrentUser('id') userId: string) {
    return this.teachingAssistantService.listAssignedCourses(userId);
  }

  @Get('assignments/:assignmentId/submissions')
  listSubmissions(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teachingAssistantService.listSubmissions(assignmentId, userId);
  }

  @Patch('submissions/:submissionId/recommendation')
  recommend(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: RecommendSubmissionDto,
    @CurrentUser('id') userId: string,
    @Req() request: Request,
  ) {
    return this.teachingAssistantService.recommend(
      submissionId,
      dto,
      userId,
      request.ip,
    );
  }

  @Get('submissions/:submissionId/reviews')
  @Roles(UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN)
  getReviewHistory(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.teachingAssistantService.getReviewHistory(submissionId, user);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Submissions')
@ApiBearerAuth('JWT-auth')
@Controller()
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
  ) {}

  // Student submits assignment.
  @Roles(UserRole.STUDENT)
  @Post('assignments/:assignmentId/submissions')
  create(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser('id') studentId: string,
    @Req() request: Request,
  ) {
    return this.submissionsService.create(
      assignmentId,
      dto,
      studentId,
      request.ip,
    );
  }

  // Student views own submissions.
  @Roles(UserRole.STUDENT)
  @Get('submissions/me')
  getMySubmissions(
    @CurrentUser('id') studentId: string,
  ) {
    return this.submissionsService.getMySubmissions(
      studentId,
    );
  }

  // Instructor/admin views assignment submissions.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get('assignments/:assignmentId/submissions')
  getAssignmentSubmissions(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.getAssignmentSubmissions(
      assignmentId,
      user,
    );
  }

  // Instructor/admin grades submission.
  @Roles(UserRole.INSTRUCTOR)
  @Patch('submissions/:id/grade')
  grade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: any,
    @Req() request: Request,
  ) {
    return this.submissionsService.grade(
      id,
      dto,
      user,
      request.ip,
    );
  }
}

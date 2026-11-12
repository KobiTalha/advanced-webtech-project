import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { EnrollmentsService } from './enrollments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';

@ApiTags('Enrollments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // Student enrolls in a course.
  @Roles(UserRole.STUDENT)
  @Post('courses/:courseId/enroll')
  enroll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') studentId: string,
    @Req() request: Request,
  ) {
    return this.enrollmentsService.enroll(
      courseId,
      studentId,
      request.ip,
    );
  }

  // Student cancels enrollment.
  @Roles(UserRole.STUDENT)
  @Delete('courses/:courseId/enroll')
  cancel(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') studentId: string,
    @Req() request: Request,
  ) {
    return this.enrollmentsService.cancel(
      courseId,
      studentId,
      request.ip,
    );
  }

  // Student views their enrollment history.
  @Roles(UserRole.STUDENT)
  @Get('enrollments/me')
  getMyEnrollments(
    @CurrentUser('id') studentId: string,
    @Query() query: EnrollmentQueryDto,
  ) {
    return this.enrollmentsService.getMyEnrollments(
      studentId,
      query,
    );
  }

  // Instructor or administrator views course enrollments.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get('courses/:courseId/enrollments')
  getCourseEnrollments(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: any,
    @Query() query: EnrollmentQueryDto,
  ) {
    return this.enrollmentsService.getCourseEnrollments(
      courseId,
      user,
      query,
    );
  }
}

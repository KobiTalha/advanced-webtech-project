import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

import { TeachingAssistantService } from './teaching-assistant.service';

@ApiTags('Teaching Assistant')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHING_ASSISTANT)
@Controller('teaching-assistant')
export class TeachingAssistantController {
  constructor(
    private readonly taService: TeachingAssistantService,
  ) {}

  @Get('courses')
  @ApiOperation({ summary: 'Get assigned courses' })
  getMyCourses(@Req() req: any) {
    return this.taService.getMyCourses(req.user.userId);
  }

  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'View lessons of an assigned course' })
  getCourseLessons(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.taService.getCourseLessons(
      courseId,
      req.user.userId,
    );
  }

  @Get('courses/:courseId/assignments')
  @ApiOperation({ summary: 'View assignments of an assigned course' })
  getCourseAssignments(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.taService.getCourseAssignments(
      courseId,
      req.user.userId,
    );
  }

  @Get('assignments/:assignmentId/submissions')
  @ApiOperation({ summary: 'View submissions for an assigned course assignment' })
  getAssignmentSubmissions(
    @Req() req: any,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.taService.getAssignmentSubmissions(
      assignmentId,
      req.user.userId,
    );
  }
}
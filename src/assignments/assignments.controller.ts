import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@ApiTags('Assignments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Post('courses/:courseId')
  @ApiOperation({ summary: 'Create an assignment for an owned course' })
  create(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(
      req.user.userId,
      courseId,
      dto,
    );
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'List assignments in an owned course' })
  findCourseAssignments(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.assignmentsService.findCourseAssignments(
      courseId,
      req.user.userId,
    );
  }

  @Patch(':assignmentId')
  @ApiOperation({ summary: 'Update an owned assignment' })
  update(
    @Req() req: any,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(
      assignmentId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':assignmentId')
  @ApiOperation({ summary: 'Delete an owned assignment' })
  remove(
    @Req() req: any,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.remove(
      assignmentId,
      req.user.userId,
    );
  }
  
  @Get('student/courses/:courseId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiOperation({
  summary: 'View assignments in an enrolled course',
})
findStudentCourseAssignments(
  @Req() req: any,
  @Param('courseId', ParseUUIDPipe) courseId: string,
) {
  return this.assignmentsService.findStudentCourseAssignments(
    courseId,
    req.user.userId,
  );
}
}
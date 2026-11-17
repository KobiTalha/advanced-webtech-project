
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { InstructorService } from './instructor.service';
import { InstructorListQueryDto } from './dto/instructor-list-query.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Instructor')
@ApiBearerAuth('JWT-auth')
@Controller('instructor')
@Roles(UserRole.INSTRUCTOR)
export class InstructorController {
  constructor(
    private readonly instructorService: InstructorService,
  ) {}

  // -----------------------------------------
  // INSTRUCTOR DASHBOARD
  // -----------------------------------------

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get instructor dashboard statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Instructor dashboard retrieved successfully',
  })
  getDashboard(
    @CurrentUser('id') instructorId: string,
  ) {
    return this.instructorService.getDashboard(
      instructorId,
    );
  }

  // -----------------------------------------
  // MY COURSES
  // -----------------------------------------

  @Get('courses')
  @ApiOperation({
    summary: 'Get courses owned by the instructor',
  })
  @ApiResponse({
    status: 200,
    description: 'Instructor courses retrieved successfully',
  })
  getMyCourses(
    @CurrentUser('id') instructorId: string,
    @Query() query: InstructorListQueryDto,
  ) {
    return this.instructorService.getMyCourses(
      instructorId,
      query,
    );
  }

  // -----------------------------------------
  // COURSE STUDENTS
  // -----------------------------------------

  @Get('courses/:courseId/students')
  @ApiOperation({
    summary: 'Get enrolled students in an instructor course',
  })
  @ApiResponse({
    status: 200,
    description: 'Course students retrieved successfully',
  })
  getCourseStudents(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') instructorId: string,
    @Query() query: InstructorListQueryDto,
  ) {
    return this.instructorService.getCourseStudents(
      courseId,
      instructorId,
      query,
    );
  }
}

import { TransferCourseDto } from './dto/transfer-course.dto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CoursesService } from './courses.service';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { UserRole } from '../common/enums/user-role.enum';
@ApiTags('Courses')
@ApiBearerAuth('JWT-auth')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(UserRole.STUDENT, UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get()
  findAll(@Query() query: CourseQueryDto, @CurrentUser() user: any) {
    return this.coursesService.findAll(query, user);
  }

  @Roles(UserRole.STUDENT, UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.findOne(id, user);
  }

  @Roles(UserRole.INSTRUCTOR)
  @Post()
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser('id') instructorId: string,
  ) {
    return this.coursesService.create(dto, instructorId);
  }

  @Roles(UserRole.INSTRUCTOR)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser('id') instructorId: string,
  ) {
    return this.coursesService.update(id, dto, instructorId);
  }

  @Roles(UserRole.INSTRUCTOR)
  @Patch(':id/publish')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') instructorId: string,
  ) {
    return this.coursesService.publish(id, instructorId);
  }

  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.archive(id, user);
  }

  @Patch(':id/instructor')
  @Roles(UserRole.ADMIN)
  transferInstructor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferCourseDto,
  ) {
    return this.coursesService.transferInstructor(id, dto.instructor_id);
  }

  // Deleting a course archives it so enrollment and course history remain intact.
  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.archive(id, user);
  }
}

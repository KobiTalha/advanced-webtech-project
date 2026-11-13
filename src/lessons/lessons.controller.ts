import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LessonsService } from './lessons.service';

import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Lessons')
@ApiBearerAuth('JWT-auth')
@Controller()
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
  ) {}

  // Create a lesson.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Post('courses/:courseId/lessons')
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: any,
  ) {
    return this.lessonsService.create(
      courseId,
      dto,
      user,
    );
  }

  // List all lessons in a course.
  @Roles(
    UserRole.STUDENT,
    UserRole.INSTRUCTOR,
    UserRole.ADMIN,
  )
  @Get('courses/:courseId/lessons')
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  findAll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.lessonsService.findAll(
      courseId,
      user,
      Number(page),
      Number(limit),
    );
  }

  @Roles(UserRole.STUDENT)
  @Post('lessons/:id/complete')
  markComplete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') studentId: string) {
    return this.lessonsService.markComplete(id, studentId);
  }

  @Roles(UserRole.STUDENT)
  @Get('courses/:courseId/progress')
  getProgress(@Param('courseId', ParseUUIDPipe) courseId: string, @CurrentUser('id') studentId: string) {
    return this.lessonsService.getProgress(courseId, studentId);
  }

  // View one lesson.
  @Roles(
    UserRole.STUDENT,
    UserRole.INSTRUCTOR,
    UserRole.ADMIN,
  )
  @Get('lessons/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.lessonsService.findOne(id, user);
  }

  // Update a lesson.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Patch('lessons/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: any,
  ) {
    return this.lessonsService.update(
      id,
      dto,
      user,
    );
  }

  // Delete a lesson.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Delete('lessons/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.lessonsService.remove(id, user);
  }
}

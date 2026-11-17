import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Assignments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // Create assignment.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Post('courses/:courseId/assignments')
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.create(courseId, dto, user);
  }

  // List assignments in a course.
  @Roles(UserRole.STUDENT, UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get('courses/:courseId/assignments')
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  findAll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.assignmentsService.findAll(
      courseId,
      user,
      Number(page),
      Number(limit),
    );
  }

  // View individual assignment.
  @Roles(UserRole.STUDENT, UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get('assignments/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.assignmentsService.findOne(id, user);
  }

  // Update assignment.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Patch('assignments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.update(id, dto, user);
  }

  // Delete assignment.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Delete('assignments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.assignmentsService.remove(id, user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AdminService } from './admin.service';
import { AssignTaDto } from './dto/assign-ta.dto';
import { TaAssignmentQueryDto } from './dto/ta-assignment-query.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { InstructorAdminQueryDto } from './dto/instructor-admin-query.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto';

@Controller('admin')
@ApiTags('Administration')
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get administrative dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Aggregate platform counts' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Post('teaching-assistant-assignments')
  @ApiOperation({ summary: 'Assign a teaching assistant to a course' })
  @ApiResponse({
    status: 400,
    description: 'User is not an active teaching assistant',
  })
  @ApiResponse({ status: 404, description: 'TA user or course not found' })
  @ApiResponse({
    status: 409,
    description: 'TA is already assigned to the course',
  })
  assignTeachingAssistant(@Body() dto: AssignTaDto) {
    return this.adminService.assignTeachingAssistant(dto);
  }

  @Get('teaching-assistant-assignments')
  @ApiOperation({ summary: 'List TA-course assignments' })
  @ApiResponse({
    status: 200,
    description: 'Paginated assignments with TA and course details',
  })
  listTeachingAssistantAssignments(@Query() query: TaAssignmentQueryDto) {
    return this.adminService.listTeachingAssistantAssignments(query);
  }

  @Get('teaching-assistant-assignments/:id')
  @ApiOperation({ summary: 'Get one TA-course assignment' })
  @ApiResponse({
    status: 200,
    description: 'Assignment with TA and course details',
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  getTeachingAssistantAssignment(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTeachingAssistantAssignment(id);
  }

  @Delete('teaching-assistant-assignments/:id')
  @ApiOperation({ summary: 'Remove a TA-course assignment' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  removeTeachingAssistantAssignment(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.removeTeachingAssistantAssignment(id);
  }

  @Post('instructors')
  @ApiOperation({ summary: 'Create an instructor account' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  createInstructor(@Body() dto: CreateInstructorDto) {
    return this.adminService.createInstructor(dto);
  }

  @Get('instructors')
  @ApiOperation({ summary: 'List instructors with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated instructor profiles' })
  listInstructors(@Query() query: InstructorAdminQueryDto) {
    return this.adminService.listInstructors(query);
  }

  @Get('instructors/:id')
  @ApiOperation({ summary: 'Get instructor profile and course statistics' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  getInstructor(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getInstructor(id);
  }

  @Patch('instructors/:id')
  @ApiOperation({ summary: 'Update permitted instructor profile fields' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  updateInstructor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.adminService.updateInstructor(id, dto);
  }

  @Patch('instructors/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate an instructor account' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  updateInstructorStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateInstructorStatus(id, dto, adminId);
  }
}

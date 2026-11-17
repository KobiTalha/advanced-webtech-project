import {
  Controller,
  Get,
} from '@nestjs/common';

import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

import { UserRole } from './enums/user-role.enum';

@Controller('test-access')
export class TestAccessController {

  @Get('profile')
  getProfile(
    @CurrentUser() user: any,
  ) {
    return {
      message: 'Authenticated successfully',
      user,
    };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return {
      message: 'Welcome, administrator',
    };
  }

  @Get('instructor')
  @Roles(UserRole.INSTRUCTOR)
  instructorOnly() {
    return {
      message: 'Welcome, instructor',
    };
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  studentOnly() {
    return {
      message: 'Welcome, student',
    };
  }
  
  @Get('ta')
@Roles(UserRole.TA)
taOnly() {
  return {
    message: 'Welcome, teaching assistant',
  };
}
}
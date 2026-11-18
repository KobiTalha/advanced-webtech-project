import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { UserRole } from '../common/enums/user-role.enum';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // Any authenticated user can view their own profile.
  @Get('me')
  getMyProfile(
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.getUserDetails(userId);
  }

  // Any authenticated user can update their own profile.
  @Patch('me')
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // Only administrators can list all users.
  @Roles(UserRole.ADMIN)
  @Get()
  getAllUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.getAllUsers(
      Number(page),
      Number(limit),
    );
  }

  // Only administrators can view any user's details.
  @Roles(UserRole.ADMIN)
  @Get(':id')
  getUserDetails(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.getUserDetails(id);
  }

  // Only administrators can change user roles.
  @Roles(UserRole.ADMIN)
  @Patch(':id/role')
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto);
  }

  // Only administrators can activate/deactivate accounts.
  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.updateStatus(
      id,
      dto,
      adminId,
    );
  }
}

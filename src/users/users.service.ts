import { Course } from '../courses/course.entity';
import { CourseStatus } from '../common/enums/course-status.enum';
import { Not } from 'typeorm';

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { User } from './user.entity';
import { UserRole } from '../common/enums/user-role.enum';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: {
    full_name: string;
    email: string;
    password_hash: string;
    role?: UserRole;
  }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepository.create({
      ...data,
      role: data.role ?? UserRole.STUDENT,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getAllUsers(page = 1, limit = 10) {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;

    const safeLimit =
      Number.isFinite(limit) && limit >= 1
        ? Math.min(100, Math.floor(limit))
        : 10;

    const [users, total] = await this.userRepository.findAndCount({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      order: { created_at: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data: users,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.findById(id);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
    }

    Object.assign(user, dto);

    const updatedUser = await this.userRepository.save(user);

    return this.getUserDetails(updatedUser.id);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto) {
    await this.dataSource.transaction(async (manager) => {
      // Lock active administrator records before checking the count.
      const activeAdmins = await manager
        .createQueryBuilder(User, 'user')
        .where('user.role = :role', {
          role: UserRole.ADMIN,
        })
        .andWhere('user.is_active = :active', {
          active: true,
        })
        .setLock('pessimistic_write')
        .getMany();

      const user = await manager
        .createQueryBuilder(User, 'user')
        .where('user.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (
        user.role === UserRole.ADMIN &&
        user.is_active &&
        dto.role !== UserRole.ADMIN &&
        activeAdmins.length <= 1
      ) {
        throw new BadRequestException(
          'Cannot remove the last active administrator',
        );
      }

      if (
        user.role === UserRole.INSTRUCTOR &&
        dto.role !== UserRole.INSTRUCTOR
      ) {
        const owned = await manager.count(Course, {
          where: { instructor_id: id, status: Not(CourseStatus.ARCHIVED) },
        });
        if (owned)
          throw new BadRequestException(
            'Transfer or archive this instructor’s courses before changing their role',
          );
      }
      user.role = dto.role;

      await manager.save(User, user);
    });

    return this.getUserDetails(id);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actingAdminId: string,
  ) {
    await this.dataSource.transaction(async (manager) => {
      // Serialize account-status changes involving administrators.
      const activeAdmins = await manager
        .createQueryBuilder(User, 'user')
        .where('user.role = :role', {
          role: UserRole.ADMIN,
        })
        .andWhere('user.is_active = :active', {
          active: true,
        })
        .setLock('pessimistic_write')
        .getMany();

      const user = await manager
        .createQueryBuilder(User, 'user')
        .where('user.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.id === actingAdminId && !dto.is_active) {
        throw new BadRequestException('You cannot deactivate your own account');
      }

      if (
        user.role === UserRole.ADMIN &&
        user.is_active &&
        !dto.is_active &&
        activeAdmins.length <= 1
      ) {
        throw new BadRequestException(
          'Cannot deactivate the last active administrator',
        );
      }

      if (user.role === UserRole.INSTRUCTOR && !dto.is_active) {
        const owned = await manager.count(Course, {
          where: { instructor_id: id, status: Not(CourseStatus.ARCHIVED) },
        });
        if (owned)
          throw new BadRequestException(
            'Transfer or archive this instructor’s courses before deactivating them',
          );
      }
      if (user.is_active && !dto.is_active) {
        user.token_version = (user.token_version ?? 0) + 1;
      }
      user.is_active = dto.is_active;

      await manager.save(User, user);
    });

    return this.getUserDetails(id);
  }
}

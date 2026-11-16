import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      12,
    );

    const user = await this.usersService.create({
      full_name: registerDto.full_name,
      email: registerDto.email,
      password_hash: passwordHash,
    });

    await this.notificationsService.sendWelcomeEmail(
      user.id,
      user.email,
      user.full_name,
    );

    const accessToken = await this.generateToken(user);

    return {
      message: 'Registration successful',
      access_token: accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user =
      await this.usersService.findByEmailWithPassword(
        loginDto.email,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        'Your account is inactive',
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const accessToken = await this.generateToken(user);

    return {
      message: 'Login successful',
      access_token: accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async generateToken(
    user: Pick<User, 'id' | 'email' | 'role'>,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }
}

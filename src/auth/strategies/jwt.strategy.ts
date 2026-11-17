import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is missing from environment configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub?: string; version?: number }) {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.sub.trim().length === 0
    ) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    let user;

    try {
      user = await this.usersService.findById(payload.sub);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          'User associated with this token no longer exists',
        );
      }

      throw error;
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    if ((payload.version ?? 0) !== (user.token_version ?? 0)) {
      throw new UnauthorizedException('Session expired; log in again');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MailModule } from '../mail/mail.module';
import { PasswordReset } from './password-reset.entity';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { UsersModule } from '../users/users.module';

import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordReset]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    MailModule,
    UsersModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),

        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
    NotificationsModule,
  ],

  controllers: [AuthController, PasswordResetController],

  providers: [PasswordResetService, ThrottlerGuard, AuthService, JwtStrategy],

  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}

import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { APP_FILTER } from '@nestjs/core';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

import { TimingInterceptor } from './common/interceptors/timing.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TestAccessController } from './common/test-access.controller';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { MailModule } from './mail/mail.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminModule } from './admin/admin.module';
import { InstructorModule } from './instructor/instructor.module';
import { TeachingAssistantModule } from './teaching-assistant/teaching-assistant.module';

@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),

        port: configService.get<number>('DB_PORT'),

        username: configService.get<string>('DB_USERNAME'),

        password: configService.get<string>('DB_PASSWORD'),

        database: configService.get<string>('DB_NAME'),

        autoLoadEntities: true,

        synchronize: false,

        migrationsRun: false,
      }),
    }),

    UsersModule,
    AuthModule,
    CategoriesModule,
    CoursesModule,
    LessonsModule,
    NotificationsModule,
    EnrollmentsModule,
    AssignmentsModule,
    MailModule,
    SubmissionsModule,
    AuditLogsModule,
    AdminModule,
    InstructorModule,
    TeachingAssistantModule,
  ],


providers: [
  {
  provide: APP_FILTER,
  useClass: HttpExceptionFilter,
},
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },

  {
  provide: APP_INTERCEPTOR,
  useClass: TimingInterceptor,
},
{
  provide: APP_INTERCEPTOR,
  useClass: AuditInterceptor,
},
{
  provide: APP_INTERCEPTOR,
  useClass: ResponseTransformInterceptor,
},
],

controllers: [TestAccessController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestLoggerMiddleware,
      )
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}

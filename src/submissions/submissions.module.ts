import { Module } from '@nestjs/common';

import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';


@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationsModule],
  controllers: [
    SubmissionsController,
  ],

  providers: [
    SubmissionsService,
  ],

  exports: [
    SubmissionsService,
  ],
})
export class SubmissionsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    MailModule,
  ],

  controllers: [NotificationsController],

  providers: [NotificationsService],

  exports: [NotificationsService],
})
export class NotificationsModule {}
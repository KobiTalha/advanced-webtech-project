import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './notification.entity';
import { NotificationStatus } from '../common/enums/notification-status.enum';

import { MailService } from '../mail/mail.service';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(
    NotificationsService.name,
  );

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    private readonly mailService: MailService,
  ) {}

  // =============================================
  // GENERAL EMAIL NOTIFICATION
  // =============================================

  async sendNotification(
    userId: string,
    recipientEmail: string,
    type: string,
    subject: string,
    html: string,
  ) {
    let notification: Notification;

    // 1. Save notification record.
    try {
      notification = this.notificationRepository.create({
        user_id: userId,
        type,
        subject,
        recipient_email: recipientEmail,
        status: NotificationStatus.PENDING,
      });

      notification =
        await this.notificationRepository.save(notification);

    } catch (error) {
      this.logger.error(
        'Could not save notification record',
        error instanceof Error ? error.stack : undefined,
      );

      return {
        status: 'NOT_RECORDED',
      };
    }

    // 2. Attempt email delivery.
    try {
      await this.mailService.sendMail(
        recipientEmail,
        subject,
        html,
      );

      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();

      await this.notificationRepository.save(notification);

      return {
        notification_id: notification.id,
        status: NotificationStatus.SENT,
      };

    } catch (error) {
      this.logger.error(
        `Email delivery failed for notification ${notification.id}`,
        error instanceof Error ? error.stack : undefined,
      );

      // 3. Record failed delivery.
      try {
        notification.status = NotificationStatus.FAILED;

        await this.notificationRepository.save(notification);

      } catch (saveError) {
        this.logger.error(
          'Could not update failed notification status',
          saveError instanceof Error ? saveError.stack : undefined,
        );
      }

      return {
        notification_id: notification.id,
        status: NotificationStatus.FAILED,
      };
    }
  }

  // =============================================
  // WELCOME EMAIL
  // =============================================

  async sendWelcomeEmail(
    userId: string,
    email: string,
    fullName: string,
  ) {
    return this.sendNotification(
      userId,
      email,
      'WELCOME',
      'Welcome to EduSphere!',
      this.renderTemplate('welcome.html', { fullName }),
    );
  }

  // =============================================
  // ENROLLMENT CONFIRMATION EMAIL
  // =============================================

  async sendEnrollmentEmail(
    userId: string,
    email: string,
    courseTitle: string,
  ) {
    return this.sendNotification(
      userId,
      email,
      'ENROLLMENT_CONFIRMATION',
      'Course Enrollment Confirmation',
      this.renderTemplate('enrollment-confirmation.html', { courseTitle }),
    );
  }

  // =============================================
  // GRADING NOTIFICATION EMAIL
  // =============================================

  async sendGradeEmail(
    userId: string,
    email: string,
    assignmentTitle: string,
    marks: number,
    maxMarks: number,
    feedback?: string,
  ) {
    return this.sendNotification(
      userId,
      email,
      'GRADE_PUBLISHED',
      'Your Assignment Has Been Graded',
      this.renderTemplate('grade-notification.html', {
        assignmentTitle,
        marks: String(marks),
        maxMarks: String(maxMarks),
        feedback: feedback || 'No feedback provided',
      }),
    );
  }

  // =============================================
  // NOTIFICATION HISTORY
  // =============================================

  async getMyNotifications(
    userId: string,
    page = 1,
    limit = 10,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: {
          user_id: userId,
        },

        select: {
          id: true,
          type: true,
          subject: true,
          recipient_email: true,
          status: true,
          sent_at: true,
          created_at: true,
        },

        order: {
          created_at: 'DESC',
        },

        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });

    return {
      data: notifications,

      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // =============================================
  // HTML ESCAPING
  // =============================================

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    });
  }

  private renderTemplate(fileName: string, values: Record<string, string>): string {
    const template = readFileSync(
      join(__dirname, '../mail/templates', fileName),
      'utf8',
    );
    return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) =>
      this.escapeHtml(values[key] ?? ''),
    );
  }
}

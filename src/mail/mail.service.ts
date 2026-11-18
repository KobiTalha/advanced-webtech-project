import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {}

  async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const user = this.configService.get<string>('MAIL_USER');
    const password = this.configService.get<string>('MAIL_PASSWORD');
    const from = this.configService.get<string>('MAIL_FROM');

    if (!host || !from) {
      throw new ServiceUnavailableException(
        'SMTP configuration is incomplete',
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && password
        ? { user, pass: password }
        : undefined,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    this.logger.log(`Email sent to ${to}`);
  }
}
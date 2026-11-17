import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { PasswordReset } from './password-reset.entity';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
  ) {}

  async request(email: string) {
    const token = randomBytes(32).toString('hex');
    const hash = this.hash(token);
    const recipient = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { email },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user?.is_active) return null;
      const existing = await manager.findOne(PasswordReset, {
        where: { user_id: user.id },
      });
      // Avoid repeated emails for the same account, even from different IPs.
      if (existing && existing.expires_at.getTime() > Date.now() + 14 * 60_000)
        return null;
      await manager.save(
        PasswordReset,
        manager.create(PasswordReset, {
          user_id: user.id,
          token_hash: hash,
          expires_at: new Date(Date.now() + 15 * 60_000),
        }),
      );
      return user.email;
    });
    if (recipient) {
      try {
        await this.mail.sendMail(
          recipient,
          'Reset your EduSphere password',
          `<p>Your password reset token is:</p><p><code>${token}</code></p><p>Use it with your new password in the password reset form or API. It expires in 15 minutes and can be used once. If you did not request this, ignore this message.</p>`,
        );
      } catch {
        await this.dataSource
          .getRepository(PasswordReset)
          .delete({ token_hash: hash });
        this.logger.warn('Password reset email could not be delivered');
      }
    }
    return {
      message:
        'If the account is eligible, password reset instructions will be emailed.',
    };
  }

  async reset(token: string, password: string) {
    const tokenHash = this.hash(token);
    const candidate = await this.dataSource
      .getRepository(PasswordReset)
      .findOne({ where: { token_hash: tokenHash } });
    if (!candidate || candidate.expires_at.getTime() <= Date.now())
      throw this.invalidToken();
    const passwordHash = await bcrypt.hash(password, 12);
    await this.dataSource.transaction(async (manager) => {
      // Same lock order as reset requests: user, then reset record.
      const user = await manager.findOne(User, {
        where: { id: candidate.user_id },
        lock: { mode: 'pessimistic_write' },
      });
      const reset = await manager.findOne(PasswordReset, {
        where: { user_id: candidate.user_id, token_hash: tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !user?.is_active ||
        !reset ||
        reset.expires_at.getTime() <= Date.now()
      )
        throw this.invalidToken();
      user.password_hash = passwordHash;
      user.token_version = (user.token_version ?? 0) + 1;
      await manager.save(User, user);
      await manager.delete(PasswordReset, { user_id: user.id });
    });
    return {
      message: 'Password updated. Log in again with your new password.',
    };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private invalidToken() {
    return new BadRequestException('Invalid or expired password reset token');
  }
}

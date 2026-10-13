import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';
import { EnvVars } from '../config/env.validation';
import {
  MAIL_QUEUE,
  JOB_SEND_OTP,
  JOB_SEND_RESET,
  JOB_SEND_RESET_OTP,
} from './mail.constants';
import type { MailJobData } from './mail.processor';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isDevMode: boolean;

  constructor(
    private readonly configService: ConfigService<EnvVars, true>,
    private readonly mailerService: MailerService,
    @Optional() @InjectQueue(MAIL_QUEUE) private readonly mailQueue?: Queue,
    @Optional() private readonly i18n?: I18nService,
  ) {
    const user = this.configService.get('MAIL_USER', { infer: true });
    const pass = this.configService.get('MAIL_PASS', { infer: true });
    this.isDevMode = !user || !pass || user.includes('your_email');

    if (this.isDevMode) {
      this.logger.warn(
        'MAIL_USER or MAIL_PASS not configured with real credentials. Emails will be logged to console in dev mode.',
      );
    } else {
      const host =
        this.configService.get('MAIL_HOST', { infer: true }) ||
        'smtp.gmail.com';
      this.logger.log(`MailService initialized with SMTP host: ${host}`);
    }
  }

  /**
   * Enqueue OTP email to BullMQ with 3 automatic retries and exponential backoff
   */
  async sendVerificationOtp(
    email: string,
    otp: string,
    lang?: string,
  ): Promise<boolean> {
    if (this.mailQueue) {
      try {
        const payload: MailJobData = { email, otp };
        if (lang) payload.lang = lang;
        await this.mailQueue.add(JOB_SEND_OTP, payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        });
        this.logger.log(`Enqueued OTP verification email job for ${email}`);
        return true;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue mail job to Redis, falling back to direct delivery: ${err}`,
        );
      }
    }
    return this.sendDirectOtp(email, otp, lang);
  }

  /**
   * Enqueue password reset email to BullMQ
   */
  async sendPasswordResetLink(
    email: string,
    resetUrl: string,
    lang?: string,
  ): Promise<boolean> {
    if (this.mailQueue) {
      try {
        const payload: MailJobData = { email, resetUrl };
        if (lang) payload.lang = lang;
        await this.mailQueue.add(JOB_SEND_RESET, payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        });
        this.logger.log(`Enqueued password reset email job for ${email}`);
        return true;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue mail job to Redis, falling back to direct delivery: ${err}`,
        );
      }
    }
    return this.sendDirectResetLink(email, resetUrl, lang);
  }

  /**
   * Enqueue password reset OTP email to BullMQ (mobile OTP flow)
   */
  async sendPasswordResetOtp(
    email: string,
    otp: string,
    lang?: string,
  ): Promise<boolean> {
    if (this.mailQueue) {
      try {
        const payload: MailJobData = { email, otp };
        if (lang) payload.lang = lang;
        await this.mailQueue.add(JOB_SEND_RESET_OTP, payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        });
        this.logger.log(`Enqueued password reset OTP job for ${email}`);
        return true;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue mail job to Redis, falling back to direct delivery: ${err}`,
        );
      }
    }
    return this.sendDirectResetOtp(email, otp, lang);
  }

  /**
   * Direct delivery executed by BullMQ Worker Processor
   */
  async sendDirectOtp(
    email: string,
    otp: string,
    lang = 'vi',
  ): Promise<boolean> {
    const subject = this.i18n
      ? this.i18n.t('common.mail.otpSubject', { lang })
      : 'Verification OTP Code';
    const securityTitle = this.i18n
      ? this.i18n.t('common.mail.securityTitle', { lang })
      : 'Security Verification';
    const greeting = this.i18n
      ? this.i18n.t('common.mail.otpGreeting', { lang })
      : 'Hello,';
    const heading = this.i18n
      ? this.i18n.t('common.mail.otpHeading', { lang })
      : 'Your verification code (OTP) is:';
    const expiry = this.i18n
      ? this.i18n.t('common.mail.otpExpiry', { lang })
      : 'This code is valid for 10 minutes. Do not share this code with anyone.';
    const footer = this.i18n
      ? this.i18n.t('common.mail.footer', { lang })
      : 'Application Team';

    if (this.isDevMode) {
      this.logger.log(`[DEV MODE - OTP EMAIL] To: ${email} | Code: ${otp}`);
      return true;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'verification-otp',
        context: {
          layout: 'main',
          subject,
          securityTitle,
          greeting,
          heading,
          otp,
          expiry,
          footer,
        },
      });
      this.logger.log(`Sent verification email to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendDirectResetLink(
    email: string,
    resetUrl: string,
    lang?: string,
  ): Promise<boolean> {
    const activeLang = lang || 'vi';
    const subject = this.i18n
      ? this.i18n.t('common.mail.resetSubject', { lang: activeLang })
      : 'Reset your password';
    const securityTitle = this.i18n
      ? this.i18n.t('common.mail.securityTitle', { lang: activeLang })
      : 'Security Verification';
    const greeting = this.i18n
      ? this.i18n.t('common.mail.resetGreeting', { lang: activeLang })
      : 'Hello,';
    const body = this.i18n
      ? this.i18n.t('common.mail.resetBody', {
          lang: activeLang,
          args: { email },
        })
      : `We received a request to reset the password for ${email}.`;
    const buttonText = this.i18n
      ? this.i18n.t('common.mail.resetButton', { lang: activeLang })
      : 'Reset Password';
    const expiry = this.i18n
      ? this.i18n.t('common.mail.resetExpiry', { lang: activeLang })
      : 'This link is valid for 15 minutes. If you did not make this request, please ignore this email.';
    const footer = this.i18n
      ? this.i18n.t('common.mail.footer', { lang: activeLang })
      : 'Application Team';

    if (this.isDevMode) {
      this.logger.log(
        `[DEV MODE - RESET EMAIL] To: ${email} | URL: ${resetUrl}`,
      );
      return true;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'password-reset-link',
        context: {
          layout: 'main',
          subject,
          securityTitle,
          greeting,
          body,
          resetUrl,
          buttonText,
          expiry,
          footer,
        },
      });
      this.logger.log(`Sent reset password email to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }

  async sendDirectResetOtp(
    email: string,
    otp: string,
    lang?: string,
  ): Promise<boolean> {
    const activeLang = lang || 'vi';
    const subject = this.i18n
      ? this.i18n.t('common.mail.resetOtpSubject', { lang: activeLang })
      : 'Password Reset OTP Code';
    const securityTitle = this.i18n
      ? this.i18n.t('common.mail.securityTitle', { lang: activeLang })
      : 'Security Verification';
    const greeting = this.i18n
      ? this.i18n.t('common.mail.resetGreeting', { lang: activeLang })
      : 'Hello,';
    const heading = this.i18n
      ? this.i18n.t('common.mail.resetOtpHeading', { lang: activeLang })
      : 'Your password reset verification code (OTP) is:';
    const expiry = this.i18n
      ? this.i18n.t('common.mail.resetOtpExpiry', { lang: activeLang })
      : 'This code is valid for 5 minutes. Do not share this code with anyone.';
    const footer = this.i18n
      ? this.i18n.t('common.mail.footer', { lang: activeLang })
      : 'Application Team';

    if (this.isDevMode) {
      this.logger.log(`[DEV MODE - RESET OTP] To: ${email} | Code: ${otp}`);
      return true;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'password-reset-otp',
        context: {
          layout: 'main',
          subject,
          securityTitle,
          greeting,
          heading,
          otp,
          expiry,
          footer,
        },
      });
      this.logger.log(`Sent password reset OTP email to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset OTP email to ${email}`,
        error,
      );
      throw error;
    }
  }
}

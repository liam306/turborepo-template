import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Queue } from 'bullmq';
import { existsSync } from 'fs';
import { MailService } from './mail.service';
import { getMailTemplatesDir } from './mail.module';
import {
  JOB_SEND_OTP,
  JOB_SEND_RESET,
  JOB_SEND_RESET_OTP,
} from './mail.constants';

describe('getMailTemplatesDir', () => {
  it('should return an existing templates directory path', () => {
    const dir = getMailTemplatesDir();
    expect(typeof dir).toBe('string');
    expect(existsSync(dir)).toBe(true);
  });
});

describe('MailService', () => {
  let service: MailService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockMailerService: jest.Mocked<MailerService>;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'MAIL_HOST') return 'smtp.test.local';
        if (key === 'MAIL_PORT') return 587;
        if (key === 'MAIL_SECURE') return 'false';
        if (key === 'MAIL_USER') return 'your_email@gmail.com'; // Trigger dev mode fallback
        if (key === 'MAIL_PASS') return 'secret';
        if (key === 'MAIL_FROM') return 'Starter Test <test@example.local>';
        return defaultVal;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockMailerService = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg_1' } as any),
    } as unknown as jest.Mocked<MailerService>;

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job_1' } as any),
    } as unknown as jest.Mocked<Queue>;

    service = new MailService(mockConfigService, mockMailerService, mockQueue);
  });

  describe('sendVerificationOtp', () => {
    it('should enqueue OTP job to BullMQ when queue is available', async () => {
      const result = await service.sendVerificationOtp(
        'user@example.com',
        '123456',
      );

      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_SEND_OTP,
        { email: 'user@example.com', otp: '123456' },
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        }),
      );
    });

    it('should fall back to direct delivery if queue fails', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis connection lost'));

      const result = await service.sendVerificationOtp(
        'user@example.com',
        '999999',
      );

      expect(result).toBe(true);
    });

    it('should deliver directly if queue is not injected', async () => {
      const serviceNoQueue = new MailService(
        mockConfigService,
        mockMailerService,
        undefined,
      );
      const result = await serviceNoQueue.sendVerificationOtp(
        'user@example.com',
        '888888',
      );

      expect(result).toBe(true);
    });
  });

  describe('sendPasswordResetLink', () => {
    it('should enqueue password reset job to BullMQ', async () => {
      const result = await service.sendPasswordResetLink(
        'user@example.com',
        'https://app.example.local/reset?token=xyz',
      );

      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_SEND_RESET,
        {
          email: 'user@example.com',
          resetUrl: 'https://app.example.local/reset?token=xyz',
        },
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });

    it('should fall back to direct reset link when queue fails', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis full'));

      const result = await service.sendPasswordResetLink(
        'user@example.com',
        'https://app.example.local/reset?token=xyz',
      );

      expect(result).toBe(true);
    });
  });

  describe('sendPasswordResetOtp', () => {
    it('should enqueue password reset OTP job to BullMQ', async () => {
      const result = await service.sendPasswordResetOtp(
        'user@example.com',
        '654321',
      );

      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_SEND_RESET_OTP,
        {
          email: 'user@example.com',
          otp: '654321',
        },
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });
  });

  describe('direct delivery in production mode', () => {
    let prodService: MailService;

    beforeEach(() => {
      const prodConfigService = {
        get: jest.fn((key: string, defaultVal?: any) => {
          if (key === 'MAIL_HOST') return 'smtp.gmail.com';
          if (key === 'MAIL_PORT') return 465;
          if (key === 'MAIL_SECURE') return 'true';
          if (key === 'MAIL_USER') return 'real_user@gmail.com';
          if (key === 'MAIL_PASS') return 'real_pass';
          return defaultVal;
        }),
      } as unknown as jest.Mocked<ConfigService>;

      const mockI18n = {
        t: jest.fn((key: string, options?: { lang?: string }) => {
          const isVi = options?.lang === 'vi';
          if (key === 'common.mail.otpSubject')
            return isVi ? 'Mã xác thực OTP' : 'Verification OTP Code';
          if (key === 'common.mail.otpGreeting')
            return isVi ? 'Xin chào,' : 'Hello,';
          if (key === 'common.mail.otpHeading')
            return isVi
              ? 'Mã xác thực (OTP) của bạn là:'
              : 'Your verification code (OTP) is:';
          return key;
        }),
      } as any;

      prodService = new MailService(
        prodConfigService,
        mockMailerService,
        undefined,
        mockI18n,
      );
    });

    it('should call mailerService.sendMail with verification-otp template', async () => {
      const result = await prodService.sendDirectOtp(
        'user@example.com',
        '123456',
      );

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          template: 'verification-otp',
          context: expect.objectContaining({
            otp: '123456',
            layout: 'main',
          }),
        }),
      );
    });

    it('should call mailerService.sendMail with password-reset-link template', async () => {
      const result = await prodService.sendDirectResetLink(
        'user@example.com',
        'https://app.example.local/reset?token=xyz',
      );

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          template: 'password-reset-link',
          context: expect.objectContaining({
            resetUrl: 'https://app.example.local/reset?token=xyz',
            layout: 'main',
          }),
        }),
      );
    });

    it('should call mailerService.sendMail with password-reset-otp template', async () => {
      const result = await prodService.sendDirectResetOtp(
        'user@example.com',
        '654321',
      );

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          template: 'password-reset-otp',
          context: expect.objectContaining({
            otp: '654321',
            layout: 'main',
          }),
        }),
      );
    });

    it('sets locale-specific subject and context for English and Vietnamese', async () => {
      // English
      await prodService.sendDirectOtp('user@example.com', '111111', 'en');
      expect(mockMailerService.sendMail).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subject: 'Verification OTP Code',
          context: expect.objectContaining({
            greeting: 'Hello,',
            heading: 'Your verification code (OTP) is:',
          }),
        }),
      );

      // Vietnamese
      await prodService.sendDirectOtp('user@example.com', '222222', 'vi');
      expect(mockMailerService.sendMail).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subject: 'Mã xác thực OTP',
          context: expect.objectContaining({
            greeting: 'Xin chào,',
            heading: 'Mã xác thực (OTP) của bạn là:',
          }),
        }),
      );
    });
  });
});

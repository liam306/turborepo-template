import { Job } from 'bullmq';
import { MailProcessor, MailJobData } from './mail.processor';
import { MailService } from './mail.service';
import {
  JOB_SEND_OTP,
  JOB_SEND_RESET,
  JOB_SEND_RESET_OTP,
} from './mail.constants';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let mockMailService: jest.Mocked<MailService>;

  beforeEach(() => {
    mockMailService = {
      sendDirectOtp: jest.fn().mockResolvedValue(true),
      sendDirectResetLink: jest.fn().mockResolvedValue(true),
      sendDirectResetOtp: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<MailService>;

    processor = new MailProcessor(mockMailService);
  });

  const createMockJob = (
    name: string,
    data: MailJobData,
  ): Job<MailJobData, unknown, string> => {
    return {
      id: 'job-1',
      name,
      data,
    } as unknown as Job<MailJobData, unknown, string>;
  };

  it('routes JOB_SEND_OTP to sendDirectOtp', async () => {
    const job = createMockJob(JOB_SEND_OTP, {
      email: 'user@example.com',
      otp: '123456',
      lang: 'vi',
    });

    await processor.process(job);

    expect(mockMailService.sendDirectOtp).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      'vi',
    );
  });

  it('routes JOB_SEND_RESET to sendDirectResetLink', async () => {
    const job = createMockJob(JOB_SEND_RESET, {
      email: 'user@example.com',
      resetUrl: 'https://app.example.com/reset?token=xyz',
      lang: 'en',
    });

    await processor.process(job);

    expect(mockMailService.sendDirectResetLink).toHaveBeenCalledWith(
      'user@example.com',
      'https://app.example.com/reset?token=xyz',
      'en',
    );
  });

  it('routes JOB_SEND_RESET_OTP to sendDirectResetOtp', async () => {
    const job = createMockJob(JOB_SEND_RESET_OTP, {
      email: 'user@example.com',
      otp: '654321',
      lang: 'vi',
    });

    await processor.process(job);

    expect(mockMailService.sendDirectResetOtp).toHaveBeenCalledWith(
      'user@example.com',
      '654321',
      'vi',
    );
  });

  it('returns null and logs warning on unrecognized job name', async () => {
    const job = createMockJob('UNKNOWN_JOB', {
      email: 'user@example.com',
    });

    const result = await processor.process(job);

    expect(result).toBeNull();
    expect(mockMailService.sendDirectOtp).not.toHaveBeenCalled();
    expect(mockMailService.sendDirectResetLink).not.toHaveBeenCalled();
  });
});

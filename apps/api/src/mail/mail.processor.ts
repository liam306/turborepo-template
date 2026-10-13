import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import {
  MAIL_QUEUE,
  JOB_SEND_OTP,
  JOB_SEND_RESET,
  JOB_SEND_RESET_OTP,
} from './mail.constants';

export interface MailJobData {
  email: string;
  otp?: string;
  resetUrl?: string;
  lang?: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private mailService: MailService) {
    super();
  }

  async process(job: Job<MailJobData, unknown, string>): Promise<unknown> {
    this.logger.log(`Processing queue job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case JOB_SEND_OTP:
        return this.mailService.sendDirectOtp(
          job.data.email,
          job.data.otp!,
          job.data.lang,
        );

      case JOB_SEND_RESET:
        return this.mailService.sendDirectResetLink(
          job.data.email,
          job.data.resetUrl!,
          job.data.lang,
        );

      case JOB_SEND_RESET_OTP:
        return this.mailService.sendDirectResetOtp(
          job.data.email,
          job.data.otp!,
          job.data.lang,
        );

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}

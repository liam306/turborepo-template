import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE } from './mail.constants';
import { EnvVars } from '../config/env.validation';

export function getMailTemplatesDir(): string {
  const candidates = [
    join(__dirname, 'mail', 'templates'),
    join(__dirname, 'templates'),
    join(process.cwd(), 'dist', 'mail', 'templates'),
    join(process.cwd(), 'src', 'mail', 'templates'),
    join(process.cwd(), 'apps', 'api', 'dist', 'mail', 'templates'),
    join(process.cwd(), 'apps', 'api', 'src', 'mail', 'templates'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return join(__dirname, 'mail', 'templates');
}

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVars, true>) => {
        const host =
          configService.get('MAIL_HOST', { infer: true }) || 'smtp.gmail.com';
        const port = Number(
          configService.get('MAIL_PORT', { infer: true }) || 465,
        );
        const secure =
          configService.get('MAIL_SECURE', { infer: true }) === 'true';
        const user = configService.get('MAIL_USER', { infer: true });
        const pass = configService.get('MAIL_PASS', { infer: true });
        const from =
          configService.get('MAIL_FROM', { infer: true }) ||
          'Starter <noreply@example.local>';

        const isLocalSmtp = [
          'localhost',
          '127.0.0.1',
          'mailpit',
          'app-mailpit',
        ].includes(host);
        const hasCredentials = user && pass && !user.includes('your_email');
        const isDevFallback = !isLocalSmtp && !hasCredentials;

        const templatesDir = getMailTemplatesDir();

        return {
          transport: isDevFallback
            ? { jsonTransport: true }
            : {
                host,
                port,
                secure,
                ...(hasCredentials && { auth: { user, pass } }),
              },
          defaults: {
            from,
          },
          template: {
            dir: templatesDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          options: {
            partials: {
              dir: templatesDir,
              options: {
                strict: true,
              },
            },
          },
        };
      },
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}

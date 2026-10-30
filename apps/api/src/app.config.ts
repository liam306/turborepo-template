import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
} from './common';

export function configureApp(app: INestApplication): void {
  // Global URI Versioning (v1)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global DTO Validation & Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors = []) => {
        const errors: Record<string, string[]> = {};
        for (const err of validationErrors) {
          const property = err.property;
          const constraints = err.constraints
            ? Object.values(err.constraints)
            : [];
          if (!errors[property]) {
            errors[property] = [];
          }
          errors[property].push(...constraints);
        }
        return new BadRequestException({
          code: 'VALIDATION_FAILED',
          // i18n-audit-ignore: AllExceptionsFilter translates this validation message key using request locale.
          message: 'common.errors.invalidData',
          errors,
        });
      },
    }),
  );

  // Global Response Envelope & Exception Interceptor / Filter
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(I18nService)));
}

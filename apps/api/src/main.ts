import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { EnvVars } from './config/env.validation';
import './instrument';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService<EnvVars, true>>(ConfigService);

  // Trust reverse proxy (Docker / Nginx / Cloudflare)
  app.set('trust proxy', 1);

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Response Compression
  app.use(compression());

  // Parse allowed CORS origins from env (strict, fail-fast if not configured)
  const rawCorsOrigins = configService.get('CORS_ORIGINS', { infer: true });
  if (!rawCorsOrigins) {
    throw new Error(
      'Environment variable CORS_ORIGINS is required but not set.',
    );
  }

  const allowedOrigins = rawCorsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    throw new Error(
      'Environment variable CORS_ORIGINS must contain at least one valid origin.',
    );
  }

  // Enable CORS for allowed domains and mobile clients (no origin header)
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${requestOrigin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'x-lang',
      'Accept-Language',
    ],
    exposedHeaders: ['set-auth-token', 'Set-Auth-Token'],
  });

  // Global configuration: versioning, validation pipe, interceptors, exception filter
  configureApp(app);

  // Basic Auth protection for Swagger Docs and Bull Board dashboard
  const enableDocs =
    configService.get('ENABLE_DOCS', { infer: true }) !== 'false';
  const docsUser = configService.get('DOCS_USER', { infer: true }) || 'admin';
  const docsPassword = configService.get('DOCS_PASSWORD', { infer: true });

  const basicAuthPaths: string[] = ['/bull-board'];
  if (enableDocs) {
    basicAuthPaths.push('/docs', '/docs-json');
  }

  if (docsPassword) {
    app.use(
      basicAuthPaths,
      basicAuth({
        challenge: true,
        users: {
          [docsUser]: docsPassword,
        },
      }),
    );
  }

  // Swagger Documentation configuration
  if (enableDocs) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API Specification and Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          // i18n-audit-ignore: Swagger OpenAPI authentication parameter description
          description: 'Enter your session or bearer token',
          in: 'header',
        },
        'bearer',
      )
      .addTag('Auth', 'Authentication and session management')
      .addTag('Users', 'User profile and settings')
      .addTag('Health', 'Service health check')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port =
    configService.get('API_PORT', { infer: true }) ||
    configService.get('PORT', { infer: true }) ||
    4000;
  await app.listen(port);
  logger.log(`API server running on: http://localhost:${port}`);
  if (enableDocs) {
    logger.log(`Swagger Docs available at: http://localhost:${port}/docs`);
  }
  logger.log(`Bull Board available at: http://localhost:${port}/bull-board`);
}

bootstrap();

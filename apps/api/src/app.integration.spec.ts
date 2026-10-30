import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { DatabaseService } from './database/database.service';
import { usersRepository } from '@repo/database';

describe('HTTP API End-to-End Integration (Seam 2)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dbService = app.get(DatabaseService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Endpoints', () => {
    it('GET /v1/health returns raw probe status ok without wrapping', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/health')
        .expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        service: 'app-api',
        timestamp: expect.any(String),
      });
    });

    it('GET /v1/health/ready returns 200 with database and redis component checks', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/health/ready')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.checks.database.status).toBe('up');
      expect(res.body.checks.redis.status).toBe('up');
    });
  });

  describe('Authentication & Protected Routes', () => {
    it('GET /v1/users/me without credentials returns 401 with standard error envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me')
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 401,
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('GET /v1/users/me with invalid Bearer token returns 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', 'Bearer invalid-dummy-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });

    it('translates 401 error message according to x-lang header (vi vs en)', async () => {
      const resVi = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('x-lang', 'vi')
        .expect(401);

      const resEn = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('x-lang', 'en')
        .expect(401);

      expect(resVi.body.message).toContain('Phiên đăng nhập');
      expect(resEn.body.message).toContain('Invalid or expired session');
    });
  });

  describe('Admin Bootstrap Endpoint (Seam 2)', () => {
    it('rejects bootstrap request with missing x-admin-bootstrap-token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/admin/bootstrap')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
          name: 'Super Admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(['BOOTSTRAP_DISABLED', 'MISSING_BOOTSTRAP_TOKEN']).toContain(
        res.body.code,
      );
    });

    it('rejects bootstrap request with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/admin/bootstrap')
        .set('x-admin-bootstrap-token', 'wrong-token')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
          name: 'Super Admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Better Auth Route Adapter', () => {
    it('handles /auth/get-session returning null session for unauthenticated visitor', async () => {
      const res = await request(app.getHttpServer()).get('/auth/get-session');

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeNull();
      }
    });
  });

  describe('User End-to-End Flow & Validation Envelopes (Seam 2)', () => {
    const testEmail = `e2e_user_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';
    let sessionToken: string;
    let userId: string;

    it('signs up a new user via Better Auth /auth/sign-up/email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-up/email')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'E2E Tester',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      userId = res.body.user.id;

      // Mark email as verified for direct login
      await usersRepository.update(dbService.db, userId, {
        emailVerified: true,
      });
    });

    it('signs in via /auth/sign-in/email and receives session token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in/email')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(
        res.body.session?.token || res.headers['set-auth-token'],
      ).toBeDefined();
      sessionToken =
        res.body.session?.token || (res.headers['set-auth-token'] as string);
    });

    it('accesses GET /v1/users/me with Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe(testEmail);
      expect(res.body.data.name).toBe('E2E Tester');
    });

    it('rejects PATCH /v1/users/profile with non-whitelisted fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/v1/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Updated Name',
          forbiddenProperty: 'malicious',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toBeDefined();
    });

    it('updates user profile via PATCH /v1/users/profile with whitelisted fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/v1/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          name: 'Verified E2E Tester',
          theme: 'dark',
          locale: 'en',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Verified E2E Tester');
      expect(res.body.data.theme).toBe('dark');
      expect(res.body.data.locale).toBe('en');
    });

    it('retrieves user sessions via GET /v1/users/sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/sessions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('soft deletes user account via DELETE /v1/users/me requiring password verification', async () => {
      // 1. Trying to delete with wrong password fails
      const failRes = await request(app.getHttpServer())
        .delete('/v1/users/me')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ password: 'WrongPassword999!' })
        .expect(400);

      expect(failRes.body.success).toBe(false);

      // 2. Deleting with correct password succeeds
      const successRes = await request(app.getHttpServer())
        .delete('/v1/users/me')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ password: testPassword })
        .expect(200);

      expect(successRes.body.success).toBe(true);

      // 3. User is now soft deleted in database
      const deletedUser = await usersRepository.findById(dbService.db, userId, {
        includeDeleted: true,
      });
      expect(deletedUser?.deletedAt).toBeInstanceOf(Date);

      // 4. Default query excludes soft-deleted user
      const hidden = await usersRepository.findById(dbService.db, userId);
      expect(hidden).toBeNull();
    });
  });
});

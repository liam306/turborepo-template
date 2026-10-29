import { type Page } from '@playwright/test';

export interface IMockUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  theme: string;
  locale: string;
  image: string | null;
  hasPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_MOCK_USER: IMockUser = {
  id: 'usr_playwright_test_1',
  name: 'Playwright Tester',
  email: 'playwright@example.com',
  emailVerified: true,
  role: 'user',
  theme: 'system',
  locale: 'en',
  image: null,
  hasPassword: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function mockLoggedOut(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.route('**/auth/get-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });
}

export async function mockLoggedIn(
  page: Page,
  customUser: Partial<IMockUser> = {},
): Promise<void> {
  const user: IMockUser = { ...DEFAULT_MOCK_USER, ...customUser };
  const sessionData = {
    user,
    session: {
      id: 'ses_mock_123',
      userId: user.id,
      token: 'mock-session-token',
      expiresAt: '2027-12-31T23:59:59.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright',
    },
  };

  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'mock-session-token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.route('**/auth/get-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionData),
    });
  });

  await page.route('**/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...user,
        providers: ['credential'],
      }),
    });
  });

  await page.route('**/users/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...user,
        providers: ['credential'],
      }),
    });
  });

  await page.route('**/users/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ses_mock_123',
          userId: user.id,
          token: 'mock-session-token',
          expiresAt: '2027-12-31T23:59:59.000Z',
          ipAddress: '127.0.0.1',
          userAgent: 'Playwright Chrome',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          isCurrent: true,
        },
      ]),
    });
  });
}

export async function mockSignInSuccess(
  page: Page,
  customUser: Partial<IMockUser> = {},
): Promise<void> {
  const user: IMockUser = { ...DEFAULT_MOCK_USER, ...customUser };
  await page.route('**/auth/sign-in/email', async (route) => {
    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie':
          'better-auth.session_token=mock-session-token; Path=/; HttpOnly; SameSite=Lax',
      },
      body: JSON.stringify({
        user,
        session: { token: 'mock-session-token' },
      }),
    });
  });
}

export async function mockSignInFailure(
  page: Page,
  status: number,
  message: string,
  code?: string,
): Promise<void> {
  await page.route('**/auth/sign-in/email', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status, message, code }),
    });
  });
}

export async function mockSignUpSuccess(page: Page): Promise<void> {
  await page.route('**/auth/sign-up/email', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { ...DEFAULT_MOCK_USER, emailVerified: false },
      }),
    });
  });
}

export async function mockVerifyOtpSuccess(page: Page): Promise<void> {
  await page.route('**/auth/email-otp/verify-email', async (route) => {
    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: true }),
    });
  });
}

export async function mockForgotPasswordSuccess(page: Page): Promise<void> {
  await page.route(
    '**/auth/email-otp/request-password-reset',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    },
  );
}

export async function mockResetPasswordSuccess(page: Page): Promise<void> {
  await page.route('**/auth/email-otp/reset-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

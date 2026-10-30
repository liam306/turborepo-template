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

export interface IMockSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
  deviceType?: string;
  browser?: string;
  os?: string;
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

export const DEFAULT_MOCK_SESSIONS: IMockSession[] = [
  {
    id: 'ses_mock_current',
    userId: 'usr_playwright_test_1',
    token: 'mock-session-token',
    expiresAt: '2027-12-31T23:59:59.000Z',
    ipAddress: '127.0.0.1',
    userAgent: 'Playwright Chrome',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isCurrent: true,
    deviceType: 'Desktop',
    browser: 'Chrome',
    os: 'Linux',
  },
  {
    id: 'ses_mock_mobile',
    userId: 'usr_playwright_test_1',
    token: 'mock-mobile-token',
    expiresAt: '2027-12-31T23:59:59.000Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mobile Safari',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    isCurrent: false,
    deviceType: 'Mobile',
    browser: 'Safari',
    os: 'iOS',
  },
  {
    id: 'ses_mock_firefox',
    userId: 'usr_playwright_test_1',
    token: 'mock-firefox-token',
    expiresAt: '2027-12-31T23:59:59.000Z',
    ipAddress: '10.0.0.5',
    userAgent: 'Firefox Mac',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    isCurrent: false,
    deviceType: 'Desktop',
    browser: 'Firefox',
    os: 'macOS',
  },
];

interface MockAuthState {
  user: IMockUser | null;
  sessionToken: string | null;
  sessions: IMockSession[];
  routesInstalled?: boolean;
}

const stateMap = new WeakMap<Page, MockAuthState>();

function getOrCreateState(page: Page): MockAuthState {
  let state = stateMap.get(page);
  if (!state) {
    state = {
      user: null,
      sessionToken: null,
      sessions: [...DEFAULT_MOCK_SESSIONS],
      routesInstalled: false,
    };
    stateMap.set(page, state);
  }
  return state;
}

export async function ensureMockRoutes(page: Page): Promise<MockAuthState> {
  const state = getOrCreateState(page);
  if (state.routesInstalled) return state;
  state.routesInstalled = true;

  // Better Auth: get-session
  await page.route('**/auth/get-session', async (route) => {
    if (state.user && state.sessionToken) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: state.user,
          session: {
            id: 'ses_mock_current',
            userId: state.user.id,
            token: state.sessionToken,
            expiresAt: '2027-12-31T23:59:59.000Z',
            ipAddress: '127.0.0.1',
            userAgent: 'Playwright',
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      });
    }
  });

  // Better Auth: sign-out
  await page.route('**/auth/sign-out', async (route) => {
    state.user = null;
    state.sessionToken = null;
    await page.context().clearCookies();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // API: users/me
  await page.route('**/users/me', async (route) => {
    if (state.user && state.sessionToken) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...state.user,
            providers: ['credential'],
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });
    }
  });

  // API: users/profile
  await page.route('**/users/profile', async (route) => {
    if (!state.user || !state.sessionToken) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });
      return;
    }

    if (route.request().method() === 'PATCH') {
      try {
        const body = route.request().postDataJSON();
        if (body.name) state.user.name = body.name;
        if (body.theme) state.user.theme = body.theme;
        if (body.locale) state.user.locale = body.locale;
      } catch {
        // ignore
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...state.user,
          providers: ['credential'],
        },
      }),
    });
  });

  // API: users/sessions
  await page.route('**/users/sessions', async (route) => {
    if (!state.user || !state.sessionToken) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: state.sessions,
      }),
    });
  });

  // API: users/sessions/other
  await page.route('**/users/sessions/other', async (route) => {
    if (route.request().method() === 'DELETE') {
      state.sessions = state.sessions.filter((s) => s.isCurrent);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Other sessions revoked',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // API: users/sessions/:id
  await page.route(/.*\/users\/sessions\/ses_mock_.+/, async (route) => {
    if (route.request().method() === 'DELETE') {
      const url = route.request().url();
      const idMatch = url.match(/ses_mock_[a-zA-Z0-9_-]+/);
      const targetId = idMatch ? idMatch[0] : null;
      if (targetId) {
        state.sessions = state.sessions.filter((s) => s.id !== targetId);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Session revoked successfully',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // API: users/avatar
  await page.route('**/users/avatar', async (route) => {
    if (state.user) {
      state.user.image = 'https://example.com/avatar.webp';
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { image: 'https://example.com/avatar.webp' },
        message: 'Avatar uploaded successfully',
      }),
    });
  });

  // API: users/change-password
  await page.route('**/users/change-password', async (route) => {
    const postData = route.request().postDataJSON?.() || {};
    if (postData.currentPassword === 'wrongpassword') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: 'Current password is incorrect',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Password changed successfully',
      }),
    });
  });

  // API: users/account
  await page.route('**/users/account', async (route) => {
    state.user = null;
    state.sessionToken = null;
    await page.context().clearCookies();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
    });
  });

  return state;
}

export async function mockLoggedOut(page: Page): Promise<void> {
  const state = await ensureMockRoutes(page);
  state.user = null;
  state.sessionToken = null;
  state.sessions = [...DEFAULT_MOCK_SESSIONS];
  await page.context().clearCookies();
}

export async function mockLoggedIn(
  page: Page,
  customUser: Partial<IMockUser> = {},
  customSessions?: IMockSession[],
): Promise<void> {
  const state = await ensureMockRoutes(page);
  state.user = { ...DEFAULT_MOCK_USER, ...customUser };
  state.sessionToken = 'mock-session-token';
  state.sessions = customSessions || [...DEFAULT_MOCK_SESSIONS];

  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'mock-session-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

export async function mockSignInSuccess(
  page: Page,
  customUser: Partial<IMockUser> = {},
): Promise<void> {
  const state = await ensureMockRoutes(page);
  const user: IMockUser = { ...DEFAULT_MOCK_USER, ...customUser };

  await page.route('**/auth/sign-in/email', async (route) => {
    state.user = user;
    state.sessionToken = 'mock-session-token';
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
  await ensureMockRoutes(page);
  await page.route('**/auth/sign-in/email', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status, message, code }),
    });
  });
}

export async function mockSignUpSuccess(page: Page): Promise<void> {
  await ensureMockRoutes(page);
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

export async function mockSignUpFailure(
  page: Page,
  status: number,
  message: string,
): Promise<void> {
  await ensureMockRoutes(page);
  await page.route('**/auth/sign-up/email', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status, message }),
    });
  });
}

export async function mockVerifyOtpSuccess(
  page: Page,
  customUser: Partial<IMockUser> = {},
): Promise<void> {
  const state = await ensureMockRoutes(page);
  const user: IMockUser = {
    ...DEFAULT_MOCK_USER,
    ...customUser,
    emailVerified: true,
  };

  await page.route('**/auth/email-otp/verify-email', async (route) => {
    state.user = user;
    state.sessionToken = 'mock-session-token';
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

export async function mockVerifyOtpFailure(
  page: Page,
  status: number,
  message: string,
): Promise<void> {
  await ensureMockRoutes(page);
  await page.route('**/auth/email-otp/verify-email', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status, message }),
    });
  });
}

export async function mockForgotPasswordSuccess(page: Page): Promise<void> {
  await ensureMockRoutes(page);
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

export async function mockForgotPasswordFailure(
  page: Page,
  status: number,
  message: string,
): Promise<void> {
  await ensureMockRoutes(page);
  await page.route(
    '**/auth/email-otp/request-password-reset',
    async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ status, message }),
      });
    },
  );
}

export async function mockResetPasswordSuccess(page: Page): Promise<void> {
  await ensureMockRoutes(page);
  await page.route('**/auth/email-otp/reset-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

export async function mockResetPasswordFailure(
  page: Page,
  status: number,
  message: string,
): Promise<void> {
  await ensureMockRoutes(page);
  await page.route('**/auth/email-otp/reset-password', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status, message }),
    });
  });
}

export async function mockExpireSession(page: Page): Promise<void> {
  const state = await ensureMockRoutes(page);
  state.user = null;
  state.sessionToken = null;
  await page.context().clearCookies();
}

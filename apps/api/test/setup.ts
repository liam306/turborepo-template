jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    api: {
      getSession: jest.fn(),
    },
  })),
}));
jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(),
}));
jest.mock('better-auth/plugins', () => ({
  bearer: jest.fn(),
  emailOTP: jest.fn(),
}));
jest.mock('@better-auth/expo', () => ({ expo: jest.fn() }));

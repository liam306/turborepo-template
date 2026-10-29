import { test, expect } from '@playwright/test';
import {
  mockLoggedOut,
  mockForgotPasswordSuccess,
  mockResetPasswordSuccess,
} from './fixtures/mock-auth';

test.describe('Auth - Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/forgot-password');
  });

  test('validates required and invalid email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.getByRole('button', {
      name: /Send Verification Code|Gửi mã xác thực/i,
    });

    // Empty email submit button is disabled by default
    await expect(submitBtn).toBeDisabled();

    // Invalid email validation
    await emailInput.fill('not-an-email');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(
      page.getByText(/Please enter a valid email|Email không hợp lệ/i),
    ).toBeVisible();
  });

  test('requests OTP and proceeds to reset form', async ({ page }) => {
    await mockForgotPasswordSuccess(page);
    await mockResetPasswordSuccess(page);

    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.getByRole('button', {
      name: /Send Verification Code|Gửi mã xác thực/i,
    });

    await emailInput.fill('user@example.com');
    await submitBtn.click();

    // Verify transition to Step 2 (Reset password fields)
    await expect(
      page.getByText(/Enter Verification Code|Nhập mã xác thực/i),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Enter 6-digit OTP into OTP input
    const otpInput = page.locator(
      'input[autocomplete="one-time-code"], input[data-input-otp]',
    );
    if (await otpInput.count()) {
      await otpInput.fill('123456');
    }

    // Enter matching new passwords
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('NewSecurePassword123');
    await passwordInputs.nth(1).fill('NewSecurePassword123');

    const updateBtn = page.getByRole('button', {
      name: /Update Password|Cập nhật mật khẩu/i,
    });
    await updateBtn.click();

    // Verify success banner and redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('redirects from /reset-password to /forgot-password', async ({
    page,
  }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

import { test, expect } from '@playwright/test';
import {
  mockLoggedOut,
  mockForgotPasswordSuccess,
  mockForgotPasswordFailure,
  mockResetPasswordSuccess,
  mockResetPasswordFailure,
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

  test('displays error message when request OTP fails', async ({ page }) => {
    await mockForgotPasswordFailure(page, 404, 'User not found');

    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.getByRole('button', {
      name: /Send Verification Code|Gửi mã xác thực/i,
    });

    await emailInput.fill('unknown@example.com');
    await submitBtn.click();

    await expect(page.getByText(/User not found|error/i)).toBeVisible();
  });

  test('requests OTP, validates password matching, rejects invalid OTP, then successfully resets password', async ({
    page,
  }) => {
    await mockForgotPasswordSuccess(page);
    await mockResetPasswordFailure(page, 400, 'Invalid or expired OTP');

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

    // Fill OTP unconditionally
    const otpInput = page.locator('input[autocomplete="one-time-code"]');
    await expect(otpInput).toBeAttached();
    await otpInput.fill('000000');

    // Fill passwords that do not match to test validation
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('NewSecurePassword123');
    await passwordInputs.nth(1).fill('MismatchPassword123');

    const updateBtn = page.getByRole('button', {
      name: /Update Password|Cập nhật mật khẩu/i,
    });
    await updateBtn.click();

    await expect(
      page.getByText(/Passwords do not match|Mật khẩu xác nhận không khớp/i),
    ).toBeVisible();

    // Fix matching password but with failing OTP
    await passwordInputs.nth(1).fill('NewSecurePassword123');
    await updateBtn.click();

    await expect(page.getByText(/Invalid or expired OTP|error/i)).toBeVisible();

    // Now mock reset success and submit with valid OTP
    await mockResetPasswordSuccess(page);
    await otpInput.fill('123456');
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

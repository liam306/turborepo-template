import { test, expect } from '@playwright/test';
import {
  mockLoggedOut,
  mockSignUpSuccess,
  mockVerifyOtpSuccess,
} from './fixtures/mock-auth';

test.describe('Auth - Sign Up & OTP Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/login');

    // Switch to sign up mode
    const signUpSwitch = page.getByRole('button', {
      name: /Sign Up Free|Đăng ký miễn phí/i,
    });
    await signUpSwitch.click();
  });

  test('validates required fields for signup', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });
    await submitBtn.click();

    await expect(
      page.getByText(/Please enter your name|Vui lòng nhập tên/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Please enter your email|Vui lòng nhập email/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Please enter your password|Vui lòng nhập mật khẩu/i),
    ).toBeVisible();
  });

  test('validates password minimum length of 8 characters', async ({
    page,
  }) => {
    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });

    await nameInput.fill('Test User');
    await emailInput.fill('user@example.com');
    await passwordInput.fill('12345');
    await submitBtn.click();

    await expect(
      page.getByText(
        /Password must be at least 8 characters|Mật khẩu phải có ít nhất 8 ký tự/i,
      ),
    ).toBeVisible();
  });

  test('submits signup and completes OTP verification', async ({ page }) => {
    await mockSignUpSuccess(page);
    await mockVerifyOtpSuccess(page);

    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });

    await nameInput.fill('Test User');
    await emailInput.fill('newuser@example.com');
    await passwordInput.fill('StrongPassword123');
    await submitBtn.click();

    // Verify OTP Dialog pops up
    const otpDialog = page.getByRole('dialog');
    await expect(otpDialog).toBeVisible();
    await expect(
      page.getByText(/Enter Verification Code|Nhập mã xác thực/i),
    ).toBeVisible();

    // Type 6 digits OTP
    const otpInput = page.locator('input[placeholder="••••••"]');
    await otpInput.fill('123456');

    // Click verify code button
    const verifyBtn = page.getByRole('button', {
      name: /Verify Code|Xác thực mã/i,
    });
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.click();

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

import { test, expect } from '@playwright/test';
import {
  mockLoggedOut,
  mockSignUpSuccess,
  mockSignUpFailure,
  mockVerifyOtpSuccess,
  mockVerifyOtpFailure,
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

  test('displays error message when signup API fails', async ({ page }) => {
    await mockSignUpFailure(page, 400, 'User already exists');

    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });

    await nameInput.fill('Test User');
    await emailInput.fill('existing@example.com');
    await passwordInput.fill('StrongPassword123');
    await submitBtn.click();

    await expect(
      page.getByText(
        /User with this email already exists|User already exists|Tài khoản với email này đã tồn tại|error/i,
      ),
    ).toBeVisible();
  });

  test('submits signup, handles OTP failure, then verifies successfully and persists session', async ({
    page,
  }) => {
    await mockSignUpSuccess(page);
    await mockVerifyOtpFailure(page, 400, 'Invalid OTP code');

    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });

    await nameInput.fill('New User');
    await emailInput.fill('newuser@example.com');
    await passwordInput.fill('StrongPassword123');
    await submitBtn.click();

    // Verify OTP Dialog pops up
    const otpDialog = page.getByRole('dialog');
    await expect(otpDialog).toBeVisible();
    await expect(
      page.getByText(/Enter Verification Code|Nhập mã xác thực/i),
    ).toBeVisible();

    // Type incorrect 6 digits OTP first
    const otpInput = page.locator('input[placeholder="••••••"]');
    await otpInput.fill('000000');

    const verifyBtn = page.getByRole('button', {
      name: /Verify Code|Xác thực mã/i,
    });
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.click();

    // Verify error appears
    await expect(
      page.getByText(
        /Invalid or expired code|Invalid OTP code|Mã xác minh không hợp lệ|error/i,
      ),
    ).toBeVisible();

    // Now mock OTP success and enter valid OTP
    await mockVerifyOtpSuccess(page, {
      name: 'New User',
      email: 'newuser@example.com',
    });
    await otpInput.fill('123456');
    await verifyBtn.click();

    // Must navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { level: 1, name: /New User|User/i }),
    ).toBeVisible();

    // Session persists after page reload
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { level: 1, name: /New User|User/i }),
    ).toBeVisible();
  });
});

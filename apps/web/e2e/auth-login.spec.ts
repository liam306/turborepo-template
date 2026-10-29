import { test, expect } from '@playwright/test';
import {
  mockLoggedOut,
  mockSignInSuccess,
  mockSignInFailure,
} from './fixtures/mock-auth';

test.describe('Auth - Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/login');
  });

  test('validates required fields on empty submit', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Sign In|Đăng nhập/i });
    await submitBtn.click();

    // Check validation error messages
    await expect(
      page.getByText(/Please enter your email|Vui lòng nhập email/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Please enter your password|Vui lòng nhập mật khẩu/i),
    ).toBeVisible();
  });

  test('validates invalid email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign In|Đăng nhập/i });

    await emailInput.fill('invalid-email-string');
    await passwordInput.fill('password123');
    await submitBtn.click();

    await expect(
      page.getByText(/Please enter a valid email|Email không hợp lệ/i),
    ).toBeVisible();
  });

  test('shows error message on invalid credentials', async ({ page }) => {
    await mockSignInFailure(page, 401, 'Invalid email or password');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign In|Đăng nhập/i });

    await emailInput.fill('user@example.com');
    await passwordInput.fill('wrongpassword');
    await submitBtn.click();

    await expect(
      page.getByText(
        /Invalid email or password|Email hoặc mật khẩu không chính xác|error/i,
      ),
    ).toBeVisible();
  });

  test('redirects to dashboard upon successful sign in', async ({ page }) => {
    await mockSignInSuccess(page, {
      name: 'Logged In User',
      email: 'user@example.com',
    });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign In|Đăng nhập/i });

    await emailInput.fill('user@example.com');
    await passwordInput.fill('correctpassword123');
    await submitBtn.click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('switches to sign up view and back', async ({ page }) => {
    const switchBtn = page.getByRole('button', {
      name: /Sign Up Free|Đăng ký miễn phí/i,
    });
    await switchBtn.click();

    // In signup view, Name field appears
    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    await expect(nameInput).toBeVisible();

    // Switch back to sign in
    const signInBtn = page.getByRole('button', {
      name: /Sign In Now|Đăng nhập ngay/i,
    });
    await signInBtn.click();

    await expect(nameInput).not.toBeVisible();
  });
});

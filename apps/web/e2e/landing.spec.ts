import { test, expect } from '@playwright/test';
import { mockLoggedOut, mockLoggedIn } from './fixtures/mock-auth';

test.describe('Landing Page', () => {
  test('renders hero section and navigates to login', async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/');

    // Check Hero and CTA visibility
    await expect(page.locator('h1')).toBeVisible();
    const startBtn = page
      .locator('main')
      .getByRole('link', { name: /Get Started|Bắt đầu ngay/i });
    await expect(startBtn).toBeVisible();

    await startBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('switches language between English and Vietnamese', async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/');

    // Click language switcher
    const langBtn = page.getByLabel(/Select language|Chọn ngôn ngữ/i);
    await langBtn.click();

    // Select Tiếng Việt
    const viOption = page.getByRole('menuitem', { name: /Tiếng Việt/i });
    await viOption.click();

    // Verify Vietnamese text rendered in hero or header
    await expect(
      page.getByRole('link', { name: /Đăng nhập/i }).first(),
    ).toBeVisible();

    // Reload and ensure locale is persisted in cookie
    await page.reload();
    await expect(
      page.getByRole('link', { name: /Đăng nhập/i }).first(),
    ).toBeVisible();
  });

  test('toggles theme between light and dark', async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/');

    // Click theme switcher
    const themeBtn = page.getByRole('button', { name: /Theme|Giao diện/i });
    await themeBtn.click();

    // Select Dark mode
    const darkOption = page.getByRole('menuitem', { name: /Dark|Tối/i });
    await darkOption.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch to Light mode
    await themeBtn.click();
    const lightOption = page.getByRole('menuitem', { name: /Light|Sáng/i });
    await lightOption.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('shows dashboard button in header when authenticated', async ({
    page,
  }) => {
    await mockLoggedIn(page);
    await page.goto('/');

    const dashboardLink = page.getByRole('link', {
      name: /Dashboard|Bảng điều khiển/i,
    });
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

import { test, expect } from '@playwright/test';
import { mockLoggedIn } from './fixtures/mock-auth';

test.describe('Profile & Account Settings Modal', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    await mockLoggedIn(page, {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
    });
    await page.goto('/dashboard');

    if (isMobile) {
      // Open mobile drawer first to access user menu
      const menuBtn = page.locator('header button').first();
      await menuBtn.click();
    }
  });

  test('opens profile modal from sidebar user menu', async ({ page }) => {
    // Click user menu button in sidebar
    const userBtn = page.getByRole('button', {
      name: /Sarah Connor|sarah@example\.com/i,
    });
    await userBtn.click();

    // Click Account Settings in menu
    const settingsItem = page.getByRole('menuitem', {
      name: /Account Settings|Cài đặt tài khoản/i,
    });
    await settingsItem.click();

    // Verify dialog is open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: /Profile Settings|Cài đặt hồ sơ/i }),
    ).toBeVisible();
  });

  test('navigates through tabs inside profile modal', async ({ page }) => {
    // Open profile modal
    const userBtn = page.getByRole('button', {
      name: /Sarah Connor|sarah@example\.com/i,
    });
    await userBtn.click();
    const settingsItem = page.getByRole('menuitem', {
      name: /Account Settings|Cài đặt tài khoản/i,
    });
    await settingsItem.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // 1. Profile tab (default active)
    await expect(modal.locator('#profile-email')).toHaveValue(
      'sarah@example.com',
    );

    // 2. Security tab
    const securityTab = modal.getByRole('tab', { name: /Security|Bảo mật/i });
    await securityTab.click();
    await expect(
      modal.getByText(/Current Password|Mật khẩu hiện tại/i).first(),
    ).toBeVisible();

    // 3. Sessions tab
    const sessionsTab = modal.getByRole('tab', {
      name: /Active Sessions|Phiên hoạt động/i,
    });
    await sessionsTab.click();
    await expect(
      modal.getByText(/Active Sessions|Phiên hoạt động/i).first(),
    ).toBeVisible();

    // 4. Danger tab
    const dangerTab = modal.getByRole('tab', {
      name: /Danger Zone|Vùng nguy hiểm/i,
    });
    await dangerTab.click();
    await expect(
      modal.getByRole('button', {
        name: /Deactivate Account|Vô hiệu hóa tài khoản/i,
      }),
    ).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { mockLoggedIn } from './fixtures/mock-auth';

test.describe('Profile & Account Settings Modal', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    await mockLoggedIn(page, {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      hasPassword: true,
    });
    await page.goto('/dashboard');

    if (isMobile) {
      // Open mobile drawer first to access user menu
      const menuBtn = page.locator('header button').first();
      await menuBtn.click();
    }
  });

  async function openProfileModal(page: any) {
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
    return modal;
  }

  test('opens profile modal from sidebar user menu', async ({ page }) => {
    const modal = await openProfileModal(page);
    await expect(
      modal.getByRole('heading', { name: /Profile Settings|Cài đặt hồ sơ/i }),
    ).toBeVisible();
  });

  test('navigates through tabs inside profile modal', async ({ page }) => {
    const modal = await openProfileModal(page);

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

  test('updates profile name and displays success feedback', async ({
    page,
  }) => {
    const modal = await openProfileModal(page);
    const nameInput = modal.locator('#profile-name');
    await nameInput.clear();
    await nameInput.fill('Sarah Connor Updated');

    const saveBtn = modal.getByRole('button', {
      name: /Save Changes|Lưu thay đổi/i,
    });
    await saveBtn.click();

    await expect(
      modal.getByText(
        /Profile updated successfully|Name updated successfully|Cập nhật hồ sơ thành công|Cập nhật tên thành công/i,
      ),
    ).toBeVisible();
  });

  test('validates password mismatch and handles password change error & success', async ({
    page,
  }) => {
    const modal = await openProfileModal(page);
    const securityTab = modal.getByRole('tab', { name: /Security|Bảo mật/i });
    await securityTab.click();

    const currentPwdInput = modal.locator('#curr-pwd');
    const newPwdInput = modal.locator('#new-pwd');
    const confPwdInput = modal.locator('#conf-pwd');
    const submitBtn = modal.getByRole('button', {
      name: /Update Password|Cập nhật mật khẩu/i,
    });

    // 1. Password mismatch validation
    await currentPwdInput.fill('currentpassword123');
    await newPwdInput.fill('newpassword123');
    await confPwdInput.fill('mismatch123');
    await submitBtn.click();

    await expect(
      modal.getByText(/Passwords do not match|Mật khẩu xác nhận không khớp/i),
    ).toBeVisible();

    // 2. Incorrect current password error from API
    await currentPwdInput.fill('wrongpassword');
    await confPwdInput.fill('newpassword123');
    await submitBtn.click();

    await expect(
      modal.getByText(/Current password is incorrect|error/i),
    ).toBeVisible();

    // 3. Successful password change
    await currentPwdInput.fill('correctpassword123');
    await submitBtn.click();

    await expect(
      modal.getByText(/Password changed successfully|Đổi mật khẩu thành công/i),
    ).toBeVisible();
  });

  test('searches sessions with debounce and revokes sessions', async ({
    page,
  }) => {
    const modal = await openProfileModal(page);
    const sessionsTab = modal.getByRole('tab', {
      name: /Active Sessions|Phiên hoạt động/i,
    });
    await sessionsTab.click();

    // Verify all 3 sessions rendered initially
    const currentSession = modal.getByText(/Chrome.*Linux|Playwright Chrome/i);
    const safariSession = modal.getByText(/Safari.*iOS|Mobile Safari/i);
    const firefoxSession = modal.getByText(/Firefox.*macOS|Firefox Mac/i);

    await expect(currentSession).toBeVisible();
    await safariSession.scrollIntoViewIfNeeded();
    await expect(safariSession).toBeVisible();
    await firefoxSession.scrollIntoViewIfNeeded();
    await expect(firefoxSession).toBeVisible();

    // Search with debounce: type "Firefox"
    const searchInput = modal.locator(
      'input[placeholder*="Search"], input[placeholder*="Tìm kiếm"]',
    );
    await searchInput.fill('Firefox');
    // Wait debounce time
    await page.waitForTimeout(400);

    // Only Firefox Mac remains visible
    await expect(modal.getByText(/Firefox.*macOS|Firefox Mac/i)).toBeVisible();
    await expect(
      modal.getByText(/Safari.*iOS|Mobile Safari/i),
    ).not.toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(400);
    await expect(modal.getByText(/Safari.*iOS|Mobile Safari/i)).toBeVisible();

    // Revoke single session (Mobile Safari)
    const safariCard = modal
      .locator('div.rounded-xl')
      .filter({ hasText: /Safari/i });
    const revokeMobileBtn = safariCard.getByRole('button', {
      name: /^Sign out$|^Đăng xuất$/i,
    });
    await revokeMobileBtn.click();

    // Confirm dialog appears
    const confirmAlert = page.getByRole('alertdialog');
    await expect(confirmAlert).toBeVisible();
    const confirmBtn = confirmAlert.getByRole('button', {
      name: /^Sign out$|^Đăng xuất$|Confirm|Xác nhận/i,
    });
    await confirmBtn.click();

    // Mobile Safari revoked
    await expect(
      modal.getByText(/Safari.*iOS|Mobile Safari/i),
    ).not.toBeVisible();

    // Revoke all other sessions
    const revokeOthersBtn = modal.getByRole('button', {
      name: /Sign out of all other devices|Đăng xuất khỏi tất cả thiết bị khác/i,
    });
    await revokeOthersBtn.click();

    const confirmOthersAlert = page.getByRole('alertdialog');
    await expect(confirmOthersAlert).toBeVisible();
    await confirmOthersAlert
      .getByRole('button', {
        name: /Sign out of all other devices|Đăng xuất khỏi tất cả thiết bị khác|Confirm|Xác nhận/i,
      })
      .click();

    // Now only current session remains
    await expect(
      modal.getByText(/Firefox.*macOS|Firefox Mac/i),
    ).not.toBeVisible();
    await expect(
      modal.getByText(/Chrome.*Linux|Playwright Chrome/i),
    ).toBeVisible();
  });

  test('deactivates account via Danger Zone and redirects to login', async ({
    page,
  }) => {
    // Handle window.prompt with password
    page.on('dialog', async (dialog) => {
      await dialog.accept('correctpassword123');
    });

    const modal = await openProfileModal(page);
    const dangerTab = modal.getByRole('tab', {
      name: /Danger Zone|Vùng nguy hiểm/i,
    });
    await dangerTab.click();

    const deactivateBtn = modal.getByRole('button', {
      name: /Deactivate Account|Vô hiệu hóa tài khoản/i,
    });
    await deactivateBtn.click();

    // Confirm dialog
    const confirmAlert = page.getByRole('alertdialog');
    await expect(confirmAlert).toBeVisible();
    await confirmAlert
      .getByRole('button', {
        name: /Delete|Deactivate|Vô hiệu hóa|Confirm|Xác nhận|Xóa/i,
      })
      .click();

    // Must redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Visiting /dashboard again redirects to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });

  test('logs out user via Sidebar user menu and redirects to login', async ({
    page,
  }) => {
    const userBtn = page.getByRole('button', {
      name: /Sarah Connor|sarah@example\.com/i,
    });
    await userBtn.click();

    const logoutItem = page.getByRole('menuitem', {
      name: /Sign Out|Log out|Đăng xuất/i,
    });
    await logoutItem.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Subsequent access to /dashboard is blocked
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });
});

import { test, expect } from '@playwright/test';

const isRealBackendEnabled = process.env.E2E_REAL_BACKEND === 'true';

test.describe('Real-Backend Full E2E Journey', () => {
  test.beforeEach(async () => {
    test.skip(
      !isRealBackendEnabled,
      'Real-backend E2E requires running API, DB, and Mailpit with E2E_REAL_BACKEND=true',
    );
  });

  test('complete authentication and profile lifecycle against live backend', async ({
    page,
    request,
  }) => {
    const timestamp = Date.now();
    const uniqueEmail = `e2e_real_${timestamp}@example.com`;
    const initialPassword = 'InitialSecurePassword123!';
    const updatedPassword = 'UpdatedSecurePassword123!';
    const userName = `Real Tester ${timestamp}`;

    // 1. Visit signup page
    await page.goto('/login');
    const signUpSwitch = page.getByRole('button', {
      name: /Sign Up Free|Đăng ký miễn phí/i,
    });
    await signUpSwitch.click();

    // 2. Submit signup form
    const nameInput = page.getByPlaceholder(/John Doe|Nguyễn Văn A/i);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign Up|Đăng ký/i });

    await nameInput.fill(userName);
    await emailInput.fill(uniqueEmail);
    await passwordInput.fill(initialPassword);
    await submitBtn.click();

    // 3. Verify OTP dialog appears
    const otpDialog = page.getByRole('dialog');
    await expect(otpDialog).toBeVisible({ timeout: 10000 });

    // 4. Retrieve OTP from Mailpit
    let otpCode = '';
    const mailpitUrl = process.env.MAILPIT_API_URL || 'http://localhost:8025';
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.waitForTimeout(1000);
      try {
        const mailRes = await request.get(`${mailpitUrl}/api/v2/messages`);
        if (mailRes.ok()) {
          const data = await mailRes.json();
          const messages = data.messages || [];
          const userMail = messages.find((m: any) =>
            m.To?.some((to: any) => to.Address === uniqueEmail),
          );
          if (userMail) {
            const detailRes = await request.get(
              `${mailpitUrl}/api/v2/message/${userMail.ID}`,
            );
            if (detailRes.ok()) {
              const detail = await detailRes.json();
              const match = (detail.Text || detail.Snippet || '').match(
                /\b(\d{6})\b/,
              );
              if (match?.[1]) {
                otpCode = match[1];
                break;
              }
            }
          }
        }
      } catch {
        // Mailpit polling retry
      }
    }

    if (!otpCode) {
      test.skip(true, 'Could not retrieve verification OTP from Mailpit');
      return;
    }

    // 5. Submit valid OTP
    const otpInput = page.locator('input[placeholder="••••••"]');
    await otpInput.fill(otpCode);
    const verifyBtn = page.getByRole('button', {
      name: /Verify Code|Xác thực mã/i,
    });
    await verifyBtn.click();

    // 6. Should navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(userName, 'i') }),
    ).toBeVisible();

    // 7. Verify session persists across full reload
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(userName, 'i') }),
    ).toBeVisible();

    // 8. Open Profile Modal and update name
    const userMenuBtn = page.getByRole('button', {
      name: new RegExp(userName, 'i'),
    });
    await userMenuBtn.click();
    const settingsItem = page.getByRole('menuitem', {
      name: /Account Settings|Cài đặt tài khoản/i,
    });
    await settingsItem.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const profileNameInput = modal.locator('#profile-name');
    const updatedName = `${userName} Edited`;
    await profileNameInput.clear();
    await profileNameInput.fill(updatedName);

    const saveChangesBtn = modal.getByRole('button', {
      name: /Save Changes|Lưu thay đổi/i,
    });
    await saveChangesBtn.click();
    await expect(
      modal.getByText(
        /Profile updated successfully|Cập nhật hồ sơ thành công/i,
      ),
    ).toBeVisible({ timeout: 10000 });

    // 9. Change password in Security tab
    const securityTab = modal.getByRole('tab', { name: /Security|Bảo mật/i });
    await securityTab.click();

    await modal.locator('#curr-pwd').fill(initialPassword);
    await modal.locator('#new-pwd').fill(updatedPassword);
    await modal.locator('#conf-pwd').fill(updatedPassword);

    const updatePwdBtn = modal.getByRole('button', {
      name: /Update Password|Cập nhật mật khẩu/i,
    });
    await updatePwdBtn.click();
    await expect(
      modal.getByText(/Password changed successfully|Đổi mật khẩu thành công/i),
    ).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.keyboard.press('Escape');

    // 10. Logout
    await userMenuBtn.click();
    const logoutItem = page.getByRole('menuitem', {
      name: /Log out|Đăng xuất/i,
    });
    await logoutItem.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 11. Login with old password must fail
    await emailInput.fill(uniqueEmail);
    await passwordInput.fill(initialPassword);
    await page.getByRole('button', { name: /Sign In|Đăng nhập/i }).click();
    await expect(
      page.getByText(
        /Invalid email or password|Email hoặc mật khẩu không chính xác|error/i,
      ),
    ).toBeVisible();

    // 12. Login with updated password must succeed
    await passwordInput.fill(updatedPassword);
    await page.getByRole('button', { name: /Sign In|Đăng nhập/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

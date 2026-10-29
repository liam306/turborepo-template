import { test, expect } from '@playwright/test';
import { mockLoggedOut, mockLoggedIn } from './fixtures/mock-auth';

test.describe('Dashboard & Navigation', () => {
  test('redirects unauthenticated visitor to login', async ({ page }) => {
    await mockLoggedOut(page);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });

  test('renders authenticated dashboard with cards and welcome message', async ({
    page,
  }) => {
    await mockLoggedIn(page, { name: 'Alex Johnson' });
    await page.goto('/dashboard');

    // Welcome title displays user name
    await expect(page.locator('h1')).toContainText('Alex Johnson');

    // Check metric cards
    await expect(
      page.getByText(/System operational status|Trạng thái hệ thống/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Current authentication state|Trạng thái xác thực/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Latency and uptime|Độ trễ và thời gian hoạt động/i),
    ).toBeVisible();
  });

  test('toggles sidebar collapse state on desktop', async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      'Desktop sidebar toggle only relevant on non-mobile viewports',
    );

    await mockLoggedIn(page);
    await page.goto('/dashboard');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/w-72/);

    // Toggle collapse button
    const collapseBtn = sidebar.locator('div.border-t button').first();
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-20/);

    // Expand again
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-72/);
  });

  test('opens and closes mobile sidebar drawer', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile drawer test only applies to mobile viewports');

    await mockLoggedIn(page);
    await page.goto('/dashboard');

    // On mobile, find hamburger button in header
    const menuBtn = page.locator('header button').first();
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Drawer becomes visible
    const mobileDrawer = page.locator('div.fixed.z-50');
    await expect(mobileDrawer).toHaveClass(/translate-x-0/);

    // Click backdrop to close
    const backdrop = page.locator('div.fixed.z-40');
    await backdrop.click({ force: true });
    await expect(mobileDrawer).toHaveClass(/-translate-x-full/);
  });
});

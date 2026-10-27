import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('E2E: Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, context }) => {
    // Đảm bảo môi trường sạch sẽ, không lưu vết phiên từ test trước
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Mặc định chưa đăng nhập thì /api/auth/me trả 401
    await page.route(/\/api\/auth\/me/i, async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-AUTH-01: Màn hình Đăng nhập hiển thị đúng cấu trúc và nhãn', async ({ page }) => {
    await expect(page.locator('h1:has-text("Chào mừng")')).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('TC-AUTH-02: Hiển thị lỗi hoặc yêu cầu nhập khi để trống các trường bắt buộc', async ({
    page,
  }) => {
    // Thử click Đăng nhập khi chưa điền thông tin
    await loginPage.submitButton.click();

    // HTML5 validation: input email sẽ có trạng thái invalid
    const isEmailValid = await loginPage.emailInput.evaluate((el: HTMLInputElement) =>
      el.checkValidity(),
    );
    expect(isEmailValid).toBe(false);
  });

  test('TC-AUTH-03: Đăng nhập thành công với tài khoản demo Writer chuyển hướng vào Workspace', async ({
    page,
  }) => {
    let isAuthenticated = false;

    // Ghi đè route /api/auth/me: sau khi login thì trả về thông tin user
    await page.route(/\/api\/auth\/me/i, async (route) => {
      if (!isAuthenticated) {
        await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '22222222-2222-2222-2222-222222222222',
            email: 'writer@panelforge.com',
            fullName: 'PanelForge Writer',
            role: 'User',
            canCreateStudio: true,
          }),
        });
      }
    });

    // Regex case-insensitive matcher để bắt /api/Auth/login
    await page.route(/\/api\/auth\/login/i, async (route) => {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'writer@panelforge.com',
            fullName: 'PanelForge Writer',
            role: 'User',
            canCreateStudio: true,
          },
          token: 'mock-e2e-jwt-token',
          refreshToken: 'mock-e2e-refresh-token',
        }),
      });
    });

    await page.route(/\/api\/workspaces/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'a1000000-0000-0000-0000-000000000001',
            name: 'Studio Moonlight',
            slug: 'studio-moonlight',
            isOwner: true,
            currentUserRole: 'Producer',
          },
        ]),
      });
    });

    await loginPage.login('writer@panelforge.com', 'Bnt123#');

    // Chờ điều hướng đến /workspaces
    await expect(page).toHaveURL(/.*workspaces/, { timeout: 10000 });
    await expect(page.locator('text=/Studio|Không Gian Làm Việc/i').first()).toBeVisible();
  });
});

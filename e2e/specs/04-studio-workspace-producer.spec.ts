import { test, expect } from '@playwright/test';
import { WorkspacePage } from '../pages/WorkspacePage';
import { MOCK_WORKSPACES } from '../fixtures/mockData';

test.describe('E2E: Studio Workspace & Producer Hub (CF1, BR-07, BR-22)', () => {
  let workspacePage: WorkspacePage;

  test.beforeEach(async ({ page }) => {
    // Inject auth state in localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'producer@panelforge.com',
          fullName: 'PanelForge Producer',
          role: 'User',
          canCreateStudio: true,
        }),
      );
      localStorage.setItem('userRole', 'USER');
      localStorage.setItem('token', 'mock-producer-token');
      localStorage.setItem('pf_app_session_started', 'true');
      localStorage.setItem('pf_remember_device', 'true');
    });

    // Mock API requests with case-insensitive regex
    await page.route(/\/api\/auth\/me/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'producer@panelforge.com',
          fullName: 'PanelForge Producer',
          role: 'User',
          canCreateStudio: true,
        }),
      });
    });

    await page.route(/\/api\/workspaces/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORKSPACES),
      });
    });

    workspacePage = new WorkspacePage(page);
    await workspacePage.goto();
  });

  test('TC-WORKSPACE-01: Hiển thị danh sách Studio Workspace và vai trò Producer (BR-07)', async ({ page }) => {
    // 1. Kiểm tra tiêu đề trang Workspace
    await expect(page.locator('text=/Your Workspaces|Không Gian Làm Việc/i').first()).toBeVisible({ timeout: 10000 });

    // 2. Kiểm tra thẻ Studio Moonlight xuất hiện
    await expect(page.locator('text=Studio Moonlight').first()).toBeVisible({ timeout: 10000 });

    // 3. Kiểm tra huy hiệu vai trò Producer
    await expect(page.locator('text=/Producer|Chủ Studio/i').first()).toBeVisible();
  });

  test('TC-WORKSPACE-02: Nút "Tạo Studio Mới" hiển thị khi người dùng có thẩm quyền canCreateStudio (BR-22)', async ({ page }) => {
    // Kiểm tra nút Tạo Studio / Tạo Workspace có sẵn và có thể tương tác
    const createBtn = page.locator('button:has-text("Tạo Studio"), button:has-text("Tạo Workspace"), button:has-text("Create Workspace")').first();
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
  });
});

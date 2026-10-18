import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';

test.describe('E2E: Landing Page & Navigation', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test('TC-LANDING-01: Trang chủ hiển thị đầy đủ thương hiệu PanelForge và Hero section', async ({
    page,
  }) => {
    // 1. Kiểm tra logo PanelForge
    await expect(landingPage.logo).toBeVisible();

    // 2. Kiểm tra các nút hành động chính ở Header
    await expect(landingPage.loginButton).toBeVisible();
    await expect(landingPage.registerButton).toBeVisible();

    // 3. Kiểm tra Hero Section và SVG Manga showcase
    await expect(landingPage.heroSection).toBeVisible();
    await expect(
      page.locator('text=/Không gian cộng tác sản xuất manga|Từ ý tưởng đến/i').first(),
    ).toBeVisible();
  });

  test('TC-LANDING-02: Bấm nút "Đăng nhập" mở Modal đăng nhập nổi bật', async ({ page }) => {
    await landingPage.openLoginModal();

    // Xác nhận modal hoặc form đăng nhập xuất hiện
    const loginModal = page.locator('text=/Chào mừng|Đăng nhập/i').first();
    await expect(loginModal).toBeVisible();

    // Kiểm tra trường nhập email và mật khẩu có sẵn
    await expect(page.locator('input[type="email"], #login-email').first()).toBeVisible();
    await expect(page.locator('input[type="password"], #login-password').first()).toBeVisible();
  });

  test('TC-LANDING-03: Điều hướng trực tiếp đến Thư viện Catalog công khai không cần đăng nhập (BR-24)', async ({
    page,
  }) => {
    // Điều hướng trực tiếp đến /catalog
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });

    // Kiểm tra tiêu đề Thư viện
    await expect(page.locator('h1:has-text("Thư Viện Tác Phẩm Xuất Bản")')).toBeVisible();

    // Kiểm tra thanh tìm kiếm và bộ lọc thể loại
    await expect(page.locator('input[placeholder*="Tìm kiếm"]').first()).toBeVisible();
  });
});

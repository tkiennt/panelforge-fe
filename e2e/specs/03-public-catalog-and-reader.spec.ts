import { test, expect } from '@playwright/test';
import { CatalogPage } from '../pages/CatalogPage';
import { MOCK_PUBLIC_SERIES, MOCK_SERIES_DETAIL, MOCK_CHAPTER_READ } from '../fixtures/mockData';

test.describe('E2E: Public Catalog & Manga Reader (CF5, BR-14, BR-24)', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    // Intercept catalog API requests to ensure reliable, isolated E2E tests
    await page.route('**/api/catalog/series?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_SERIES),
      });
    });

    await page.route('**/api/catalog/series', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PUBLIC_SERIES),
      });
    });

    await page.route(
      '**/api/catalog/series/d2b3993d-8b27-4b0a-ab8c-d3683d54a5b9',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SERIES_DETAIL),
        });
      },
    );

    await page.route('**/api/catalog/chapters/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAPTER_READ),
      });
    });

    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test('TC-CATALOG-01: Hiển thị danh mục tác phẩm đã phát hành từ API công khai', async ({
    page,
  }) => {
    // 1. Kiểm tra tiêu đề chính
    await expect(catalogPage.title).toBeVisible();

    // 2. Kiểm tra bộ truyện mẫu xuất hiện trên giao diện
    await expect(page.locator('text=Lantern of the Tide').first()).toBeVisible();
    await expect(page.locator('text=Neon Ronin').first()).toBeVisible();

    // 3. Kiểm tra thông tin Studio xuất bản
    await expect(page.locator('text=Studio Moonlight').first()).toBeVisible();
  });

  test('TC-CATALOG-02: Lọc danh mục theo thể loại', async ({ page }) => {
    // Chọn thể loại "Fantasy / Isekai"
    const fantasyChip = page.locator('button:has-text("Fantasy / Isekai")').first();
    await fantasyChip.click();

    // Đảm bảo chip đã được active
    await expect(fantasyChip).toHaveClass(/bg-\[#292524\]/);
  });

  test('TC-CATALOG-03: Xem chi tiết bộ truyện và danh sách chương', async ({ page }) => {
    // Click vào card truyện "Lantern of the Tide"
    const seriesCard = page.locator('text=Lantern of the Tide').first();
    await seriesCard.click();

    // Kiểm tra modal chi tiết truyện mở ra
    await expect(page.locator('text=The Letter in the Foam').first()).toBeVisible();
    await expect(page.locator('text=Whispers from the Abyssal Core').first()).toBeVisible();
  });
});

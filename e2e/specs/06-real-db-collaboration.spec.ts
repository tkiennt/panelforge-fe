import { test, expect } from '@playwright/test';

test.describe('E2E Real Database: Series Bible Writer & Artist Collaboration', () => {
  test.use({ baseURL: 'http://localhost:5174' });

  test('Giai đoạn 1 (Writer): Đăng nhập, mở Series Bible, thêm Thời Kỳ Mới và kiểm tra không văng', async ({
    page,
  }) => {
    // 1. Vào trang Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Điền thông tin đăng nhập của Writer
    await page.locator('#login-email').fill('writer@panelforge.com');
    await page.locator('#login-password').fill('Bnt123#');
    await page.locator('#login-submit-btn').click();

    // 3. Chờ chuyển hướng tới /workspaces
    await page.waitForURL(/.*workspaces.*/i, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 4. Vào Studio đầu tiên
    const enterStudioBtn = page.locator('button:has-text("Vào studio"), a:has-text("Vào studio")').first();
    await expect(enterStudioBtn).toBeVisible({ timeout: 10000 });
    await enterStudioBtn.click();
    await page.waitForLoadState('networkidle');

    // 5. Điều hướng tới Series Bible
    const bibleLink = page.locator('a[href*="/bible"], button:has-text("Series Bible")').first();
    if (await bibleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bibleLink.click();
    } else {
      const currentUrl = page.url();
      if (currentUrl.includes('/series/')) {
        const bibleUrl = currentUrl.replace(/\/(dashboard|workspace|overview|series)$/, '/bible');
        await page.goto(bibleUrl);
      }
    }
    await page.waitForLoadState('networkidle');

    // 6. Kiểm tra giao diện Series Bible đã tải thành công
    const bibleHeader = page.locator('h1, h2, [data-testid="series-bible-title"]').first();
    await expect(bibleHeader).toBeVisible({ timeout: 10000 });

    // 7. Click mở một Entity
    const entityCard = page.locator('[data-testid^="bible-card-"]').first();
    if (await entityCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entityCard.click();
      await page.waitForLoadState('networkidle');

      // Kiểm tra Workbench đã hiển thị
      const detailModal = page.locator('[role="dialog"]').first();
      await expect(detailModal).toBeVisible({ timeout: 8000 });

      // Nhấp nút "+ Thêm Thời Kỳ Mới"
      const addEraBtn = page.locator('button:has-text("+ Thêm Thời Kỳ Mới")');
      if (await addEraBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addEraBtn.click();

        // Modal xuất hiện, nhập liệu mượt mà
        const stageInput = page.locator('[data-testid="revision-stage-name-input"]');
        await expect(stageInput).toBeVisible({ timeout: 5000 });
        await stageInput.fill('Giai đoạn Thử nghiệm E2E Real');

        const summaryInput = page.locator('input[placeholder*="Cập nhật trang phục"]');
        await summaryInput.fill('Đặc tả thời kỳ thử nghiệm tự động từ trình duyệt');

        // Bấm Escape để test rẽ nhánh: đóng modal con mà KHÔNG đóng Workbench
        await page.keyboard.press('Escape');

        // Workbench vẫn hiển thị
        await expect(detailModal).toBeVisible();
      }
    }
  });

  test('Giai đoạn 2 (Artist): Đăng nhập tài khoản Họa Sĩ, vào Series Bible và kiểm tra quyền hạn', async ({
    page,
  }) => {
    // 1. Vào trang Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Điền thông tin đăng nhập của Artist
    await page.locator('#login-email').fill('artist@panelforge.com');
    await page.locator('#login-password').fill('Bnt123#');
    await page.locator('#login-submit-btn').click();

    // 3. Chờ chuyển hướng tới /workspaces
    await page.waitForURL(/.*workspaces.*/i, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 4. Vào Studio đầu tiên
    const enterStudioBtn = page.locator('button:has-text("Vào studio"), a:has-text("Vào studio")').first();
    await expect(enterStudioBtn).toBeVisible({ timeout: 10000 });
    await enterStudioBtn.click();
    await page.waitForLoadState('networkidle');

    // 5. Mở Series Bible
    const bibleLink = page.locator('a[href*="/bible"], button:has-text("Series Bible")').first();
    if (await bibleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bibleLink.click();
    } else {
      const currentUrl = page.url();
      if (currentUrl.includes('/series/')) {
        const bibleUrl = currentUrl.replace(/\/(dashboard|workspace|overview|series)$/, '/bible');
        await page.goto(bibleUrl);
      }
    }
    await page.waitForLoadState('networkidle');

    // 6. Kiểm tra role badge hoặc quyền của Artist
    const entityCard = page.locator('[data-testid^="bible-card-"]').first();
    if (await entityCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entityCard.click();
      await page.waitForLoadState('networkidle');

      const detailModal = page.locator('[role="dialog"]').first();
      await expect(detailModal).toBeVisible({ timeout: 8000 });

      // Artist không có quyền Duyệt thiết kế (chỉ Writer/Producer có quyền)
      const endorseBtn = page.locator('[data-testid="detail-endorse-btn"], button:has-text("✓ Duyệt thiết kế")');
      await expect(endorseBtn).not.toBeVisible();
    }
  });
});

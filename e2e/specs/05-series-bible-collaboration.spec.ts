import { test, expect } from '@playwright/test';

test.describe('E2E: Series Bible Multi-Role Collaboration (Writer & Artist)', () => {
  const seriesId = 'series-one-piece-live';
  const entityId = 'ent-nami-test';

  const mockSeries = [
    {
      id: seriesId,
      title: 'One Piece Live',
      synopsis: 'Manga Production Serial Test',
      chaptersCount: 15,
      format: 'B5 Tankōbon',
      genre: 'Action, Adventure',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  let currentRevisions = [
    {
      id: 'rev-1',
      bibleEntryId: entityId,
      versionNumber: 1,
      summary: 'Khởi tạo nhân vật Nami',
      stageName: 'Lúc nhỏ',
      effectiveFromChapterNumber: 1,
      effectiveToChapterNumber: 14,
      referenceImageUrl: '',
      reviewStatus: 'Draft',
      isLocked: false,
      isInitialVersion: true,
      contentHash: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      createdAt: '2026-10-15T00:00:00Z',
    },
  ];

  const getMockBible = () => ({
    id: 'bible-01',
    seriesId: seriesId,
    entries: [
      {
        id: entityId,
        seriesBibleId: 'bible-01',
        category: 0,
        code: 'CHR-NAMI',
        name: 'Nami',
        subtitle: 'Hoa Tiêu',
        description: 'Mặc áo cam, tóc cam ngắn.',
        detailsJson: JSON.stringify({
          Attributes: {
            age: '10 tuổi',
            height: '140 cm',
            traits: 'Tóc cam ngắn, thích quýt và tiền vàng.',
          },
        }),
        referenceImageUrl: currentRevisions[currentRevisions.length - 1].referenceImageUrl || '',
        effectiveRevision: currentRevisions[currentRevisions.length - 1],
        isActive: true,
        priority: 1,
      },
    ],
  });

  const setupMockRoutes = async (page: any, role: 'Writer' | 'Artist') => {
    // Auth route
    await page.route(/\/api\/auth\/me/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: role === 'Writer' ? 'writer-id' : 'artist-id',
          email: role === 'Writer' ? 'writer@panelforge.com' : 'artist@panelforge.com',
          fullName: role === 'Writer' ? 'Kịch Bản Viên (Writer)' : 'Họa Sĩ (Artist)',
          role: 'User',
          canCreateStudio: true,
        }),
      });
    });

    // Workspaces route
    await page.route(/\/api\/workspaces$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ws-test-01',
            name: 'Studio Test Workspace',
            slug: 'studio-test',
            isOwner: false,
            currentUserRole: role === 'Writer' ? 'WRITER' : 'ARTIST',
            memberCount: 5,
            createdAt: '2026-10-01T00:00:00Z',
          },
        ]),
      });
    });

    // Workspace by ID route
    await page.route(/\/api\/workspaces\/ws-test-01$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ws-test-01',
          name: 'Studio Test Workspace',
          slug: 'studio-test',
          isOwner: false,
          currentUserRole: role === 'Writer' ? 'WRITER' : 'ARTIST',
          memberCount: 5,
          createdAt: '2026-10-01T00:00:00Z',
        }),
      });
    });

    // Workspace series route
    await page.route(/\/api\/workspaces\/ws-test-01\/series(\?|$)/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries),
      });
    });

    // Specific series route
    await page.route(/\/api\/series\/series-one-piece-live$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries[0]),
      });
    });

    // Series route
    await page.route(/\/api\/series(\?|$)/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries),
      });
    });

    // Chapters route
    await page.route(/\/api\/series\/.*\/chapters/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'ch-1', chapterNumber: 1, title: 'Chương 1' },
            { id: 'ch-15', chapterNumber: 15, title: 'Chương 15' },
          ],
          totalCount: 2,
        }),
      });
    });

    // Series Bible route
    await page.route(/\/api\/series\/[^\/]+\/bible(\?|$)/i, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(getMockBible()),
        });
      } else {
        await route.continue();
      }
    });

    // Entry history route
    await page.route(/\/api\/series\/[^\/]+\/bible\/entries\/[^\/]+\/history/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentRevisions),
      });
    });

    // Add revision route
    await page.route(/\/api\/series\/[^\/]+\/bible\/entries\/[^\/]+\/revisions$/i, async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      const newRev = {
        id: `rev-${currentRevisions.length + 1}`,
        bibleEntryId: entityId,
        versionNumber: currentRevisions.length + 1,
        summary: payload.summary || 'Thêm thời kỳ mới',
        stageName: payload.stageName || 'Timeskip',
        effectiveFromChapterNumber: payload.effectiveFromChapterNumber || 15,
        effectiveToChapterNumber: payload.effectiveToChapterNumber || null,
        referenceImageUrl: payload.referenceImageUrl || '',
        reviewStatus: 'Draft',
        isLocked: false,
        isInitialVersion: false,
        contentHash: 'b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef12',
        createdAt: new Date().toISOString(),
      };
      currentRevisions.push(newRev);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newRev),
      });
    });

    // Artist submit concept route
    await page.route(/\/api\/series\/[^\/]+\/bible\/entries\/[^\/]+\/concept/i, async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      const active = currentRevisions[currentRevisions.length - 1];
      active.reviewStatus = 'ConceptSubmitted';
      active.referenceImageUrl = payload.referenceImageUrl || 'https://images.unsplash.com/photo-test-nami.png';
      active.summary = payload.summary || 'Artist nộp concept';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(active),
      });
    });

    // Writer endorse route
    await page.route(/\/api\/series\/[^\/]+\/bible\/entries\/[^\/]+\/revisions\/[^\/]+\/endorse/i, async (route) => {
      const active = currentRevisions[currentRevisions.length - 1];
      active.reviewStatus = 'WriterEndorsed';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(active),
      });
    });

    // Writer rework request route
    await page.route(/\/api\/series\/[^\/]+\/bible\/entries\/[^\/]+\/revisions\/[^\/]+\/rework/i, async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      const active = currentRevisions[currentRevisions.length - 1];
      active.reviewStatus = 'ReworkRequired';
      (active as any).reworkFeedback = payload.reworkReason || 'Chỉnh lại nét vẽ';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(active),
      });
    });
  };

  test('Kịch bản 1: Writer mở nhân vật, tạo thời kỳ mới "Timeskip (Ch.15+)" và màn hình không bị out', async ({
    page,
  }) => {
    await setupMockRoutes(page, 'Writer');

    // Thiết lập local storage giả lập đã login
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-writer-token');
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({
          id: 'ws-test-01',
          name: 'Studio Test Workspace',
          currentUserRole: 'WRITER',
        }),
      );
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'writer-id',
          email: 'writer@panelforge.com',
          fullName: 'PanelForge Writer',
          role: 'User',
        }),
      );
    });

    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Click vào studio workspace để vào dự án
    const enterStudioBtn = page.locator('button:has-text("Vào studio")').first();
    await expect(enterStudioBtn).toBeVisible({ timeout: 10000 });
    await enterStudioBtn.click();
    await page.waitForLoadState('networkidle');

    // Chuyển tới Series Bible
    await page.goto('/workspaces/ws-test-01/series/series-one-piece-live/bible');
    await page.waitForLoadState('networkidle');

    // 1. Nhấp vào card nhân vật Nami để mở Workbench
    const characterCard = page.locator('[data-testid="bible-card-ent-nami-test"]');
    await expect(characterCard).toBeVisible({ timeout: 10000 });
    await characterCard.click();

    // Kiểm tra Workbench đã hiển thị
    await expect(page.locator('#bible-entity-title')).toContainText('Nami');

    // 2. Writer thấy thông báo Model sheet đang chờ họa sĩ vẽ
    await expect(page.locator('text=Chờ Họa sĩ tải lên bản vẽ')).toBeVisible();

    // 3. Nhấp nút "+ Thêm Thời Kỳ Mới"
    const addEraBtn = page.locator('button:has-text("+ Thêm Thời Kỳ Mới")');
    await expect(addEraBtn).toBeVisible();
    await addEraBtn.click();

    // Modal xuất hiện, nhập liệu mượt mà không khựng
    const stageInput = page.locator('[data-testid="revision-stage-name-input"]');
    await expect(stageInput).toBeVisible();
    await stageInput.fill('Timeskip 2 năm');

    const summaryInput = page.locator('input[placeholder*="Cập nhật trang phục"]');
    await summaryInput.fill('Nami sau timeskip 2 năm, tóc dài, vũ khí gậy thời tiết mới');

    // 4. Nhấp Lưu phiên bản / Gửi bản nháp
    const submitBtn = page.locator('[data-testid="save-revision-submit-btn"]');
    await submitBtn.click();

    // 5. Xác nhận không bị văng ra ngoài Series Bible tổng, Workbench vẫn mở và hiển thị Tab Era mới
    await expect(page.locator('#bible-entity-title')).toContainText('Nami');
    await expect(page.locator('[data-testid^="era-tab-"]').filter({ hasText: 'Timeskip 2 năm' })).toBeVisible();
  });

  test('Kịch bản 2: Artist nộp Concept Art và Writer duyệt / yêu cầu vẽ lại', async ({ page }) => {
    // Đã có bản Timeskip từ bước 1
    currentRevisions.push({
      id: 'rev-2',
      bibleEntryId: entityId,
      versionNumber: 2,
      summary: 'Timeskip 2 năm',
      stageName: 'Timeskip 2 năm',
      effectiveFromChapterNumber: 15,
      effectiveToChapterNumber: null,
      referenceImageUrl: 'https://images.unsplash.com/photo-nami-submitted.png',
      reviewStatus: 'ConceptSubmitted',
      isLocked: false,
      isInitialVersion: false,
      contentHash: 'c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef1234',
      createdAt: new Date().toISOString(),
    });

    await setupMockRoutes(page, 'Writer');

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-writer-token');
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({
          id: 'ws-test-01',
          name: 'Studio Test Workspace',
          currentUserRole: 'WRITER',
        }),
      );
    });

    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    const enterStudioBtn = page.locator('button:has-text("Vào studio")').first();
    await expect(enterStudioBtn).toBeVisible({ timeout: 10000 });
    await enterStudioBtn.click();
    await page.waitForLoadState('networkidle');

    await page.goto('/workspaces/ws-test-01/series/series-one-piece-live/bible');
    await page.waitForLoadState('networkidle');

    // Mở Workbench
    await page.locator('[data-testid="bible-card-ent-nami-test"]').click();

    // Thấy nút Duyệt và Yêu cầu vẽ lại khi đã có ảnh Concept nộp
    const reworkBtn = page.locator('[data-testid="detail-rework-btn"]');
    await expect(reworkBtn).toBeVisible();

    // Thử tính năng Yêu cầu vẽ lại
    await reworkBtn.click();

    // Modal Rework xuất hiện, gõ lý do không bị khựng
    const reworkTextarea = page.locator('textarea[placeholder*="Kiểu tóc"]');
    await expect(reworkTextarea).toBeVisible();
    await reworkTextarea.fill('Màu tóc cần ánh cam sáng hơn, biểu cảm tự tin hơn');

    const sendReworkBtn = page.locator('button:has-text("Gửi yêu cầu vẽ lại")');
    await sendReworkBtn.click();

    // Sau khi gửi Rework, Workbench không bị out, trạng thái cập nhật ReworkRequired
    await expect(page.locator('#bible-entity-title')).toContainText('Nami');
    await expect(page.locator('text=Yêu cầu chỉnh sửa bản vẽ từ Writer')).toBeVisible();
  });
});

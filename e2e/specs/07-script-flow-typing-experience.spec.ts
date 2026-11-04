import { test, expect } from '@playwright/test';

test.describe('E2E: Kịch Bản Phân Cảnh & Trải Nghiệm Soạn Thảo (Script Flow Typing Experience)', () => {
  const seriesId = 'series-one-piece-live';
  const chapterId = 'chap-test-01';
  const sceneId = 'scene-01';

  const mockSeries = [
    {
      id: seriesId,
      title: 'Tokyo Cyberpunk 2088',
      synopsis: 'Manga Production Scripting Test',
      chaptersCount: 1,
      format: 'B5 Tankōbon',
      genre: 'Action, Sci-Fi',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockChapters = [
    {
      id: chapterId,
      seriesId: seriesId,
      chapterNumber: 1,
      title: 'Chương 1: Khởi Đầu Trong Mưa',
      targetReleaseDate: '2026-12-01',
      versionVector: 1,
      createdAt: '2026-10-01T00:00:00Z',
      scenesCount: 1,
      pagesCount: 1,
      status: 'InProduction',
      isScriptFrozen: false,
      outline: 'Cuộc gặp gỡ định mệnh trong con hẻm Tokyo.',
    },
  ];

  const mockSceneDetail = {
    id: sceneId,
    chapterId: chapterId,
    sceneNumber: 1,
    heading: 'CON HẺM SHINJUKU - ĐÊM MƯA',
    summary: 'Minh gặp gỡ người liên lạc bí ẩn.',
    createdAt: '2026-10-01T00:00:00Z',
    scriptLinesCount: 0,
    pagesCount: 1,
    scriptLines: [],
  };

  const mockBible = {
    id: 'bible-01',
    seriesId: seriesId,
    entries: [
      {
        id: 'chr-minh',
        seriesBibleId: 'bible-01',
        category: 0,
        code: 'CHR-MINH',
        name: 'Minh',
        subtitle: 'Nhân vật chính',
        description: 'Chiến binh cyberpunk với cánh tay cơ khí.',
        detailsJson: '{}',
        referenceImageUrl: '',
        isActive: true,
        priority: 1,
      },
    ],
  };

  const setupMocks = async (page: any) => {
    // Auth route
    await page.route(/\/api\/auth\/me/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'writer-id',
          email: 'writer@panelforge.com',
          fullName: 'Nguyễn Kịch Bản (Writer)',
          role: 'User',
          canCreateStudio: true,
        }),
      });
    });

    // Workspaces
    await page.route(/\/api\/workspaces$/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ws-test-01',
            name: 'Studio Cyber Manga',
            slug: 'studio-cyber',
            isOwner: false,
            currentUserRole: 'WRITER',
            memberCount: 3,
            createdAt: '2026-10-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.route(/\/api\/workspaces\/ws-test-01$/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ws-test-01',
          name: 'Studio Cyber Manga',
          slug: 'studio-cyber',
          isOwner: false,
          currentUserRole: 'WRITER',
          memberCount: 3,
          createdAt: '2026-10-01T00:00:00Z',
        }),
      });
    });

    // Series
    await page.route(/\/api\/workspaces\/ws-test-01\/series(\?|$)/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries),
      });
    });

    await page.route(/\/api\/series\/series-one-piece-live$/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries[0]),
      });
    });

    await page.route(/\/api\/series(\?|$)/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries),
      });
    });

    // Chapters
    await page.route(/\/api\/series\/series-one-piece-live\/chapters/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockChapters,
          totalCount: 1,
          pageIndex: 1,
          pageSize: 50,
          totalPages: 1,
        }),
      });
    });

    await page.route(new RegExp(`/api/chapters/${chapterId}$`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChapters[0]),
      });
    });

    await page.route(/\/api\/chapters\/.*\/bible-gate/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isEligible: true, warnings: [] }),
      });
    });

    await page.route(new RegExp(`/api/chapters/${chapterId}/scenes`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockSceneDetail]),
      });
    });

    await page.route(new RegExp(`/api/scenes/${sceneId}$`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSceneDetail),
      });
    });

    await page.route(/\/api\/chapters\/.*\/pages/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/chapters\/.*\/panels/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/series\/series-one-piece-live\/bible/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBible),
      });
    });

    await page.route(/\/api\/scenes\/.*\/lines\/batch/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 5 }),
      });
    });

    await page.route(/\/api\/consistency/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  };

  test('Soạn thảo thử kịch bản, kiểm tra Lời dẫn chuyện xuống dòng không in nghiêng & xóa Panel/Page bằng Backspace', async ({
    page,
  }) => {
    // 1. Cài đặt mock state và điều hướng vào trình soạn thảo
    await page.addInitScript(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'writer-id',
          email: 'writer@panelforge.com',
          fullName: 'Nguyễn Kịch Bản (Writer)',
          role: 'User',
          canCreateStudio: true,
        })
      );
      localStorage.setItem('userRole', 'USER');
      localStorage.setItem('workspaceRole', 'WRITER');
      localStorage.setItem('token', 'mock-writer-token');
      localStorage.setItem('pf_app_session_started', 'true');
      localStorage.setItem('pf_remember_device', 'true');
    });

    await setupMocks(page);

    const targetUrl = `/workspaces/ws-test-01/series/${seriesId}/script?chapterId=${chapterId}`;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // 2. Chờ trình soạn thảo Tiptap sẵn sàng
    const editor = page.locator('.paper-editor-sheet .ProseMirror');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Tiêu đề trang đầu tiên phải xuất hiện
    const firstPageHeading = editor.locator('[data-block-type="page_heading"]').first();
    await expect(firstPageHeading).toBeVisible();
    await expect(firstPageHeading).toContainText(/TRANG\s*1/i);

    // 3. SOẠN THẢO THỬ 1 ĐOẠN KỊCH BẢN CHUẨN:
    // Focus vào trình soạn thảo
    await editor.click();

    // Di chuyển con trỏ xuống cuối tài liệu
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // Gõ Panel 1: " Panel 1.1: [Toàn cảnh] Tokyo chìm trong bóng tối.
    await page.keyboard.type('" Panel 1.1: [Toàn cảnh] Tokyo chìm trong bóng tối.');
    await page.keyboard.press('Enter');

    // Gõ Lời dẫn chuyện: Caption: Đêm đã về khuya, những ngọn đèn neon le lói phản chiếu trên mặt đường ướt sũng.
    await page.keyboard.type('Caption: Đêm đã về khuya, những ngọn đèn neon le lói.');
    await page.keyboard.press('Enter');

    // 4. KIỂM TRA ĐIỀU KIỆN 1: Sau khi Lời dẫn chuyện Enter xuống dòng, dòng mới là văn bản bình thường (caption) không in nghiêng, không có khối "chỉ dẫn"
    const captionBlocks = editor.locator('[data-block-type="caption"]');
    const firstCaption = captionBlocks.first();
    await expect(firstCaption).toBeVisible();
    await expect(firstCaption).toContainText('Đêm đã về khuya');

    // Dòng mới sau Enter từ Caption phải là khối caption (Lời dẫn truyện / văn bản bình thường), class 'not-italic' và KHÔNG chứa class 'italic'
    const nextLineAfterCaption = captionBlocks.last();
    await expect(nextLineAfterCaption).toBeVisible();
    
    // Kiểm tra class not-italic
    const lineClass = await nextLineAfterCaption.getAttribute('class');
    expect(lineClass).toContain('not-italic');
    expect(lineClass).not.toContain(' italic ');

    // Đảm bảo không còn khối stage_direction nào trên toàn trang
    const stageDirectionBlocks = editor.locator('[data-block-type="stage_direction"]');
    await expect(stageDirectionBlocks).toHaveCount(0);

    // Đảm bảo thanh công cụ không còn nút "Chỉ dẫn"
    await expect(page.locator('button:has-text("Chỉ dẫn")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Lời dẫn truyện")')).toBeVisible();

    // Gõ nội dung hành động bình thường trên dòng này
    await page.keyboard.type('Gió lạnh thổi qua từng con hẻm vắng.');
    await page.keyboard.press('Enter');

    // Gõ Lời thoại: @Minh : "Chúng ta phải nhanh lên!"
    await page.keyboard.type('@Minh : "Chúng ta phải nhanh lên!"');
    await page.keyboard.press('Enter');

    // Gõ SFX: * VÚT! *
    await page.keyboard.type('* VÚT! *');
    await page.keyboard.press('Enter');

    // 5. KIỂM TRA ĐIỀU KIỆN 2: XÓA PANEL VÀ PAGE BẰNG BACKSPACE
    // 5.1 Thêm Trang 2 bằng nút "+ Trang (cam)" trên thanh công cụ
    const addPageBtn = page.locator('button:has-text("+ Trang (cam)")');
    await addPageBtn.click();

    const pageBlocks = editor.locator('[data-block-type="page_heading"]');
    await expect(pageBlocks).toHaveCount(2);
    const secondPage = pageBlocks.nth(1);
    await expect(secondPage).toContainText(/TRANG\s*2/i);

    // Click vào phần text của Trang 02 và nhấn Backspace -> Trang 02 phải bị XÓA HOÀN TOÀN!
    const secondPageText = secondPage.locator('.page-heading-content');
    await secondPageText.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await expect(pageBlocks).toHaveCount(1); // Chỉ còn Trang 01

    // 5.2 Thêm Panel bằng nút "+ Panel (tím)"
    const addPanelBtn = page.locator('button:has-text("+ Panel (tím)")');
    const panelBlocks = editor.locator('[data-block-type="panel_heading"]');
    const panelCountBefore = await panelBlocks.count();

    await addPanelBtn.click();
    await expect(panelBlocks).toHaveCount(panelCountBefore + 1);

    // Click vào phần text của Panel mới thêm và nhấn Backspace -> Panel phải bị XÓA HOÀN TOÀN!
    const newPanel = panelBlocks.last();
    const newPanelText = newPanel.locator('.panel-heading-text');
    await newPanelText.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await expect(panelBlocks).toHaveCount(panelCountBefore);

    // 5.3 KIỂM TRA KHÔNG THỂ XÓA TIÊU ĐỀ TRANG ĐẦU TIÊN (TRANG 01)
    // Di chuyển lên tiêu đề Trang 01
    const firstPageText = firstPageHeading.locator('.page-heading-content');
    await firstPageText.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    // Tiêu đề trang 01 vẫn nguyên vẹn, không bị xóa
    await expect(firstPageHeading).toBeVisible();
    await expect(firstPageHeading).toContainText(/TRANG\s*1/i);

    // 6. Chụp ảnh màn hình bằng chứng trải nghiệm soạn kịch bản mượt mà
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/2daf86cc-4914-4b16-9509-f37be441782b/script-editor-typing-experience.png',
      fullPage: true,
    });
  });
});

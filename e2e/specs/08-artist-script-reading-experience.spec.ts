import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('E2E: Bàn Vẽ Artist & Trải Nghiệm Đọc Kịch Bản (Artist Desk Script Reading)', () => {
  const workspaceId = 'ws-test-01';
  const seriesId = 'series-tokyo-cyberpunk';
  const chapterId = 'c1111111-1111-1111-1111-111111111111';
  const pageId = 'p1111111-1111-1111-1111-111111111111';
  const page2Id = 'p2222222-2222-2222-2222-222222222222';
  const scene1Id = 'scene-01';
  const scene2Id = 'scene-02';

  const mockSeries = {
    id: seriesId,
    workspaceId: workspaceId,
    title: 'Tokyo Cyberpunk 2088',
    synopsis: 'Manga Production Platform Test Project',
    chaptersCount: 1,
    format: 'B5 Tankōbon',
    genre: 'Action, Cyberpunk',
    readingDirection: 'RightToLeft',
    createdAt: '2026-10-01T00:00:00Z',
  };

  const mockChapters = [
    {
      id: chapterId,
      seriesId: seriesId,
      chapterNumber: 1,
      title: 'Chương 1: Đêm Mưa Shinjuku',
      targetReleaseDate: '2026-12-01',
      versionVector: 1,
      createdAt: '2026-10-01T00:00:00Z',
      scenesCount: 2,
      pagesCount: 2,
      status: 'InProduction',
      isScriptFrozen: false,
      outline:
        'Minh thâm nhập vào khu ổ chuột Shinjuku dưới cơn mưa axit để gặp người môi giới thông tin.',
    },
  ];

  const mockBible = {
    id: 'bible-01',
    seriesId: seriesId,
    entries: [
      {
        id: 'chr-minh',
        seriesBibleId: 'bible-01',
        category: 0, // Character
        code: 'CHR-MINH',
        name: 'Minh',
        subtitle: 'Cựu đặc nhiệm Cyber',
        description:
          'Chiến binh tóc đen ngắn, áo khoác dạ đen chống nước, cánh tay phải cơ khí phát sáng đèn LED xanh dương.',
        referenceImageUrl: '',
        isActive: true,
      },
      {
        id: 'chr-hacker',
        seriesBibleId: 'bible-01',
        category: 0,
        code: 'CHR-KAYLA',
        name: 'Kayla',
        subtitle: 'Chuyên gia giải mã',
        description: 'Cô gái trẻ tóc hồng ánh neon, mắt kính thực tế ảo nhiều tròng.',
        referenceImageUrl: '',
        isActive: true,
      },
    ],
  };

  const mockScenes = [
    {
      id: scene1Id,
      chapterId: chapterId,
      sceneNumber: 1,
      heading: 'NGOẠI. CON HẺM SHINJUKU - ĐÊM MƯA',
      sceneName: 'Cuộc gặp trong hẻm',
      summary: 'Minh bước đi dưới mưa axit, ánh đèn neon phản chiếu trên vũng nước.',
      slugline: 'EXT. SHINJUKU ALLEY - NIGHT',
      scriptLinesCount: 3,
      pagesCount: 1,
    },
    {
      id: scene2Id,
      chapterId: chapterId,
      sceneNumber: 2,
      heading: 'NỘI. TẦNG HẦM QUÁN BAR CYBER - ĐÊM',
      sceneName: 'Cuộc đối thoại bí mật',
      summary: 'Minh bước vào quán bar ngầm và ngồi đối diện Kayla.',
      slugline: 'INT. UNDERGROUND BAR - NIGHT',
      scriptLinesCount: 2,
      pagesCount: 1,
    },
  ];

  const mockScene1Detail = {
    ...mockScenes[0],
    scriptLines: [
      {
        id: 'line-01',
        sceneId: scene1Id,
        lineOrder: 1,
        panelId: 'panel-01',
        speakerCharacterId: null,
        dialogueText: null,
        stageDirection:
          'Góc máy toàn cảnh nhìn từ trên cao xuống: Những tòa nhà chọc trời bảng biển neon nhấp nháy tím và xanh lơ. Mưa axit xối xả xuống con hẻm hẹp tăm tối, khói bốc lên từ các miệng cống ngầm.',
      },
      {
        id: 'line-02',
        sceneId: scene1Id,
        lineOrder: 2,
        panelId: 'panel-02',
        speakerCharacterId: 'chr-minh',
        dialogueText: 'Tín hiệu định vị dừng lại ở đây. Tầng hầm ngay phía trước.',
        stageDirection:
          'Cận cảnh khuôn mặt góc cạnh của Minh. Nước mưa chảy dài trên sống mũi, ánh mắt sắc lạnh nhìn chằm chằm cánh cửa sắt gỉ sét.',
      },
      {
        id: 'line-03',
        sceneId: scene1Id,
        lineOrder: 3,
        panelId: null,
        speakerCharacterId: null,
        dialogueText: null,
        stageDirection:
          'Tiếng bước chân lội bì bõm trong vũng nước. Minh đưa bàn tay cơ khí lên nắm chặt cán thanh đoản đao gài bên hông.',
      },
    ],
  };

  const mockScene2Detail = {
    ...mockScenes[1],
    scriptLines: [
      {
        id: 'line-04',
        sceneId: scene2Id,
        lineOrder: 1,
        panelId: 'panel-03',
        speakerCharacterId: 'chr-hacker',
        dialogueText: 'Anh đến muộn ba phút đấy, Minh.',
        stageDirection: 'Kayla gõ nhẹ ngón tay lên bàn kim loại mạ crom, không ngẩng đầu lên.',
      },
      {
        id: 'line-05',
        sceneId: scene2Id,
        lineOrder: 2,
        panelId: 'panel-04',
        speakerCharacterId: 'chr-minh',
        dialogueText: 'Có đuôi bám theo từ khu phố 4. Nhưng đã cắt được rồi.',
        stageDirection: 'Minh kéo ghế ngồi xuống đối diện, hơi thở lạnh tỏa ra khói mờ.',
      },
    ],
  };

  const mockPages = [
    {
      id: pageId,
      chapterId: chapterId,
      pageNumber: 1,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
    {
      id: page2Id,
      chapterId: chapterId,
      pageNumber: 2,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
  ];

  const mockPage1Detail = {
    ...mockPages[0],
    panelsCount: 2,
  };

  const mockPage2Detail = {
    ...mockPages[1],
    panelsCount: 2,
  };

  const mockPanelsPage1 = [
    {
      id: 'panel-01',
      pageId: pageId,
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: '0.05,0.05,0.9,0.4',
      borderless: false,
      sceneId: scene1Id,
      scriptLineIds: ['line-01'],
    },
    {
      id: 'panel-02',
      pageId: pageId,
      panelNumber: 2,
      readingOrder: 2,
      boundingBox: '0.05,0.5,0.9,0.45',
      borderless: false,
      sceneId: scene1Id,
      scriptLineIds: ['line-02'],
    },
  ];

  const mockPanelsPage2 = [
    {
      id: 'panel-03',
      pageId: page2Id,
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: '0.05,0.05,0.9,0.45',
      borderless: false,
      sceneId: scene2Id,
      scriptLineIds: ['line-04'],
    },
    {
      id: 'panel-04',
      pageId: page2Id,
      panelNumber: 2,
      readingOrder: 2,
      boundingBox: '0.05,0.55,0.9,0.4',
      borderless: false,
      sceneId: scene2Id,
      scriptLineIds: ['line-05'],
    },
  ];

  const setupMocks = async (page: any) => {
    // Current user auth
    await page.route(/\/api\/auth\/me/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'artist-user-id',
          email: 'artist@panelforge.com',
          fullName: 'Trần Họa Sĩ (Artist)',
          role: 'User',
        }),
      });
    });

    // Workspaces
    await page.route(/\/api\/workspaces/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: workspaceId,
            name: 'Studio Manga Alpha',
            role: 'Artist',
          },
        ]),
      });
    });

    // Series
    await page.route(/\/api\/series/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSeries),
      });
    });

    // Chapters
    await page.route(/\/api\/chapters\/?(\?.*)?$/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChapters),
      });
    });

    // Chapters by series
    await page.route(new RegExp(`/api/series/${seriesId}/chapters`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockChapters,
          totalCount: mockChapters.length,
          pageIndex: 1,
          pageSize: 50,
        }),
      });
    });

    // Chapter Detail
    await page.route(new RegExp(`/api/chapters/${chapterId}$`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChapters[0]),
      });
    });

    // Series Bible
    await page.route(/\/api\/series\/.*\/bible/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBible),
      });
    });

    // Scenes list
    await page.route(/\/api\/chapters\/.*\/scenes/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScenes),
      });
    });

    // Scene Detail 1
    await page.route(new RegExp(`/api/scenes/${scene1Id}$`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScene1Detail),
      });
    });

    // Scene Detail 2
    await page.route(new RegExp(`/api/scenes/${scene2Id}$`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScene2Detail),
      });
    });

    // Pages
    await page.route(/\/api\/chapters\/.*\/pages/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPages),
      });
    });

    // Panels
    await page.route(new RegExp(`/api/pages/([^/]+)/panels`, 'i'), async (route: any) => {
      const match = route
        .request()
        .url()
        .match(/\/api\/pages\/([^/]+)\/panels/i);
      const targetPageId = match ? match[1] : '';
      const data = targetPageId === page2Id ? mockPanelsPage2 : mockPanelsPage1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });

    // Snapshot & Artworks
    await page.route(new RegExp(`/api/pages/[^/]+/snapshot`, 'i'), async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ elements: [] }),
      });
    });

    await page.route(new RegExp(`/api/pages/([^/]+)$`, 'i'), async (route: any) => {
      const match = route
        .request()
        .url()
        .match(/\/api\/pages\/([^/]+)$/i);
      const targetPageId = match ? match[1] : '';
      const data = targetPageId === page2Id ? mockPage2Detail : mockPage1Detail;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });

    await page.route(/\/api\/chapters\/.*\/pages\/.*\/artworks/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Assignments
    await page.route(/\/api\/assignments/i, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  };

  test('Mở bàn vẽ Artist, kiểm tra màn hình Chọn Chương, Kịch bản rõ ràng, Đồng bộ trang và Focus Mode', async ({
    page,
  }) => {
    // Đảm bảo thư mục lưu ảnh tồn tại
    const screenshotsDir = 'D:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/e2e/screenshots';
    const brainScreenshotsDir =
      'C:/Users/ASUS/.gemini/antigravity/brain/ce620260-d9f4-4391-bf3a-2030e2a6001c';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(brainScreenshotsDir)) {
      fs.mkdirSync(brainScreenshotsDir, { recursive: true });
    }

    await page.addInitScript(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'artist-user-id',
          email: 'artist@panelforge.com',
          fullName: 'Trần Họa Sĩ (Artist)',
          role: 'USER',
        }),
      );
      localStorage.setItem('userRole', 'USER');
      localStorage.setItem('workspaceRole', 'ARTIST');
      localStorage.setItem('token', 'mock-artist-token');
      localStorage.setItem('pf_app_session_started', 'true');
      localStorage.setItem('pf_remember_device', 'true');
    });

    await setupMocks(page);

    // 1. Điều hướng vào /artist chưa có query chapterId -> Phải hiện màn hình chọn chương
    await page.goto(`/workspaces/${workspaceId}/series/${seriesId}/artist`);
    await page.waitForLoadState('networkidle');

    // Kiểm tra màn hình chọn chương
    const chapterSelection = page.getByTestId('artist-chapter-selection-wrapper');
    await expect(chapterSelection).toBeVisible();

    // Chụp ảnh màn hình Chọn Chương cho Artist
    await page.screenshot({
      path: path.join(screenshotsDir, '01-artist-chapter-selection.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(brainScreenshotsDir, '01-artist-chapter-selection.png'),
      fullPage: true,
    });

    // 2. Bấm chọn Chương 1
    const chapterCard = page.getByTestId('chapter-card-1');
    await expect(chapterCard).toBeVisible();
    await chapterCard.click();

    // 3. Chờ bàn vẽ xuất hiện
    await expect(page.getByTestId('artist-desk')).toBeVisible();
    await expect(page.getByTestId('artist-main-toolbar')).toBeVisible();

    // Kiểm tra tab Kịch bản đang được kích hoạt và có banner chỉ đọc
    const scriptTab = page.getByTestId('left-tab-script');
    await expect(scriptTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('artist-script-readonly-banner')).toBeVisible();

    // Chờ các dòng kịch bản xuất hiện
    await expect(page.getByTestId('script-line-item-line-01')).toBeVisible();
    await expect(page.getByTestId('script-line-item-line-02')).toBeVisible();

    // Chụp ảnh màn hình Bàn vẽ Artist với Kịch bản ở cột trái
    await page.screenshot({
      path: path.join(screenshotsDir, '02-artist-desk-script-view.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(brainScreenshotsDir, '02-artist-desk-script-view.png'),
      fullPage: true,
    });

    // 4. Kiểm tra trên Canvas ở giữa có hiển thị các Panel
    await expect(page.getByTestId('panel-box-panel-01')).toBeVisible();
    await expect(page.getByTestId('panel-box-panel-02')).toBeVisible();

    // 5. Kiểm tra nút Mẫu Khung và nút Đổi chương trên toolbar
    await expect(page.getByTestId('toolbar-frame-template-btn')).toBeVisible();
    await expect(page.getByTestId('switch-chapter-btn')).toBeVisible();

    // 6. Kiểm tra các tính năng nâng cao trải nghiệm đọc kịch bản
    // 6.1. Kiểm tra Tìm kiếm dòng kịch bản
    const searchInput = page.getByTestId('script-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Minh');
    await expect(page.getByTestId('script-line-item-line-02')).toBeVisible();
    await expect(page.getByTestId('script-line-item-line-01')).not.toBeVisible();

    // Xóa tìm kiếm để hiển thị lại đầy đủ
    const clearSearchBtn = page.getByTestId('script-search-clear-btn');
    await expect(clearSearchBtn).toBeVisible();
    await clearSearchBtn.click();
    await expect(page.getByTestId('script-line-item-line-01')).toBeVisible();
    await expect(page.getByTestId('script-line-item-line-02')).toBeVisible();

    // 6.2. Kiểm tra bộ chỉnh cỡ chữ
    await expect(page.getByTestId('script-font-sm-btn')).toBeVisible();
    await expect(page.getByTestId('script-font-base-btn')).toBeVisible();
    await expect(page.getByTestId('script-font-lg-btn')).toBeVisible();
    await page.getByTestId('script-font-lg-btn').click();

    // 6.3. Mở rộng cột kịch bản để đọc thoải mái hơn
    const toggleWidthBtn = page.getByTestId('script-col-width-toggle-btn');
    await expect(toggleWidthBtn).toBeVisible();
    await toggleWidthBtn.click();

    // Chụp lại ảnh màn hình Bàn vẽ Artist với Kịch bản mở rộng và hiển thị chi tiết Thoại / Chỉ dẫn
    await page.screenshot({
      path: path.join(screenshotsDir, '03-artist-desk-expanded-script.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(brainScreenshotsDir, '03-artist-desk-expanded-script.png'),
      fullPage: true,
    });

    // 7. Kiểm tra tính năng Đồng bộ Kịch bản theo Trang khi lật trang (Trang 1 -> Trang 2)
    // Chuyển sang tab Trang
    await page.getByTestId('left-tab-pages').click();
    const page2Item = page.getByTestId('page-item-2');
    await expect(page2Item).toBeVisible();
    await page2Item.getByRole('button').click();

    // Chuyển lại tab Kịch bản
    await page.getByTestId('left-tab-script').click();
    // Đã tự động đồng bộ sang Trang 2
    await expect(page.getByTestId('page-sync-indicator')).toContainText('Trang 2');
    // Dòng kịch bản của Trang 2 (Phân cảnh 2) xuất hiện
    await expect(page.getByTestId('script-line-item-line-04')).toBeVisible();

    // Chụp ảnh màn hình Đồng bộ kịch bản theo Trang
    await page.screenshot({
      path: path.join(screenshotsDir, '04-artist-desk-page-sync.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(brainScreenshotsDir, '04-artist-desk-page-sync.png'),
      fullPage: true,
    });

    // 8. Kiểm tra Chế độ Đọc Toàn Văn Kịch Bản Chương (Focus Mode)
    const openFocusBtn = page.getByTestId('open-script-focus-mode-btn');
    await expect(openFocusBtn).toBeVisible();
    await openFocusBtn.click();

    // Modal Focus Mode phải hiển thị toàn màn hình
    const focusModal = page.getByTestId('script-focus-mode-modal');
    await expect(focusModal).toBeVisible();
    await expect(page.getByTestId(`focus-scene-block-${scene1Id}`)).toBeVisible();
    await expect(page.getByTestId(`focus-scene-block-${scene2Id}`)).toBeVisible();

    // Chụp ảnh màn hình Chế độ Focus Mode
    await page.screenshot({
      path: path.join(screenshotsDir, '05-artist-desk-focus-mode.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(brainScreenshotsDir, '05-artist-desk-focus-mode.png'),
      fullPage: true,
    });

    // Đóng Focus Mode
    await page.getByTestId('script-focus-modal-close-btn').click();
    await expect(focusModal).not.toBeVisible();
  });
});

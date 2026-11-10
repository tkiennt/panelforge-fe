import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { assignmentService } from '@/services/assignment.service';
import { frameTemplateService } from '@/services/frameTemplate.service';
import { FocusWorkspaceLayout } from '@/app/FocusWorkspaceLayout';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ArtistDeskView - Integrated Canva Sidebar (Script & Bible) + Bottom Page Manager', () => {
  it('renders ArtistCanvaSidebar with Script and Series Bible tabs (Pages tab hidden) alongside bottom page manager', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Main desk container
    expect(screen.getByTestId('artist-desk')).toBeInTheDocument();

    // Left Sidebar (ArtistCanvaSidebar) exists with Script and Bible tabs ONLY
    expect(screen.getByTestId('artist-desk-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();
    expect(screen.queryByTestId('canva-tab-pages')).not.toBeInTheDocument();

    // Canvas Shell & Clean Blank Manga Paper
    expect(screen.getByTestId('artist-canvas-shell')).toBeInTheDocument();
    expect(screen.getByTestId('artist-blank-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('artist-canvas-surface')).toBeInTheDocument();

    // Canva Bottom Page Manager exists
    expect(screen.getByTestId('canva-bottom-page-manager')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-filmstrip')).toBeInTheDocument();
    expect(screen.getByTestId('canva-bottom-bar')).toBeInTheDocument();

    // Page thumbnails are rendered
    expect(screen.getByTestId('canva-page-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('1 / 6');
  });

  it('switches between Script and Bible tabs in sidebar drawer', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Open Script tab
    fireEvent.click(screen.getByTestId('canva-tab-script'));
    expect(screen.getByTestId('canva-secondary-drawer')).not.toHaveClass('w-0');

    // Switch to Bible tab
    fireEvent.click(screen.getByTestId('canva-tab-bible'));
    expect(screen.getByTestId('canva-secondary-drawer')).not.toHaveClass('w-0');
  });

  it('selects a different page and adds a new page from bottom filmstrip', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Select page 2
    const card2 = screen.getByTestId('canva-page-card-2');
    const card2Btn = card2.querySelector('[role="button"]')!;
    expect(card2Btn).toHaveClass('w-[58px]', 'h-[82px]');
    fireEvent.click(card2Btn);
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('2 / 6');

    // Add new page 7
    fireEvent.click(screen.getByTestId('canva-add-page-btn'));
    expect(screen.getByTestId('canva-page-card-7')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('7 / 7');
  });

  it('displays continuous script across pages by default and supports syncing to current page', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Open Script tab -> defaults to continuous ("xuyên suốt") view showing Page 1 & Page 2
    fireEvent.click(screen.getByTestId('canva-tab-script'));
    expect(screen.getByText(/── TRANG 1 ──/i)).toBeInTheDocument();
    expect(screen.getByText(/── TRANG 2 ──/i)).toBeInTheDocument();
    expect(screen.getByTestId('script-line-line-1')).toBeInTheDocument();
    expect(screen.getByTestId('script-line-line-6')).toBeInTheDocument();

    // Filter to current page mode -> shows Page 1 only, then updates to Page 2 when page 2 selected
    fireEvent.click(screen.getByTestId('canva-script-mode-current-page'));
    expect(screen.getByTestId('script-line-line-1')).toBeInTheDocument();
    expect(screen.queryByTestId('script-line-line-6')).not.toBeInTheDocument();

    const card2 = screen.getByTestId('canva-page-card-2');
    fireEvent.click(card2.querySelector('[role="button"]')!);
    expect(screen.getByText(/── TRANG 2 ──/i)).toBeInTheDocument();
    expect(screen.getByTestId('script-line-line-6')).toBeInTheDocument();
    expect(screen.queryByTestId('script-line-line-1')).not.toBeInTheDocument();
  });
});

describe('ArtistDeskView - Real API Series Bible & Continuous Script Integration', () => {
  it('fetches real Series Bible and Script across pages and panels without card boxes', async () => {
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValueOnce({
      id: 'ser-real',
      workspaceId: 'ws-1',
      title: 'Huyền Thoại Phương Đông',
      readingDirection: 0,
      genre: 'Action',
      format: 'Manga',
      createdAt: '2026-01-01T00:00:00Z',
      chaptersCount: 1,
      chapters: [],
    });

    vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValueOnce({
      items: [
        {
          id: 'chap-real-1',
          seriesId: 'ser-real',
          chapterNumber: 1,
          title: 'Khởi Hành Lúc Bình Minh',
          versionVector: 1,
          createdAt: '2026-01-01T00:00:00Z',
          scenesCount: 1,
          pagesCount: 2,
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 20,
      totalPages: 1,
    });

    vi.spyOn(bibleService, 'getSeriesBible').mockResolvedValueOnce({
      id: 'bible-real',
      seriesId: 'ser-real',
      workspaceId: 'ws-1',
      name: 'Huyền Thoại Phương Đông',
      version: 1,
      entries: [
        {
          id: 'char-kuro',
          seriesBibleId: 'bible-real',
          category: 'Character',
          code: 'CHAR-01',
          name: 'Kurogane',
          subtitle: 'Thợ Rèn Kiếm',
          description: 'Thợ rèn ẩn danh mang cánh tay máy.',
          detailsJson: JSON.stringify({
            attributes: {
              appearance: 'Tóc bạc cắt ngắn, áo choàng đen',
            },
            visualNotes: ['Vết sẹo chữ X ở cổ tay trái'],
          }),
          referenceImageUrl: 'https://example.com/kurogane.png',
          priority: 'CanonCritical',
          strictCheck: true,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          effectiveRevision: {
            id: 'rev-1',
            bibleEntryId: 'char-kuro',
            versionNumber: 1,
            summary: 'Bản canon đầu tiên',
            snapshotJson: '{}',
            contentHash: 'hash-1',
            effectiveFromChapterNumber: 1,
            isInitialVersion: true,
            createdAt: '2026-01-01T00:00:00Z',
            reviewStatus: 'CanonLocked',
          },
        },
      ],
    });

    vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValueOnce([
      {
        id: 'pg-1',
        chapterId: 'chap-real-1',
        pageNumber: 1,
        layoutFormat: 'B5',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 1,
      },
      {
        id: 'pg-2',
        chapterId: 'chap-real-1',
        pageNumber: 2,
        layoutFormat: 'B5',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 1,
      },
    ]);

    vi.spyOn(panelService, 'getPanelsByPage').mockImplementation(async (pageId: string) => {
      if (pageId === 'pg-1') {
        return [
          {
            id: 'pnl-1-1',
            pageId: 'pg-1',
            panelNumber: 1,
            boundingBox: '{}',
            readingOrder: 1,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ];
      }
      if (pageId === 'pg-2') {
        return [
          {
            id: 'pnl-2-2',
            pageId: 'pg-2',
            panelNumber: 2,
            boundingBox: '{}',
            readingOrder: 2,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ];
      }
      return [];
    });

    vi.spyOn(scriptLineService, 'getScenesByChapter').mockResolvedValueOnce([
      {
        id: 'sc-real-1',
        chapterId: 'chap-real-1',
        sceneNumber: 1,
        heading: 'Lò Rèn Bên Vách Núi',
        slugline: 'NỘI · LÒ RÈN · BÌNH MINH',
        createdAt: '2026-01-01T00:00:00Z',
        scriptLinesCount: 3,
        pagesCount: 2,
      },
    ]);

    vi.spyOn(scriptLineService, 'getSceneById').mockResolvedValueOnce({
      id: 'sc-real-1',
      chapterId: 'chap-real-1',
      sceneNumber: 1,
      heading: 'Lò Rèn Bên Vách Núi',
      slugline: 'NỘI · LÒ RÈN · BÌNH MINH',
      createdAt: '2026-01-01T00:00:00Z',
      scriptLines: [
        {
          id: 'ln-1',
          lineOrder: 1,
          stageDirection: 'Tia lửa bắn tung toé trên mặt đe.',
          dialogueText: 'Thanh kiếm này vẫn chưa đủ sắc.',
          speakerCharacterId: 'char-kuro',
          panelId: 'pnl-1-1',
          narrationMode: 'Present',
        },
        {
          id: 'ln-2',
          lineOrder: 2,
          dialogueText: 'Chúng ta cần thêm tinh thể băng.',
          speakerCharacterId: 'char-kuro',
          panelId: 'pnl-2-2',
          narrationMode: 'Flashback',
        },
        {
          id: 'ln-3',
          lineOrder: 3,
          stageDirection: 'Cảnh chuyển sang bầu trời đầy mây xám (chưa gán trang).',
          speakerCharacterId: null,
          panelId: null,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-real/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Open Script tab
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    await waitFor(() => {
      expect(screen.getByTestId('script-line-ln-1')).toBeInTheDocument();
    });

    // Verify continuous pages & panels layout
    expect(screen.getByText(/── TRANG 1 ──/i)).toBeInTheDocument();
    expect(screen.getByText(/── TRANG 2 ──/i)).toBeInTheDocument();
    expect(screen.getByTestId('script-panel-section-1-1')).toBeInTheDocument();
    expect(screen.getByTestId('script-panel-section-2-2')).toBeInTheDocument();
    // Character name resolved from Bible entry ID
    expect(screen.getAllByText('Kurogane').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Thanh kiếm này vẫn chưa đủ sắc\./i)).toBeInTheDocument();
    expect(screen.getByText(/Chúng ta cần thêm tinh thể băng\./i)).toBeInTheDocument();
    // Unpaged line still flows cleanly under unpaged scene section
    expect(screen.getByTestId('script-unpaged-scenes')).toBeInTheDocument();
    expect(screen.getByText(/Cảnh chuyển sang bầu trời đầy mây xám/i)).toBeInTheDocument();

    // Open Series Bible tab & verify parsed visualNotes + image + CanonLocked badge
    fireEvent.click(screen.getByTestId('canva-tab-bible'));
    await waitFor(() => {
      expect(screen.getByTestId('bible-entity-char-kuro')).toBeInTheDocument();
    });
    expect(screen.getByText('Thợ rèn ẩn danh mang cánh tay máy.')).toBeInTheDocument();
    expect(screen.getByText('Ngoại hình: Tóc bạc cắt ngắn, áo choàng đen')).toBeInTheDocument();
    expect(screen.getByText('Vết sẹo chữ X ở cổ tay trái')).toBeInTheDocument();
    expect(screen.getByText('Đã chốt')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/kurogane.png');
  });
});

describe('ArtistDeskView - Header Colors, Stage Progression & Series/Chapter Paths', () => {
  it('displays system warm-paper header with series link, chapter switcher, and advances Pencil -> Ink -> Letter on Submit', async () => {
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({
      id: 'ser-1',
      workspaceId: 'ws-1',
      title: 'Kiếm Sĩ Phương Đông',
      readingDirection: 0,
      genre: 'Action',
      format: 'Manga',
      createdAt: '2026-01-01T00:00:00Z',
      chaptersCount: 2,
      chapters: [],
    });

    vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValue({
      items: [
        {
          id: 'chap-1',
          seriesId: 'ser-1',
          chapterNumber: 1,
          title: 'Khởi Hành',
          versionVector: 1,
          createdAt: '2026-01-01T00:00:00Z',
          scenesCount: 1,
          pagesCount: 1,
        },
        {
          id: 'chap-2',
          seriesId: 'ser-1',
          chapterNumber: 2,
          title: 'Cơn Bão Đêm',
          versionVector: 1,
          createdAt: '2026-01-02T00:00:00Z',
          scenesCount: 1,
          pagesCount: 1,
        },
      ],
      totalCount: 2,
      pageIndex: 1,
      pageSize: 20,
      totalPages: 1,
    });

    vi.spyOn(pipelineService, 'getSeriesPipeline').mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'ser-1',
      name: 'Quy trình chuẩn',
      stages: [
        {
          id: 'st-script',
          name: 'Kịch bản (Script)',
          slug: 'script',
          stageOrder: 1,
          allowedRole: 'Writer',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-pencil',
          name: 'Nét chì (Pencil)',
          slug: 'pencil',
          stageOrder: 2,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-ink',
          name: 'Đi nét mực (Ink)',
          slug: 'ink',
          stageOrder: 3,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-dialogue',
          name: 'Dialogue',
          slug: 'lettering',
          stageOrder: 4,
          allowedRole: 'Letterer',
          isApprovalGate: true,
          isInitial: false,
          isTerminal: true,
          isEnabled: true,
        },
      ],
      transitions: [],
    });

    vi.spyOn(assignmentService, 'getAssignments').mockResolvedValue([
      {
        id: 'assign-pencil',
        seriesId: 'ser-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'st-pencil',
        assigneeUserId: 'user-1',
        assignedRole: 'ARTIST',
        brief: 'Vẽ chương 1',
        status: 'InProgress',
        priority: 'Medium',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    const submitSpy = vi
      .spyOn(assignmentService, 'submitAssignment')
      .mockResolvedValue({
        id: 'assign-pencil',
        seriesId: 'ser-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'st-pencil',
        assigneeUserId: 'user-1',
        assignedRole: 'ARTIST',
        brief: 'Vẽ chương 1',
        status: 'Submitted',
        priority: 'Medium',
        createdAt: '2026-01-01T00:00:00Z',
      });

    const pagesSpy = vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/chapters/chap-1/artist']}>
        <Routes>
          <Route
            element={
              <FocusWorkspaceLayout
                currentUser={{
                  name: 'Họa Sĩ A',
                  role: 'USER',
                  workspaceRole: 'ARTIST' as any,
                  activeRoles: ['ARTIST'],
                  avatarInitials: 'HA',
                }}
              />
            }
          >
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/chapters/:chapterId/artist'
              element={<ArtistDeskView workspaceRole='ARTIST' />}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Only a single system-colored header renders
    const headers = screen.getAllByTestId('focus-studio-header');
    expect(headers).toHaveLength(1);
    expect(headers[0]).toHaveClass('bg-[#FCFBF8]/95', 'border-[#D8D2C5]');

    // Wait for Series title, Chapter select, and Artist stages to load
    await waitFor(() => {
      expect(screen.getByTestId('focus-series-link')).toHaveTextContent('Kiếm Sĩ Phương Đông');
    });
    expect(screen.getByTestId('focus-series-link')).toHaveAttribute(
      'href',
      '/workspaces/ws-1/series/ser-1/artist',
    );

    const chapterSelect = await screen.findByTestId('focus-chapter-select');
    expect(chapterSelect).toHaveValue('chap-1');
    expect(chapterSelect).toHaveTextContent('Chương 1: Khởi Hành');
    expect(chapterSelect).toHaveTextContent('Chương 2: Cơn Bão Đêm');

    // Stage stepper displays strictly 3 stages: Pencil -> Ink -> Letter
    await waitFor(() => {
      expect(screen.getByTestId('focus-stage-step-0')).toHaveTextContent('Pencil');
    });
    expect(screen.getByTestId('focus-stage-step-1')).toHaveTextContent('Ink');
    expect(screen.getByTestId('focus-stage-step-2')).toHaveTextContent('Letter');
    expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute('data-stage-state', 'current');
    expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute('data-stage-state', 'upcoming');
    expect(screen.getByTestId('focus-stage-step-2')).toHaveAttribute('data-stage-state', 'upcoming');
    expect(screen.queryByText(/SHA-256|CAS|DPI|Canon|Zen Mode/i)).not.toBeInTheDocument();

    // Submit 1: Pencil -> Ink
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith('chap-1', 'assign-pencil');
      expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute('data-stage-state', 'completed');
      expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute('data-stage-state', 'current');
    });

    // Submit 2: Ink -> Letter
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute('data-stage-state', 'completed');
      expect(screen.getByTestId('focus-stage-step-2')).toHaveAttribute('data-stage-state', 'current');
    });

    // Submit 3: Letter -> Completed
    expect(screen.getByTestId('focus-submit-stage-btn')).toHaveTextContent('Nộp hoàn thiện');
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-stage-completed-badge')).toHaveTextContent('Đã nộp chờ duyệt');
    });

    // Switching chapter reloads the selected chapter
    fireEvent.change(screen.getByTestId('focus-chapter-select'), { target: { value: 'chap-2' } });
    await waitFor(() => {
      expect(pagesSpy).toHaveBeenCalledWith('chap-2');
    });
  });
});

describe('ArtistDeskView - Panel Template Tab Effective on Current Page', () => {
  it('applies selected template immediately on the currently selected page only', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Initially blank paper has no template overlay
    expect(screen.queryByTestId('canvas-panel-template-overlay')).not.toBeInTheDocument();

    // Open Templates tab and select 3 Khung Shonen for Page 1
    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    expect(screen.getByTestId('canva-drawer-templates')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-000000000004'));

    // Page 1 sheet now renders 3 panels
    expect(screen.getByTestId('canvas-panel-template-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-2')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-3')).toBeInTheDocument();

    // Switch to Page 2 -> Page 2 is still blank until user applies template to Page 2
    const card2 = screen.getByTestId('canva-page-card-2');
    fireEvent.click(card2.querySelector('[role="button"]')!);
    expect(screen.queryByTestId('canvas-panel-template-overlay')).not.toBeInTheDocument();

    // Apply 4 Khung Yonkoma to Page 2
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(screen.getByTestId('canvas-panel-frame-4')).toBeInTheDocument();

    // Clear template on Page 2 -> Page 2 returns to blank, while Page 1 keeps its 3-panel template
    fireEvent.click(screen.getByTestId('canva-btn-clear-template'));
    expect(screen.queryByTestId('canvas-panel-template-overlay')).not.toBeInTheDocument();

    const card1 = screen.getByTestId('canva-page-card-1');
    fireEvent.click(card1.querySelector('[role="button"]')!);
    expect(screen.getByTestId('canvas-panel-template-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-3')).toBeInTheDocument();
  });

  it('fetches workspace frame templates and calls applyFrameTemplate API for real backend page', async () => {
    const pageGuid = '11111111-1111-1111-1111-111111111111';
    const chapGuid = '22222222-2222-2222-2222-222222222222';
    const tplGuid = '33333333-3333-3333-3333-333333333333';

    vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValueOnce({
      items: [
        {
          id: chapGuid,
          seriesId: 'ser-real',
          chapterNumber: 1,
          title: 'Chương 1',
          versionVector: 1,
          createdAt: '2026-01-01T00:00:00Z',
          scenesCount: 0,
          pagesCount: 1,
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 20,
      totalPages: 1,
    });

    vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValueOnce([
      {
        id: pageGuid,
        chapterId: chapGuid,
        pageNumber: 1,
        layoutFormat: 'B5',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 0,
      },
    ]);

    vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValueOnce([]);

    vi.spyOn(frameTemplateService, 'getFrameTemplates').mockResolvedValueOnce([
      {
        id: tplGuid,
        workspaceId: 'ws-real',
        name: 'Mẫu 2 Khung API',
        layoutFormat: 'StandardPage',
        isBuiltIn: false,
        panelCount: 2,
        slots: [
          { x: 0.05, y: 0.05, w: 0.9, h: 0.4, borderless: false },
          { x: 0.05, y: 0.5, w: 0.9, h: 0.45, borderless: true },
        ],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    const applySpy = vi.spyOn(frameTemplateService, 'applyFrameTemplate').mockResolvedValueOnce([
      {
        id: 'created-pnl-1',
        pageId: pageGuid,
        panelNumber: 1,
        boundingBox: JSON.stringify({ normalized: { x: 0.05, y: 0.05, w: 0.9, h: 0.4 } }),
        readingOrder: 1,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'created-pnl-2',
        pageId: pageGuid,
        panelNumber: 2,
        boundingBox: JSON.stringify({
          normalized: { x: 0.05, y: 0.5, w: 0.9, h: 0.45 },
          borderless: true,
        }),
        readingOrder: 2,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-real/series/ser-real/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('canva-tab-templates'));

    await waitFor(() => {
      expect(screen.getByTestId(`canva-template-card-${tplGuid}`)).toBeInTheDocument();
      expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('1 / 1');
    });

    fireEvent.click(screen.getByTestId(`canva-template-card-${tplGuid}`));

    // Save layout to persist on server
    fireEvent.click(screen.getByTestId('canvas-btn-save-layout'));

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledWith(pageGuid, tplGuid);
    });
    expect(screen.getByTestId('canvas-panel-frame-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-2')).toBeInTheDocument();
  });

  it('enforces layout locking before uploading artworks and guards re-templating with confirmation modal', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Open templates tab and select 3 Khung Shonen for Page 1
    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-000000000004'));

    // Verify draft status bar is rendered underneath the canvas
    expect(screen.getByTestId('canvas-bottom-layout-bar')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-layout-status-bar')).toBeInTheDocument();
    expect(screen.getByText(/Bản nháp bố cục/i)).toBeInTheDocument();
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeInTheDocument();

    // In draft mode, panels display "Chưa lưu bố cục", dropzone is NOT accessible
    expect(screen.queryByTestId('panel-dropzone-1')).not.toBeInTheDocument();
    expect(screen.getAllByText('Chưa lưu bố cục')[0]).toBeInTheDocument();

    // Verify smooth template switching in draft mode (switch to 4-Koma without any modal blocking)
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(screen.getByTestId('canvas-panel-frame-4')).toBeInTheDocument();

    // Switch back to 3 Khung Shonen
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-000000000004'));
    expect(screen.getByTestId('canvas-panel-frame-3')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-panel-frame-4')).not.toBeInTheDocument();

    // Verify page switching persistence: switch to Page 2 then back to Page 1
    const card2 = screen.getByTestId('canva-page-card-2');
    fireEvent.click(card2.querySelector('[role="button"]') || card2);
    expect(screen.queryByTestId('canvas-panel-template-overlay')).not.toBeInTheDocument();

    // Return to Page 1 -> 3-panel template is still preserved
    const card1 = screen.getByTestId('canva-page-card-1');
    fireEvent.click(card1.querySelector('[role="button"]') || card1);
    expect(screen.getByTestId('canvas-panel-frame-3')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeInTheDocument();

    // Save layout (located underneath the artwork frame)
    fireEvent.click(screen.getByTestId('canvas-btn-save-layout'));

    // Status bar changes to saved / locked
    expect(screen.getByText(/Đã lưu bố cục/i)).toBeInTheDocument();
    expect(screen.getByTestId('canvas-btn-unlock-layout')).toBeInTheDocument();

    // Dropzone is now enabled for each panel
    expect(screen.getByTestId('panel-dropzone-1')).toBeInTheDocument();
    expect(screen.getByTestId('panel-dropzone-2')).toBeInTheDocument();
    expect(screen.getByTestId('panel-dropzone-3')).toBeInTheDocument();

    // Simulate uploading artwork by dropping a mock image file onto panel 1 dropzone
    const mockFile = new File(['artwork content'], 'panel1-sketch.png', { type: 'image/png' });
    fireEvent.drop(screen.getByTestId('panel-dropzone-1'), {
      dataTransfer: { files: [mockFile] },
    });

    // Panel 1 now displays the artwork image and action buttons (view, replace, remove)
    await waitFor(() => {
      expect(screen.getByAltText('panel1-sketch.png')).toBeInTheDocument();
      expect(screen.getByTestId('panel-btn-view-1')).toBeInTheDocument();
      expect(screen.getByTestId('panel-btn-replace-1')).toBeInTheDocument();
      expect(screen.getByTestId('panel-btn-remove-1')).toBeInTheDocument();
    });

    // When artist tries to unlock while page has artwork, confirmation modal appears
    fireEvent.click(screen.getByTestId('canvas-btn-unlock-layout'));
    expect(screen.getByTestId('modal-unlock-layout-confirm')).toBeInTheDocument();
    expect(screen.getByText(/Mở khóa đổi mẫu khung trang\?/i)).toBeInTheDocument();

    // Cancel preserves locked layout and artwork
    fireEvent.click(screen.getByTestId('btn-cancel-unlock'));
    expect(screen.queryByTestId('modal-unlock-layout-confirm')).not.toBeInTheDocument();
    expect(screen.getByAltText('panel1-sketch.png')).toBeInTheDocument();

    // Confirm unlock resets artwork and returns to draft template selection
    fireEvent.click(screen.getByTestId('canvas-btn-unlock-layout'));
    fireEvent.click(screen.getByTestId('btn-confirm-unlock'));
    expect(screen.queryByTestId('modal-unlock-layout-confirm')).not.toBeInTheDocument();
    expect(screen.getByText(/Bản nháp bố cục/i)).toBeInTheDocument();
    expect(screen.queryByAltText('panel1-sketch.png')).not.toBeInTheDocument();
  });
});

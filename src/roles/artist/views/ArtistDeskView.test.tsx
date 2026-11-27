import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';
import { chapterService } from '@/services/chapter.service';
import { chapterEditionService } from '@/services/chapter-edition.service';
import { elementService } from '@/services/element.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { assignmentService } from '@/services/assignment.service';
import { frameTemplateService } from '@/services/frameTemplate.service';
import { artworkService } from '@/services/artwork.service';
import { FocusWorkspaceLayout } from '@/app/FocusWorkspaceLayout';
import { ToastProvider } from '@/shared/context/ToastContext';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';
import { beforeEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(assignmentService, 'getAssignments').mockResolvedValue([]);
  vi.spyOn(assignmentService, 'getChangeRequests').mockResolvedValue([]);
  vi.spyOn(chapterEditionService, 'getChapterEditions').mockResolvedValue([]);
});

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

    // Left Sidebar (ArtistCanvaSidebar) exists with Pages, Script, and Bible tabs (Stitch rail)
    expect(screen.getByTestId('artist-desk-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-pages')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();
    expect(screen.getByTestId('canva-secondary-drawer')).not.toHaveClass('w-0');
    expect(screen.getByTestId('canva-drawer-script')).toBeInTheDocument();

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

    // Script is the default drawer on Artist Desk.
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
    expect(card2Btn).toHaveClass('w-7', 'h-8');
    fireEvent.click(card2Btn);
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('2 / 6');

    // Add new page 7
    fireEvent.click(screen.getByTestId('canva-add-page-btn'));
    expect(screen.getByTestId('canva-page-card-7')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('7 / 7');
  });

  it('renumbers remaining pages immediately after deleting an earlier page', async () => {
    const deleteSpy = vi.spyOn(pageService, 'deletePage').mockResolvedValue({ message: 'ok' });

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

    fireEvent.click(within(screen.getByTestId('canva-page-card-1')).getByTitle('Xóa trang'));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('page-default-1'));
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('1 / 5');
    expect(screen.getByTestId('canva-page-card-5')).toBeInTheDocument();
    expect(screen.queryByTestId('canva-page-card-6')).not.toBeInTheDocument();
  });

  it('defaults script to the current page and supports the full chapter mode', () => {
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

    // Script opens by default on the page currently being drawn.
    expect(screen.getByTestId('canva-script-mode-current-page')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('script-line-line-1')).toBeInTheDocument();
    expect(screen.queryByTestId('script-line-line-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('canva-script-mode-all'));
    expect(screen.getByTestId('script-line-line-6')).toBeInTheDocument();

    // Filter to current page mode -> shows Page 1 only, then updates to Page 2 when page 2 selected
    fireEvent.click(screen.getByTestId('canva-script-mode-current-page'));
    expect(screen.getByTestId('script-line-line-1')).toBeInTheDocument();
    expect(screen.queryByTestId('script-line-line-6')).not.toBeInTheDocument();

    const card2 = screen.getByTestId('canva-page-card-2');
    fireEvent.click(card2.querySelector('[role="button"]')!);
    expect(screen.getByTestId('script-panel-section-2-1')).toBeInTheDocument();
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
            stageName: 'Mặc định',
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
          speakerLabel: 'char-kuro',
          panelId: 'pnl-1-1',
          narrationMode: 'Present',
        },
        {
          id: 'ln-2',
          lineOrder: 2,
          dialogueText: 'Chúng ta cần thêm tinh thể băng.',
          speakerLabel: 'char-kuro',
          panelId: 'pnl-2-2',
          narrationMode: 'Flashback',
        },
        {
          id: 'ln-3',
          lineOrder: 3,
          stageDirection: 'Cảnh chuyển sang bầu trời đầy mây xám (chưa gán trang).',
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

    await waitFor(() => {
      expect(screen.getByTestId('script-line-ln-1')).toBeInTheDocument();
    });

    // Opt into the full chapter before verifying cross-page and unpaged content.
    fireEvent.click(screen.getByTestId('canva-script-mode-all'));
    expect(screen.getByTestId('script-panel-section-1-1')).toBeInTheDocument();
    expect(screen.getByTestId('script-panel-section-2-2')).toBeInTheDocument();
    // Character name resolved from Bible entry ID
    expect(screen.getAllByText('Kurogane').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Thanh kiếm này vẫn chưa đủ sắc\./i)).toBeInTheDocument();
    expect(screen.getByText(/Chúng ta cần thêm tinh thể băng\./i)).toBeInTheDocument();
    // Unpaged line still flows cleanly under unpaged scene section
    expect(screen.getByTestId('script-unpaged-scenes')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Cảnh chuyển sang bầu trời đầy mây xám/i).length,
    ).toBeGreaterThanOrEqual(1);

    // Open Series Bible tab & verify parsed visualNotes + image + CanonLocked badge
    fireEvent.click(screen.getByTestId('canva-tab-bible'));
    await waitFor(() => {
      expect(screen.getByTestId('bible-entity-char-kuro')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Thợ rèn ẩn danh mang cánh tay máy.').length).toBeGreaterThan(0);
    expect(screen.getByText('Ngoại hình: Tóc bạc cắt ngắn, áo choàng đen')).toBeInTheDocument();
    expect(screen.getByText('Vết sẹo chữ X ở cổ tay trái')).toBeInTheDocument();
    expect(screen.getByText('Đã chốt')).toBeInTheDocument();
    expect(screen.getByTestId('bible-entity-char-kuro').querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/kurogane.png',
    );
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
      {
        id: 'assign-ink',
        seriesId: 'ser-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'st-ink',
        assigneeUserId: 'user-1',
        assignedRole: 'ARTIST',
        brief: 'Đi nét chương 1',
        status: 'Assigned',
        priority: 'Medium',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'assign-letter',
        seriesId: 'ser-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'st-dialogue',
        assigneeUserId: 'user-1',
        assignedRole: 'ARTIST',
        brief: 'Đặt chữ chương 1',
        status: 'Assigned',
        priority: 'Medium',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    const submitSpy = vi.spyOn(assignmentService, 'submitAssignment').mockResolvedValue({
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
    expect(headers[0]).toHaveClass('bg-white', 'border-stone-200');

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
    expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute(
      'data-stage-state',
      'upcoming',
    );
    expect(screen.getByTestId('focus-stage-step-2')).toHaveAttribute(
      'data-stage-state',
      'upcoming',
    );
    fireEvent.click(screen.getByTestId('focus-stage-step-2'));
    expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute('data-stage-state', 'current');
    expect(screen.queryByText(/SHA-256|CAS|DPI|Canon|Zen Mode/i)).not.toBeInTheDocument();

    // Submit 1: Pencil -> Ink
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith('chap-1', 'assign-pencil');
      expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute(
        'data-stage-state',
        'completed',
      );
      expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute(
        'data-stage-state',
        'current',
      );
    });

    // Stage status bar is read-only: clicking previous Pencil stage must NOT revert from Ink
    expect(screen.getByTestId('focus-stage-step-0')).not.toHaveClass('cursor-pointer');
    fireEvent.click(screen.getByTestId('focus-stage-step-0'));
    expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute(
      'data-stage-state',
      'completed',
    );
    expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute('data-stage-state', 'current');

    // Submit 2: Ink -> Letter
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-stage-step-1')).toHaveAttribute(
        'data-stage-state',
        'completed',
      );
      expect(screen.getByTestId('focus-stage-step-2')).toHaveAttribute(
        'data-stage-state',
        'current',
      );
    });

    // Submit 3: Letter -> Completed
    expect(screen.getByTestId('focus-submit-stage-btn')).toHaveTextContent('Nộp bản thảo');
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-stage-completed-badge')).toHaveTextContent(
        'Đã nộp chờ duyệt',
      );
    });

    // Switching chapter reloads the selected chapter
    fireEvent.change(screen.getByTestId('focus-chapter-select'), { target: { value: 'chap-2' } });
    await waitFor(() => {
      expect(pagesSpy).toHaveBeenCalledWith('chap-2');
    });
  });

  it('warns instead of advancing when the active stage has no matching assignment', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
              />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));

    expect(await screen.findByText('Không thể nộp công đoạn')).toBeInTheDocument();
    expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute('data-stage-state', 'current');
  });

  it('Letterer desk opens on the grid cell assigned to the viewer and does not report success when submit is rejected', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'letterer-1' }));
    vi.spyOn(pipelineService, 'getSeriesPipeline').mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'ser-1',
      name: 'Quy trình chuẩn',
      stages: [
        {
          id: 'st-pencil',
          name: 'Pencil',
          slug: 'pencil',
          stageOrder: 1,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-ink',
          name: 'Ink',
          slug: 'ink',
          stageOrder: 2,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-letter',
          name: 'Lettering',
          slug: 'lettering',
          stageOrder: 3,
          allowedRole: 'Letterer',
          isApprovalGate: true,
          isInitial: false,
          isTerminal: true,
          isEnabled: true,
        },
      ],
      transitions: [],
    } as any);
    const cell = (id: string, stage: string, assignee: string, status: string) => ({
      id,
      pipelineStageId: stage,
      pageId: null,
      status,
      lotId: `lot-${id}`,
      assigneeUserId: assignee,
      isInputOutdated: false,
      isStartable: true,
      rowVersion: 1,
    });
    vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
      chapterId: 'chap-1',
      stages: [],
      pages: [],
      lots: [],
      tasks: [
        cell('c-pencil', 'st-pencil', 'artist-1', 'InProgress'),
        cell('c-letter', 'st-letter', 'letterer-1', 'Assigned'),
      ],
    } as any);
    vi.spyOn(assignmentService, 'startStageTask').mockResolvedValue(undefined as any);
    const submitSpy = vi
      .spyOn(assignmentService, 'submitStageTasks')
      .mockRejectedValue(new Error('Bạn không phải người nhận ô này.'));

    try {
      render(
        <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/letterer?chapterId=chap-1']}>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route
                  path='/workspaces/:workspaceId/series/:seriesId/letterer'
                  element={
                    <ArtistDeskView
                      workspaceRole='LETTERER'
                      initialScriptLines={[]}
                      initialSidebarTab='lettering'
                    />
                  }
                />
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </MemoryRouter>,
      );

      // Không bị kéo vào ô Pencil của Artist khác: Desk mở đúng ô Letter của người xem.
      await waitFor(() =>
        expect(screen.getByTestId('focus-stage-step-2')).toHaveAttribute(
          'data-stage-state',
          'current',
        ),
      );

      fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));
      expect(await screen.findByText('Không nộp được công đoạn')).toBeInTheDocument();
      expect(submitSpy).toHaveBeenCalledWith('chap-1', ['c-letter']);
      expect(screen.queryByTestId('focus-stage-completed-badge')).not.toBeInTheDocument();
    } finally {
      localStorage.removeItem('user');
    }
  });

  it('shows script coverage and blocks Submit Pencil below 100%', async () => {
    vi.spyOn(assignmentService, 'getAssignments').mockResolvedValue([
      {
        id: 'assign-pencil',
        seriesId: 'ser-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'stage-pencil',
        assigneeUserId: 'user-1',
        assignedRole: 'ARTIST',
        brief: 'Vẽ chì',
        status: 'InProgress',
        priority: 'Medium',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const submitSpy = vi.spyOn(assignmentService, 'submitAssignment');

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={
                  <ArtistDeskView
                    workspaceRole='ARTIST'
                    initialScriptLines={[
                      { id: 'line-1', dialogueText: 'Đã gán', panelId: 'panel-1' },
                      { id: 'line-2', dialogueText: 'Chưa gán' },
                    ]}
                  />
                }
              />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('artist-script-coverage')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));

    expect(await screen.findByText('Chưa thể nộp Pencil')).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
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
          status: 'InProduction',
          isScriptFrozen: true,
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

    const savedPanels = [
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
    ];
    vi.spyOn(panelService, 'getPanelsByPage')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(savedPanels);

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

    const getArtworksSpy = vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);

    const applySpy = vi.spyOn(frameTemplateService, 'applyFrameTemplate').mockResolvedValueOnce({
      panels: savedPanels,
      unassignedArtworkCount: 2,
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/workspaces/ws-real/series/ser-real/artist']}>
          <Routes>
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/artist'
              element={<ArtistDeskView workspaceRole='ARTIST' />}
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
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
      expect(panelService.getPanelsByPage).toHaveBeenCalledTimes(2);
      expect(getArtworksSpy).toHaveBeenCalledWith(chapGuid, pageGuid, undefined);
    });
    expect(screen.getByText('2 tranh chưa có khung')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-2')).toBeInTheDocument();
  });

  it('keeps a panel image added before saving and uploads it to the saved panel on save', async () => {
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
          status: 'InProduction',
          isScriptFrozen: true,
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
    const savedPanels = [1, 2].map((n) => ({
      id: `created-pnl-${n}`,
      pageId: pageGuid,
      panelNumber: n,
      boundingBox: JSON.stringify({
        normalized: { x: 0.05, y: n === 1 ? 0.05 : 0.5, w: 0.9, h: 0.4 },
      }),
      readingOrder: n,
      createdAt: '2026-01-01T00:00:00Z',
    }));
    vi.spyOn(panelService, 'getPanelsByPage')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(savedPanels);
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
          { x: 0.05, y: 0.5, w: 0.9, h: 0.4, borderless: false },
        ],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
    vi.spyOn(frameTemplateService, 'applyFrameTemplate').mockResolvedValueOnce({
      panels: savedPanels,
      unassignedArtworkCount: 0,
    });
    const uploadSpy = vi.spyOn(artworkService, 'uploadArtwork').mockResolvedValue({} as any);
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['png'], { type: 'image/png' }),
      json: async () => ({}),
    })) as any;

    try {
      render(
        <ToastProvider>
          <MemoryRouter initialEntries={['/workspaces/ws-real/series/ser-real/artist']}>
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={<ArtistDeskView workspaceRole='ARTIST' />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );
      fireEvent.click(screen.getByTestId('canva-tab-templates'));
      await waitFor(() => {
        expect(screen.getByTestId(`canva-template-card-${tplGuid}`)).toBeInTheDocument();
        expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('1 / 1');
      });
      fireEvent.click(screen.getByTestId(`canva-template-card-${tplGuid}`));

      // Bố cục nháp: nạp ảnh vào khung 2 → giữ ở máy, chưa gọi server
      fireEvent.drop(await screen.findByTestId('panel-dropzone-2'), {
        dataTransfer: { files: [new File(['art'], 'panel2-new.png', { type: 'image/png' })] },
      });
      expect(await screen.findByAltText('panel2-new.png')).toBeInTheDocument();
      expect(
        screen.getByText('Đã nạp panel2-new.png vào Khung #2. Ảnh sẽ được tải lên khi lưu bố cục.'),
      ).toBeInTheDocument();
      expect(uploadSpy).not.toHaveBeenCalled();

      // Lưu bố cục → ảnh được tải lên đúng khung đã lưu cùng vị trí
      fireEvent.click(screen.getByTestId('canvas-btn-save-layout'));
      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledTimes(1);
      });
      const [chapterId, pageId, file, , , , panelId] = uploadSpy.mock.calls[0];
      expect([chapterId, pageId, panelId]).toEqual([chapGuid, pageGuid, 'created-pnl-2']);
      expect((file as File).name).toBe('panel2-new.png');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('keeps artwork mapped by reading order when re-templating and marks layout dirty again', async () => {
    render(
      <ConfirmProvider>
        <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
          <Routes>
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/artist'
              element={<ArtistDeskView workspaceRole='ARTIST' />}
            />
          </Routes>
        </MemoryRouter>
      </ConfirmProvider>,
    );

    // Open templates tab and select 3 Khung Shonen for Page 1
    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-000000000004'));

    // Verify Lucian-style save button is rendered at bottom-right beside the sheet
    expect(screen.getByTestId('artist-layout-toolbar')).toBeInTheDocument();
    const saveBtn = screen.getByTestId('canvas-btn-save-layout');
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveTextContent('Lưu bố cục');

    // Bố cục nháp: khung trống đã là giấy trắng kèm ô nạp ảnh (ảnh giữ ở máy tới khi lưu)
    expect(screen.getByTestId('panel-dropzone-1')).toBeEnabled();

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

    // Return to Page 1 -> 3-panel template is still preserved and save button remains visible
    const card1 = screen.getByTestId('canva-page-card-1');
    fireEvent.click(card1.querySelector('[role="button"]') || card1);
    expect(screen.getByTestId('canvas-panel-frame-3')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeInTheDocument();

    // Save layout (lucian button) -> saves and button turns off (disappears)
    fireEvent.click(screen.getByTestId('canvas-btn-save-layout'));

    expect(screen.getByTestId('canvas-btn-save-layout')).toBeDisabled();

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

    // Switch to templates tab to select another template
    fireEvent.click(screen.getByTestId('canva-tab-templates'));

    // When artist tries to switch template while page has artwork, confirmation modal appears
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(await screen.findByText('Đổi mẫu khung và giữ tranh?')).toBeInTheDocument();

    // Cancel preserves locked layout and artwork
    fireEvent.click(screen.getByRole('button', { name: 'Giữ bố cục hiện tại' }));
    expect(screen.getByAltText('panel1-sketch.png')).toBeInTheDocument();

    // Confirm unlock resets artwork and returns to draft template selection -> Save button reappears
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    fireEvent.click(await screen.findByRole('button', { name: 'Đổi mẫu khung' }));
    await waitFor(() => expect(screen.getByTestId('canvas-panel-frame-4')).toBeInTheDocument());
    expect(screen.getByAltText('panel1-sketch.png')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeEnabled();
  });

  describe('ArtistDeskView - Artwork Persistence & Error Notification (CF2 / WAITING_FE Fix)', () => {
    it('loads existing artworks from R2 on page load and hydrates panels with latest version', async () => {
      const mockPageId = '11111111-1111-1111-1111-111111111111';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';
      const mockPanel2Id = '22222222-2222-2222-2222-222222222222';
      const mockChapterId = 'chap-1';

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPageId,
          chapterId: mockChapterId,
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'PORTRAIT',
          dpi: 300,
          elementsCount: 2,
        },
      ]);

      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPageId,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 50 } }),
          createdAt: new Date().toISOString(),
        },
        {
          id: mockPanel2Id,
          pageId: mockPageId,
          panelNumber: 2,
          readingOrder: 2,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 50, w: 100, h: 50 } }),
          createdAt: new Date().toISOString(),
        },
      ]);

      const getArtworksSpy = vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([
        {
          id: 'art-ref-v1',
          assetId: 'asset-1',
          chapterId: mockChapterId,
          pageId: mockPageId,
          pipelineStageId: 'stage-pencil',
          versionNumber: 1,
          fileName: 'panel1-draft-v1.png',
          contentType: 'image/png',
          sizeBytes: 1024,
          sha256: 'sha-v1',
          reused: false,
          uploadedByUserId: 'user-1',
          createdAt: new Date().toISOString(),
          panelId: mockPanel1Id,
        },
        {
          id: 'art-ref-v2',
          assetId: 'asset-2',
          chapterId: mockChapterId,
          pageId: mockPageId,
          pipelineStageId: 'stage-pencil',
          versionNumber: 2,
          fileName: 'panel1-latest-v2.png',
          contentType: 'image/png',
          sizeBytes: 2048,
          sha256: 'sha-v2',
          reused: false,
          uploadedByUserId: 'user-1',
          createdAt: new Date().toISOString(),
          panelId: mockPanel1Id,
        },
        {
          id: 'art-ref-panel2',
          assetId: 'asset-3',
          chapterId: mockChapterId,
          pageId: mockPageId,
          pipelineStageId: 'stage-pencil',
          versionNumber: 1,
          fileName: 'panel2-art.png',
          contentType: 'image/png',
          sizeBytes: 3072,
          sha256: 'sha-v3',
          reused: false,
          uploadedByUserId: 'user-1',
          createdAt: new Date().toISOString(),
          panelId: mockPanel2Id,
        },
      ]);

      const getLinkSpy = vi
        .spyOn(artworkService, 'getArtworkAccessLink')
        .mockImplementation(async (_chap, id) => {
          return {
            url: `/api/assets/download?token=token-for-${id}`,
            expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
          };
        });

      render(
        <ToastProvider>
          <MemoryRouter
            initialEntries={[`/workspaces/ws-1/series/ser-1/artist?chapterId=${mockChapterId}`]}
          >
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={<ArtistDeskView workspaceRole='ARTIST' />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );

      await waitFor(() => {
        expect(getArtworksSpy).toHaveBeenCalled();
      });

      // Verify latest version v2 was requested, not v1
      await waitFor(() => {
        expect(getLinkSpy).toHaveBeenCalledWith(mockChapterId, 'art-ref-v2');
        expect(getLinkSpy).toHaveBeenCalledWith(mockChapterId, 'art-ref-panel2');
        expect(getLinkSpy).not.toHaveBeenCalledWith(mockChapterId, 'art-ref-v1');
      });

      // Check images are displayed in panels with access link
      await waitFor(() => {
        const img1 = screen.getByAltText('panel1-latest-v2.png');
        expect(img1).toBeInTheDocument();
        expect(img1).toHaveAttribute('src', expect.stringContaining('token-for-art-ref-v2'));

        const img2 = screen.getByAltText('panel2-art.png');
        expect(img2).toBeInTheDocument();
        expect(img2).toHaveAttribute('src', expect.stringContaining('token-for-art-ref-panel2'));
      });
    });

    it('displays toast error notification when artwork upload fails instead of silently swallowing', async () => {
      const mockPageId = '11111111-1111-1111-1111-111111111111';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';
      const mockChapterId = 'chap-1';

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPageId,
          chapterId: mockChapterId,
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'PORTRAIT',
          dpi: 300,
          elementsCount: 1,
        },
      ]);

      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPageId,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 100 } }),
          createdAt: new Date().toISOString(),
        },
      ]);

      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      vi.spyOn(artworkService, 'uploadArtwork').mockRejectedValue(
        new Error('Network error or R2 quota exceeded'),
      );

      render(
        <ToastProvider>
          <MemoryRouter
            initialEntries={[`/workspaces/ws-1/series/ser-1/artist?chapterId=${mockChapterId}`]}
          >
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={<ArtistDeskView workspaceRole='ARTIST' />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('panel-dropzone-1')).toBeInTheDocument();
      });

      const mockFile = new File(['image byte content'], 'fail-test.png', { type: 'image/png' });
      fireEvent.drop(screen.getByTestId('panel-dropzone-1'), {
        dataTransfer: { files: [mockFile] },
      });

      // Verify toast error is shown
      await waitFor(() => {
        expect(screen.getByText('Lỗi lưu tranh lên máy chủ')).toBeInTheDocument();
        expect(screen.getByText(/Network error or R2 quota exceeded/i)).toBeInTheDocument();
      });
    });

    it('reloads artwork when stage is switched from Pencil to Ink', async () => {
      const mockPageId = '11111111-1111-1111-1111-111111111111';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';
      const mockChapterId = 'chap-1';
      const pencilStageId = 'a1111111-1111-1111-1111-111111111111';
      const inkStageId = 'b2222222-2222-2222-2222-222222222222';
      const letterStageId = 'c3333333-3333-3333-3333-333333333333';

      vi.spyOn(pipelineService, 'getSeriesPipeline').mockResolvedValue({
        id: 'pipe-1',
        seriesId: 'ser-1',
        name: 'Default Manga',
        stages: [
          { id: pencilStageId, stageOrder: 1, name: 'Pencil', isEnabled: true },
          { id: inkStageId, stageOrder: 2, name: 'Ink', isEnabled: true },
          { id: letterStageId, stageOrder: 3, name: 'Letter', isEnabled: true },
        ],
        transitions: [],
      } as any);

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPageId,
          chapterId: mockChapterId,
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'PORTRAIT',
          dpi: 300,
          elementsCount: 1,
        },
      ]);

      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPageId,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 100 } }),
          createdAt: new Date().toISOString(),
        },
      ]);

      const getArtworksSpy = vi
        .spyOn(artworkService, 'getArtworks')
        .mockImplementation(async (_chap, _pg, stageId) => {
          if (!stageId || stageId === pencilStageId) {
            return [
              {
                id: 'art-pencil-1',
                assetId: 'asset-pencil-1',
                chapterId: mockChapterId,
                pageId: mockPageId,
                pipelineStageId: pencilStageId,
                versionNumber: 1,
                fileName: 'pencil-sketch.png',
                contentType: 'image/png',
                sizeBytes: 1000,
                sha256: 'sha-p',
                reused: false,
                uploadedByUserId: 'u1',
                createdAt: new Date().toISOString(),
                panelId: mockPanel1Id,
              },
            ];
          }
          if (stageId === inkStageId) {
            return [
              {
                id: 'art-ink-1',
                assetId: 'asset-ink-1',
                chapterId: mockChapterId,
                pageId: mockPageId,
                pipelineStageId: inkStageId,
                versionNumber: 1,
                fileName: 'ink-drawing.png',
                contentType: 'image/png',
                sizeBytes: 2000,
                sha256: 'sha-i',
                reused: false,
                uploadedByUserId: 'u1',
                createdAt: new Date().toISOString(),
                panelId: mockPanel1Id,
              },
            ];
          }
          return [];
        });

      vi.spyOn(artworkService, 'getArtworkAccessLink').mockImplementation(async (_chap, id) => {
        return {
          url: `/api/assets/download?token=${id}`,
          expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
        };
      });
      vi.spyOn(assignmentService, 'getAssignments').mockResolvedValue([
        {
          id: 'assign-pencil',
          seriesId: 'ser-1',
          chapterId: mockChapterId,
          entityType: 'Chapter',
          targetEntityId: mockChapterId,
          pipelineStageId: pencilStageId,
          assigneeUserId: 'user-1',
          assignedRole: 'ARTIST',
          brief: 'Vẽ chì',
          status: 'Submitted',
          priority: 'Medium',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);
      render(
        <ToastProvider>
          <MemoryRouter
            initialEntries={[
              `/workspaces/ws-1/series/ser-1/artist?chapterId=${mockChapterId}&assignmentId=assign-pencil`,
            ]}
          >
            <Routes>
              <Route
                path='/workspaces/:workspaceId/series/:seriesId/artist'
                element={<ArtistDeskView workspaceRole='ARTIST' />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );

      // Initial Pencil stage loads pencil artwork
      await waitFor(() => {
        expect(screen.getByAltText('pencil-sketch.png')).toBeInTheDocument();
      });

      // A submitted Pencil assignment unlocks Ink; saved artwork reloads for the new stage.
      await waitFor(() => {
        expect(getArtworksSpy).toHaveBeenCalledWith(mockChapterId, mockPageId, inkStageId);
        expect(screen.getByAltText('ink-drawing.png')).toBeInTheDocument();
        expect(screen.queryByAltText('pencil-sketch.png')).not.toBeInTheDocument();
      });
    });
  });

  describe('ArtistDeskView - Consolidated Script Drawer', () => {
    it('uses the left script drawer as the single script reference surface', () => {
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

      expect(screen.queryByTestId('artist-script-ref-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('artist-script-ref-collapsed')).not.toBeInTheDocument();

      expect(screen.getByTestId('canva-drawer-script')).toBeInTheDocument();
      expect(screen.getByTestId('script-line-line-1')).toBeInTheDocument();
      expect(screen.getByTestId('script-line-line-2')).toBeInTheDocument();
    });

    it('filters by pageId/pageNumber and highlights by panelNumber from GET /api/scenes/{sceneId} (TASK-6)', async () => {
      Element.prototype.scrollIntoView = vi.fn();
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      vi.spyOn(elementService, 'getPageSnapshot').mockResolvedValue({
        pageId: 'pg-1',
        elements: [],
      } as any);
      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValueOnce([
        {
          id: 'pg-1',
          chapterId: 'chap-t6',
          pageNumber: 1,
          layoutFormat: 'B5',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 2,
        },
        {
          id: 'pg-2',
          chapterId: 'chap-t6',
          pageNumber: 2,
          layoutFormat: 'B5',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 1,
        },
        {
          id: 'pg-3',
          chapterId: 'chap-t6',
          pageNumber: 3,
          layoutFormat: 'B5',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 0,
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
            {
              id: 'pnl-1-2',
              pageId: 'pg-1',
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
          id: 'sc-t6',
          chapterId: 'chap-t6',
          sceneNumber: 1,
          heading: 'Hành lang tối',
          createdAt: '2026-01-01T00:00:00Z',
          scriptLinesCount: 4,
          pagesCount: 2,
        },
      ]);

      vi.spyOn(scriptLineService, 'getSceneById').mockResolvedValueOnce({
        id: 'sc-t6',
        chapterId: 'chap-t6',
        sceneNumber: 1,
        heading: 'Hành lang tối',
        createdAt: '2026-01-01T00:00:00Z',
        scriptLines: [
          {
            id: 'ln-p1-k1',
            lineOrder: 1,
            dialogueText: 'Trang 1 khung 1',
            panelId: 'pnl-1-1',
            pageId: 'pg-1',
            pageNumber: 1,
            panelNumber: 1,
          },
          {
            id: 'ln-p1-k2',
            lineOrder: 2,
            dialogueText: 'Trang 1 khung 2',
            panelId: 'pnl-1-2',
            pageId: 'pg-1',
            pageNumber: 1,
            panelNumber: 2,
          },
          {
            id: 'ln-p2-k3',
            lineOrder: 3,
            dialogueText: 'Trang 2 khung 3 (không cần panelPageMap)',
            panelId: 'pnl-2-3',
            pageId: 'pg-2',
            pageNumber: 2,
            panelNumber: 3,
          },
          {
            id: 'ln-unpaged',
            lineOrder: 4,
            stageDirection: 'Dòng chưa gán khung',
            panelId: null,
            pageId: null,
            pageNumber: null,
            panelNumber: null,
          },
        ],
      });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-t6']}>
          <Routes>
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/artist'
              element={<ArtistDeskView workspaceRole='ARTIST' />}
            />
          </Routes>
        </MemoryRouter>,
      );

      // Page 1 shows only Page 1 lines (filtered by pageId/pageNumber)
      await waitFor(() => {
        expect(screen.getByTestId('script-line-ln-p1-k1')).toBeInTheDocument();
      });
      expect(screen.getByTestId('script-line-ln-p1-k2')).toBeInTheDocument();
      expect(screen.queryByTestId('script-line-ln-p2-k3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('script-line-ln-unpaged')).not.toBeInTheDocument();

      // Selecting Khung #2 highlights only ln-p1-k2
      fireEvent.click(screen.getByTestId('script-panel-section-1-2'));
      expect(screen.getByTestId('script-panel-section-1-2')).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(screen.getByTestId('script-panel-section-1-1')).not.toHaveAttribute('aria-current');

      // Switch to Page 2 -> shows Page 2 line in Panel 3 card
      const card2 = screen.getByTestId('canva-page-card-2');
      fireEvent.click(card2.querySelector('[role="button"]')!);
      expect(screen.getByTestId('script-panel-section-2-3')).toHaveTextContent('Khung 3');
      expect(screen.getByTestId('script-line-ln-p2-k3')).toBeInTheDocument();
      expect(screen.queryByTestId('script-line-ln-p1-k1')).not.toBeInTheDocument();

      // Page 3 has no assigned lines; the unpaged scene remains available in whole-chapter mode.
      const card3 = screen.getByTestId('canva-page-card-3');
      fireEvent.click(card3.querySelector('[role="button"]')!);
      expect(screen.queryByTestId('script-line-ln-p2-k3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('script-line-ln-unpaged')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('canva-script-mode-all'));
      expect(screen.getByTestId('script-unpaged-scenes')).toBeInTheDocument();
      expect(screen.getByTestId('script-line-ln-unpaged')).toBeInTheDocument();
    });
  });

  describe('ArtistDeskView - Task Grid V3 Guards (Items A, B, C)', () => {
    it('Item A: shows exact Backend 409 message when submitStageTasks fails with 409 and keeps stage unchanged', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'artist-1' }));
      const conflictErr: any = new Error('Trang 1: Chưa đủ artwork cho tất cả các khung.');
      conflictErr.status = 409;
      conflictErr.code = 'CONFLICT';

      vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
        chapterId: 'chap-1',
        stages: [],
        pages: [],
        lots: [],
        tasks: [
          {
            id: 'cell-p1-pencil',
            pipelineStageId: 'stage-pencil',
            pageId: null,
            status: 'InProgress',
            lotId: 'lot-1',
            assigneeUserId: 'artist-1',
            isInputOutdated: false,
            isStartable: false,
            rowVersion: 1,
          },
        ],
      } as any);
      const submitSpy = vi
        .spyOn(assignmentService, 'submitStageTasks')
        .mockRejectedValueOnce(conflictErr);

      try {
        render(
          <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/artist'
                    element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        await waitFor(() => {
          expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute(
            'data-stage-state',
            'current',
          );
        });

        fireEvent.click(screen.getByTestId('focus-submit-stage-btn'));

        expect(
          await screen.findByText('Trang 1: Chưa đủ artwork cho tất cả các khung.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Không nộp được công đoạn')).not.toBeInTheDocument();
        expect(submitSpy).toHaveBeenCalledWith('chap-1', ['cell-p1-pencil']);
        expect(screen.getByTestId('focus-stage-step-0')).toHaveAttribute(
          'data-stage-state',
          'current',
        );
      } finally {
        localStorage.removeItem('user');
      }
    });

    it('Items B & C: puts editor in read-only mode and disables upload when user does not hold an InProgress/ReworkRequired cell on the page', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'artist-1' }));
      const mockPage1Id = '11111111-1111-1111-1111-111111111111';
      const mockPage2Id = '11111111-1111-1111-1111-111111111112';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPage1Id,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
        {
          id: mockPage2Id,
          chapterId: 'chap-1',
          pageNumber: 2,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
      ]);

      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPage1Id,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 100 } }),
          createdAt: new Date().toISOString(),
        },
      ]);

      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
        chapterId: 'chap-1',
        stages: [],
        pages: [],
        lots: [],
        tasks: [
          {
            id: 'cell-p1-pencil',
            pipelineStageId: 'stage-pencil',
            pageId: mockPage1Id,
            status: 'Assigned',
            lotId: 'lot-1',
            assigneeUserId: 'artist-1',
            isInputOutdated: false,
            isStartable: true,
            rowVersion: 1,
          },
          {
            id: 'cell-p2-pencil',
            pipelineStageId: 'stage-pencil',
            pageId: mockPage2Id,
            status: 'InProgress',
            lotId: 'lot-1',
            assigneeUserId: 'artist-1',
            isInputOutdated: false,
            isStartable: false,
            rowVersion: 1,
          },
        ],
      } as any);

      const startSpy = vi.spyOn(assignmentService, 'startStageTask').mockResolvedValue({
        id: 'cell-p1-pencil',
        status: 'InProgress',
      } as any);

      try {
        render(
          <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/artist'
                    element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        // Ô Assigned đã đến lượt → mở trang là tự bắt đầu (UIQ-11e), không còn nút Bắt đầu làm
        expect(screen.queryByTestId('artist-start-cell-btn')).not.toBeInTheDocument();
        await waitFor(() => {
          expect(startSpy).toHaveBeenCalledWith('chap-1', 'cell-p1-pencil');
          expect(screen.queryByTestId('artist-page-readonly-banner')).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('panel-dropzone-1')).not.toBeDisabled();

        // Switch to Page 2 (status InProgress) -> editable & upload enabled
        const card2 = screen.getByTestId('canva-page-card-2');
        fireEvent.click(card2.querySelector('[role="button"]')!);

        await waitFor(() => {
          expect(screen.queryByTestId('artist-page-readonly-banner')).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('panel-dropzone-1')).not.toBeDisabled();
      } finally {
        localStorage.removeItem('user');
      }
    });

    it('Items B & C: shows exact toast on 403 when saving layout or uploading artwork', async () => {
      const mockPageId = '11111111-1111-1111-1111-111111111111';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';
      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPageId,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
      ]);
      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPageId,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 100 } }),
          createdAt: new Date().toISOString(),
        },
      ]);
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);

      const forbiddenUploadErr: any = new Error(
        'Chỉ người giữ ô đang mở mới được tải artwork lên trang này.',
      );
      forbiddenUploadErr.status = 403;
      forbiddenUploadErr.code = 'FORBIDDEN';
      vi.spyOn(artworkService, 'uploadArtwork').mockRejectedValueOnce(forbiddenUploadErr);

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route
                  path='/workspaces/:workspaceId/series/:seriesId/artist'
                  element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                />
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('panel-dropzone-1')).toBeInTheDocument();
      });

      const mockFile = new File(['image byte content'], 'forbidden.png', { type: 'image/png' });
      fireEvent.drop(screen.getByTestId('panel-dropzone-1'), {
        dataTransfer: { files: [mockFile] },
      });

      await waitFor(() => {
        expect(
          screen.getByText('Chỉ người giữ ô đang mở mới được tải artwork lên trang này.'),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText('Đã nạp tranh vào ô')).not.toBeInTheDocument();
    });

    it('Item C: shows Rút bài button on ArtistDeskView when cell is Submitted, refetches grid after withdraw, and surfaces 409 error', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'artist-1' }));
      const mockPage1Id = '11111111-1111-1111-1111-111111111111';

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPage1Id,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
      ]);
      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([]);
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);

      const getGridSpy = vi
        .spyOn(assignmentService, 'getTaskGrid')
        .mockResolvedValueOnce({
          chapterId: 'chap-1',
          stages: [],
          pages: [{ id: mockPage1Id, pageNumber: 1 }],
          lots: [],
          tasks: [
            {
              id: 'cell-p1-pencil',
              pipelineStageId: 'stage-pencil',
              pageId: mockPage1Id,
              status: 'Submitted',
              lotId: 'lot-1',
              assigneeUserId: 'artist-1',
              isInputOutdated: false,
              isStartable: false,
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          chapterId: 'chap-1',
          stages: [],
          pages: [{ id: mockPage1Id, pageNumber: 1 }],
          lots: [],
          tasks: [
            {
              id: 'cell-p1-pencil',
              pipelineStageId: 'stage-pencil',
              pageId: mockPage1Id,
              status: 'Submitted',
              lotId: 'lot-1',
              assigneeUserId: 'artist-1',
              isInputOutdated: false,
              isStartable: false,
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          chapterId: 'chap-1',
          stages: [],
          pages: [{ id: mockPage1Id, pageNumber: 1 }],
          lots: [],
          tasks: [
            {
              id: 'cell-p1-pencil',
              pipelineStageId: 'stage-pencil',
              pageId: mockPage1Id,
              status: 'InProgress',
              lotId: 'lot-1',
              assigneeUserId: 'artist-1',
              isInputOutdated: false,
              isStartable: false,
            },
          ],
        } as any);

      const conflict409 = Object.assign(
        new Error('Ô đang được Editor mở duyệt, không thể rút bài.'),
        { status: 409 },
      );
      const withdrawSpy = vi
        .spyOn(assignmentService, 'withdrawStageTask')
        .mockRejectedValueOnce(conflict409)
        .mockResolvedValueOnce({
          id: 'cell-p1-pencil',
          pipelineStageId: 'stage-pencil',
          pageId: mockPage1Id,
          status: 'InProgress',
        } as any);

      try {
        render(
          <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/artist'
                    element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        const withdrawBtn = await screen.findByTestId('artist-withdraw-btn');
        expect(withdrawBtn).toHaveTextContent('Rút bài');
        await waitFor(() => expect(withdrawBtn).not.toBeDisabled());

        // Lần 1: 409 -> báo đúng message Backend, không báo thành công giả, tải lại lưới
        fireEvent.click(withdrawBtn);
        expect(
          await screen.findByText('Ô đang được Editor mở duyệt, không thể rút bài.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Đã rút bài')).not.toBeInTheDocument();
        expect(getGridSpy).toHaveBeenCalledTimes(2);

        // Lần 2: 200 OK -> rút bài thành công, cập nhật ô trực tiếp từ DTO trả về, nút Rút bài chuyển sang disabled
        fireEvent.click(screen.getByTestId('artist-withdraw-btn'));
        await waitFor(() => {
          expect(withdrawSpy).toHaveBeenCalledWith('chap-1', 'cell-p1-pencil');
          expect(screen.getByText('Đã rút bài')).toBeInTheDocument();
        });
        expect(getGridSpy).toHaveBeenCalledTimes(2);
        const disabledWithdrawBtn = screen.getByTestId('artist-withdraw-btn');
        expect(disabledWithdrawBtn).toBeDisabled();
        expect(disabledWithdrawBtn).toHaveAttribute('title');
      } finally {
        localStorage.removeItem('user');
      }
    });

    it('Item F: locks panel layout and template actions in Ink and Color stages while keeping artwork upload active', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'artist-1' }));
      const mockPage1Id = '11111111-1111-1111-1111-111111111111';
      const mockPanel1Id = '22222222-2222-2222-2222-222222222221';
      const pencilStageId = 'a1111111-1111-1111-1111-111111111111';
      const inkStageId = 'b2222222-2222-2222-2222-222222222222';
      const colorStageId = 'd4444444-4444-4444-4444-444444444444';
      const letterStageId = 'c3333333-3333-3333-3333-333333333333';

      vi.spyOn(pipelineService, 'getSeriesPipeline').mockResolvedValue({
        id: 'pipe-color',
        seriesId: 'ser-1',
        name: 'Color Webtoon',
        stages: [
          { id: pencilStageId, stageOrder: 1, name: 'Pencil', slug: 'pencil', isEnabled: true },
          { id: inkStageId, stageOrder: 2, name: 'Ink', slug: 'ink', isEnabled: true },
          {
            id: colorStageId,
            stageOrder: 3,
            name: 'Tô màu (Color)',
            slug: 'color',
            isEnabled: true,
          },
          { id: letterStageId, stageOrder: 4, name: 'Letter', slug: 'lettering', isEnabled: true },
        ],
        transitions: [],
      } as any);

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: mockPage1Id,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
      ]);
      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([
        {
          id: mockPanel1Id,
          pageId: mockPage1Id,
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 100, h: 100 } }),
          createdAt: new Date().toISOString(),
        },
      ]);
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      const uploadSpy = vi
        .spyOn(artworkService, 'uploadArtwork')
        .mockResolvedValue({ id: 'art-color-1' } as any);

      vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
        chapterId: 'chap-1',
        stages: [
          { id: pencilStageId, name: 'Pencil', stageOrder: 1, isEnabled: true },
          { id: inkStageId, name: 'Ink', stageOrder: 2, isEnabled: true },
          { id: colorStageId, name: 'Tô màu (Color)', stageOrder: 3, isEnabled: true },
          { id: letterStageId, name: 'Letter', stageOrder: 4, isEnabled: true },
        ],
        pages: [{ id: mockPage1Id, pageNumber: 1 }],
        lots: [],
        tasks: [
          {
            id: 'cell-p1-color',
            pipelineStageId: colorStageId,
            pageId: mockPage1Id,
            status: 'InProgress',
            lotId: 'lot-color',
            assigneeUserId: 'artist-1',
            isInputOutdated: false,
            isStartable: false,
          },
        ],
      } as any);

      try {
        render(
          <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/artist'
                    element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        await waitFor(() => {
          expect(screen.getByTestId('btn-upload-sketch-simple')).toBeDisabled();
        });

        expect(screen.queryByTestId('artist-layout-locked-notice')).not.toBeInTheDocument();

        // Thao tác bố cục khung bị khoá ở công đoạn Color (vẫn hiện tab mờ kèm tooltip lý do)
        expect(screen.getByTestId('btn-upload-sketch-simple')).toHaveAttribute(
          'title',
          'Chỉ công đoạn Pencil mới được sửa bố cục khung',
        );
        expect(screen.getByTestId('btn-open-templates-simple')).toBeDisabled();
        expect(screen.getByTestId('btn-open-templates-simple')).toHaveAttribute(
          'title',
          'Chỉ công đoạn Pencil mới được sửa bố cục khung',
        );
        expect(screen.getByTestId('btn-split-panels-simple')).toBeDisabled();
        expect(screen.getByTestId('btn-split-panels-simple')).toHaveAttribute(
          'title',
          'Chỉ công đoạn Pencil mới được sửa bố cục khung',
        );
        expect(screen.getByTestId('canvas-btn-save-layout')).toBeDisabled();
        expect(screen.getByTestId('canva-tab-templates')).toHaveAttribute('aria-disabled', 'true');

        // Nạp tranh vào khung vẫn hoạt động bình thường
        const dropzone = screen.getByTestId('panel-dropzone-1');
        expect(dropzone).not.toBeDisabled();

        const colorFile = new File(['colored bytes'], 'color-panel1.png', { type: 'image/png' });
        fireEvent.drop(dropzone, { dataTransfer: { files: [colorFile] } });

        await waitFor(() => {
          expect(uploadSpy).toHaveBeenCalledWith(
            'chap-1',
            mockPage1Id,
            colorFile,
            colorStageId,
            undefined,
            undefined,
            mockPanel1Id,
          );
          expect(screen.getByAltText('color-panel1.png')).toBeInTheDocument();
        });
      } finally {
        localStorage.removeItem('user');
      }
    });
  });

  describe('Letterer translation edition submission, untranslated counts, and read-only rules (BR-34)', () => {
    const page1Id = '11111111-1111-4111-8111-111111111111';
    const elem1Id = '22222222-2222-4222-8222-222222222221';
    const elem2Id = '22222222-2222-4222-8222-222222222222';

    it('shows untranslated counts on LanguageSelector, displays edition status, warns missing balloons in ConfirmDialog, and submits edition', async () => {
      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: page1Id,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 2,
        },
      ]);
      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([]);
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      vi.spyOn(elementService, 'getPageSnapshot').mockResolvedValue({
        pageId: page1Id,
        version: 1,
        pageNumber: 1,
        elements: [
          {
            elementId: elem1Id,
            elementType: 'SPEECH_BALLOON',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            zIndex: 1,
            content: 'Xin chào',
            texts: { en: 'Hello' },
            isRemoved: false,
            version: 1,
          },
          {
            elementId: elem2Id,
            elementType: 'SPEECH_BALLOON',
            x: 100,
            y: 250,
            width: 200,
            height: 100,
            zIndex: 2,
            content: 'Tạm biệt',
            texts: {},
            isRemoved: false,
            version: 1,
          },
        ],
      });
      const getEditionsSpy = vi
        .spyOn(chapterEditionService, 'getChapterEditions')
        .mockResolvedValue([
          {
            id: 'ed-en',
            chapterId: 'chap-1',
            languageCode: 'en',
            status: 'Draft',
            isPaid: false,
            priceVnd: 0,
            freePreviewPages: 0,
            version: 0,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]);
      const submitEditionSpy = vi
        .spyOn(chapterEditionService, 'submitEditionTranslation')
        .mockResolvedValue({
          id: 'ed-en',
          chapterId: 'chap-1',
          languageCode: 'en',
          status: 'InReview',
          isPaid: false,
          priceVnd: 0,
          freePreviewPages: 0,
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
        });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/letterer?chapterId=chap-1']}>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route
                  path='/workspaces/:workspaceId/series/:seriesId/letterer'
                  element={
                    <ArtistDeskView
                      workspaceRole='LETTERER'
                      initialScriptLines={[]}
                      initialSidebarTab='lettering'
                    />
                  }
                />
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </MemoryRouter>,
      );

      const selector = await screen.findByTestId('lettering-language-selector');
      await waitFor(() => {
        // EN has 1 untranslated balloon; JA is no longer a release language
        expect(selector).toHaveTextContent('1');
        expect(selector).not.toHaveTextContent('JA');
      });

      // Switch to EN
      fireEvent.click(screen.getByTitle('English (EN)'));

      expect(await screen.findByTestId('lettering-edition-status')).toHaveAttribute(
        'data-edition-status',
        'Draft',
      );
      const submitBtn = screen.getByTestId('lettering-submit-edition-btn');
      expect(submitBtn).not.toBeDisabled();

      getEditionsSpy.mockResolvedValueOnce([
        {
          id: 'ed-en',
          chapterId: 'chap-1',
          languageCode: 'en',
          status: 'InReview',
          isPaid: false,
          priceVnd: 0,
          freePreviewPages: 0,
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);

      fireEvent.click(submitBtn);

      // Shared ConfirmDialog opens and warns that 1 balloon still has no text for EN
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent(/1/);
      expect(dialog).toHaveTextContent(/EN/);

      // Confirm submission inside ConfirmDialog
      fireEvent.click(screen.getByTestId('confirm-accept-btn'));

      await waitFor(() => {
        expect(submitEditionSpy).toHaveBeenCalledWith('chap-1', 'en');
        expect(screen.getByTestId('lettering-edition-status')).toHaveAttribute(
          'data-edition-status',
          'InReview',
        );
        expect(screen.getByTestId('lettering-submit-edition-btn')).toBeDisabled();
      });
    });

    it('allows translation editing when chapter is approved (isPageReadOnly) and edition is Draft, while keeping original text and geometry read-only', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'letterer-1' }));
      const letterStageId = 'c3333333-3333-3333-3333-333333333333';

      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        {
          id: page1Id,
          chapterId: 'chap-1',
          pageNumber: 1,
          widthPx: 1200,
          heightPx: 1800,
          layoutFormat: 'B5',
          dpi: 300,
          elementsCount: 1,
        },
      ]);
      vi.spyOn(panelService, 'getPanelsByPage').mockResolvedValue([]);
      vi.spyOn(artworkService, 'getArtworks').mockResolvedValue([]);
      vi.spyOn(elementService, 'getPageSnapshot').mockResolvedValue({
        pageId: page1Id,
        version: 1,
        pageNumber: 1,
        elements: [
          {
            elementId: elem1Id,
            elementType: 'SPEECH_BALLOON',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            zIndex: 1,
            content: 'Xin chào',
            scriptLineId: null,
            texts: {},
            isRemoved: false,
            version: 1,
          },
        ],
      });
      const updateTransSpy = vi
        .spyOn(elementService, 'updateElementTranslation')
        .mockResolvedValue({ message: 'ok', elementVersion: 2 });
      vi.spyOn(chapterEditionService, 'getChapterEditions').mockResolvedValue([
        {
          id: 'ed-en',
          chapterId: 'chap-1',
          languageCode: 'en',
          status: 'Draft',
          isPaid: false,
          priceVnd: 0,
          freePreviewPages: 0,
          version: 0,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);
      vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
        chapterId: 'chap-1',
        stages: [{ id: letterStageId, name: 'Letter', stageOrder: 1, isEnabled: true }],
        pages: [{ id: page1Id, pageNumber: 1 }],
        lots: [],
        tasks: [
          {
            id: 'cell-p1-letter',
            pipelineStageId: letterStageId,
            pageId: page1Id,
            status: 'Approved',
            lotId: 'lot-letter',
            assigneeUserId: 'letterer-1',
            isInputOutdated: false,
            isStartable: false,
          },
        ],
      } as any);

      try {
        render(
          <MemoryRouter
            initialEntries={['/workspaces/ws-1/series/ser-1/letterer?chapterId=chap-1']}
          >
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/letterer'
                    element={
                      <ArtistDeskView
                        workspaceRole='LETTERER'
                        initialScriptLines={[]}
                        initialSidebarTab='lettering'
                      />
                    }
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        const banner = await screen.findByTestId('artist-page-readonly-banner');
        expect(banner).toHaveTextContent(/Chế độ chỉ đọc/i);

        // Select balloon on original language -> text input is readOnly because isPageReadOnly=true
        const balloonNode = await screen.findByTestId(`lettering-element-${elem1Id}`);
        fireEvent.click(balloonNode);
        expect(screen.getByTestId('lettering-text-input')).toHaveAttribute('readonly');

        // Switch to EN (Draft edition) -> banner says translation mode is allowed and translation input is editable
        fireEvent.click(screen.getByTitle('English (EN)'));
        expect(screen.getByTestId('artist-page-readonly-banner')).toHaveTextContent(
          /Chế độ dịch \(EN\)|Translation mode \(EN\)/i,
        );

        const transInput = screen.getByTestId('lettering-text-input');
        expect(transInput).not.toHaveAttribute('readonly');
        fireEvent.change(transInput, { target: { value: 'Hello translated' } });
        fireEvent.blur(transInput);

        await waitFor(() => {
          expect(updateTransSpy).toHaveBeenCalledWith(
            page1Id,
            elem1Id,
            'en',
            'Hello translated',
            1,
          );
        });
      } finally {
        localStorage.removeItem('user');
      }
    });

    it('hiển thị banner hổ phách khi kịch bản đang mở khóa trong InProduction và huy hiệu ⚑ Kịch bản thay đổi', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 'artist-1', role: 'ARTIST' }));
      const page1Id = '00000000-0000-0000-0000-000000000501';
      const pencilStageId = 'stage-pencil';

      vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValue([
        {
          id: 'chap-1',
          seriesId: 'ser-1',
          chapterNumber: 1,
          title: 'Chương 1',
          status: 'InProduction',
          isScriptFrozen: false,
        },
      ] as any);
      vi.spyOn(pageService, 'getPagesByChapter').mockResolvedValue([
        { id: page1Id, chapterId: 'chap-1', pageNumber: 1, widthPx: 1200, heightPx: 1800 },
      ] as any);
      vi.spyOn(assignmentService, 'getTaskGrid').mockResolvedValue({
        chapterId: 'chap-1',
        stages: [
          {
            id: pencilStageId,
            name: 'Pencil',
            stageOrder: 1,
            isEnabled: true,
            allowedRole: 'Artist',
          },
        ],
        pages: [{ id: page1Id, pageNumber: 1 }],
        lots: [],
        tasks: [
          {
            id: 'cell-p1-pencil',
            pipelineStageId: pencilStageId,
            pageId: page1Id,
            status: 'InProgress',
            lotId: 'lot-pencil',
            assigneeUserId: 'artist-1',
            isInputOutdated: true,
            hasScriptImpact: true,
            outdatedReason: 'Hành động khung 1 đã thay đổi',
            isStartable: false,
          },
        ],
      } as any);

      try {
        render(
          <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist?chapterId=chap-1']}>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route
                    path='/workspaces/:workspaceId/series/:seriesId/artist'
                    element={<ArtistDeskView workspaceRole='ARTIST' initialScriptLines={[]} />}
                  />
                </Routes>
              </ConfirmProvider>
            </ToastProvider>
          </MemoryRouter>,
        );

        const unfrozenBanner = await screen.findByTestId('script-unfrozen-banner');
        expect(unfrozenBanner).toHaveTextContent(
          /Kịch bản đang được mở khóa để chỉnh sửa — lưu ý trước khi nộp bài mới/i,
        );

        const impactBadge = await screen.findByTestId('visual-impact-badge');
        expect(impactBadge).toHaveTextContent(/⚑ Kịch bản thay đổi/);
      } finally {
        localStorage.removeItem('user');
      }
    });
  });
});

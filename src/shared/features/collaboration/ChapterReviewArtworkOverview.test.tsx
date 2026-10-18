import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  ChapterReviewArtworkOverview,
  compositeSessionCache,
} from './ChapterReviewArtworkOverview';
import { pageService } from '@/services/page.service';
import { artworkService } from '@/services/artwork.service';
import { pipelineService } from '@/services/pipeline.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { assignmentService } from '@/services/assignment.service';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn(),
    getArtworkAccessLink: vi.fn(),
  },
  resolveArtworkUrl: vi.fn((url: string) => `http://test-api${url}`),
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
  },
}));

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn(),
  },
}));

vi.mock('@/services/element.service', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    elementService: {
      getPageSnapshot: vi.fn(),
    },
  };
});

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignments: vi.fn(),
    getStageProgress: vi.fn(),
  },
}));

vi.mock('@/shared/utils/stageArtworks', () => ({
  loadPreviousStageArtworks: vi.fn(),
}));

vi.mock('@/shared/utils/compositePageRenderer', async () => {
  const actual = await vi.importActual<any>('@/shared/utils/compositePageRenderer');
  return {
    ...actual,
    buildPageComposite: vi.fn(),
  };
});

describe('ChapterReviewArtworkOverview', () => {
  const mockStages = [
    {
      id: 'stg-1',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      isEnabled: true,
      isInitial: true,
      isTerminal: false,
    },
    {
      id: 'stg-2',
      name: 'Thumbnail',
      slug: 'thumbnail',
      stageOrder: 2,
      isEnabled: true,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'stg-3',
      name: 'Pencil',
      slug: 'pencil',
      stageOrder: 3,
      isEnabled: true,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'stg-4',
      name: 'Ink',
      slug: 'ink',
      stageOrder: 4,
      isEnabled: true,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'stg-5',
      name: 'Color',
      slug: 'color',
      stageOrder: 5,
      isEnabled: false,
      isInitial: false,
      isTerminal: false,
    }, // Bị tắt
    {
      id: 'stg-6',
      name: 'Letter',
      slug: 'letter',
      stageOrder: 6,
      isEnabled: true,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'stg-7',
      name: 'Review',
      slug: 'review',
      stageOrder: 7,
      isEnabled: true,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'stg-8',
      name: 'Approved',
      slug: 'approved',
      stageOrder: 8,
      isEnabled: true,
      isInitial: false,
      isTerminal: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    compositeSessionCache.clear();
  });

  it('hiển thị đầy đủ tiến độ 1→7, tóm tắt N khung đủ X/Y công đoạn, và ảnh composite', async () => {
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-1', pageNumber: 1, chapterId: 'c1' } as any,
      { id: 'page-2', pageNumber: 2, chapterId: 'c1' } as any,
    ]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      stages: mockStages,
    } as any);

    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'assign-script',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Chapter',
        targetEntityId: 'c1',
        pipelineStageId: 'stg-1',
        status: 'Approved',
      } as any,
    ]);

    // Trang 1 có 2 panel: p1-1, p1-2. Trang 2 có 1 panel: p2-1.
    vi.mocked(panelService.getPanelsByPage).mockImplementation(async (pageId) => {
      if (pageId === 'page-1') {
        return [
          { id: 'p1-1', pageId },
          { id: 'p1-2', pageId },
        ] as any;
      }
      return [{ id: 'p2-1', pageId }] as any;
    });

    // Stage progress: Trang 1 xong Thumbnail, Pencil, Ink, Letter. Trang 2 mới xong Thumbnail.
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([
      // Page 1
      {
        id: 'sp-1',
        pageId: 'page-1',
        panelId: 'p1-1',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
      {
        id: 'sp-2',
        pageId: 'page-1',
        panelId: 'p1-2',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
      {
        id: 'sp-3',
        pageId: 'page-1',
        panelId: 'p1-1',
        pipelineStageId: 'stg-3',
        status: 'Approved',
      },
      {
        id: 'sp-4',
        pageId: 'page-1',
        panelId: 'p1-2',
        pipelineStageId: 'stg-3',
        status: 'Approved',
      },
      {
        id: 'sp-5',
        pageId: 'page-1',
        panelId: 'p1-1',
        pipelineStageId: 'stg-4',
        status: 'Approved',
      },
      {
        id: 'sp-6',
        pageId: 'page-1',
        panelId: 'p1-2',
        pipelineStageId: 'stg-4',
        status: 'Approved',
      },
      {
        id: 'sp-7',
        pageId: 'page-1',
        panelId: 'p1-1',
        pipelineStageId: 'stg-6',
        status: 'Approved',
      },
      {
        id: 'sp-8',
        pageId: 'page-1',
        panelId: 'p1-2',
        pipelineStageId: 'stg-6',
        status: 'Approved',
      },
      // Page 2
      {
        id: 'sp-9',
        pageId: 'page-2',
        panelId: 'p2-1',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
    ] as any);

    // Mock loadPreviousStageArtworks: Page 1 có ảnh Ink, Page 2 chưa có ảnh
    vi.mocked(loadPreviousStageArtworks).mockImplementation(async (_chap, _series, pageId) => {
      if (pageId === 'page-1') {
        return [{ id: 'art-ink-1', pipelineStageId: 'stg-4', versionNumber: 1 }] as any;
      }
      return [];
    });

    // Mock element snapshot: Page 1 có text bóng thoại, Page 2 không có
    vi.mocked(elementService.getPageSnapshot).mockImplementation(async (pageId) => {
      if (pageId === 'page-1') {
        return {
          pageId,
          elements: [{ id: 'el-1', elementType: 'SPEECH_BALLOON', renderedText: 'Chào cậu!' }],
        } as any;
      }
      return { pageId, elements: [] } as any;
    });

    // Mock buildPageComposite
    vi.mocked(buildPageComposite).mockResolvedValue({
      dataUrl: 'data:image/png;base64,compositePage1Mock',
      failedImages: 0,
      mode: 'panels',
    });

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    // 1. Tiêu đề
    expect(await screen.findByText(/Tổng quan bản vẽ theo trang & công đoạn/)).toBeInTheDocument();
    expect(screen.getByTestId('page-overview-page-1')).toBeInTheDocument();
    expect(screen.getByTestId('page-overview-page-2')).toBeInTheDocument();

    // 2. Tóm tắt "N khung · đủ X/Y công đoạn" (Color tắt nên tổng là 7 công đoạn đang bật)
    // Trang 1: 2 khung, đủ 5/7 công đoạn (Script, Thumbnail, Pencil, Ink, Letter)
    expect(screen.getByTestId('summary-text-page-1')).toHaveTextContent(
      '2 khung · đủ 5/7 công đoạn',
    );
    // Trang 2: 1 khung, đủ 2/7 công đoạn (Script, Thumbnail)
    expect(screen.getByTestId('summary-text-page-2')).toHaveTextContent(
      '1 khung · đủ 2/7 công đoạn',
    );

    // 3. Tiến độ 1→7: Stage Color bị tắt nên không xuất hiện
    expect(screen.queryByTestId('stage-cell-page-1-stg-5')).not.toBeInTheDocument();
    // Stage Script, Thumbnail, Pencil, Ink, Letter trên Page 1 có nhãn "Đã duyệt"
    expect(screen.getByTestId('stage-cell-page-1-stg-1')).toHaveTextContent('Script');
    expect(screen.getByTestId('stage-cell-page-1-stg-1')).toHaveTextContent('Đã duyệt');
    expect(screen.getByTestId('stage-cell-page-1-stg-6')).toHaveTextContent('Letter');
    expect(screen.getByTestId('stage-cell-page-1-stg-6')).toHaveTextContent('Đã duyệt');

    // 4. Cảnh báo đỏ ở trên cùng: Trang 2 chưa xong Pencil, Ink, Letter
    const warning = await screen.findByTestId('unfinished-pages-warning');
    expect(warning).toHaveTextContent('Trang 2 chưa xong: Pencil, Ink, Letter');

    // 5. Trang 1 có ảnh composite thành phẩm
    await waitFor(() => {
      const img = screen.getByAltText('Trang 1');
      expect(img).toHaveAttribute('src', 'data:image/png;base64,compositePage1Mock');
    });

    // 6. Trang 2 chưa có ảnh -> hiện ô xám "Chưa có bản vẽ"
    expect(await screen.findByTestId('no-artwork-page-2')).toHaveTextContent('Chưa có bản vẽ');
  });

  it('gắn nhãn nhỏ "Chưa chèn chữ" khi trang có ảnh nhưng chưa có phần tử chữ', async () => {
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-3', pageNumber: 3, chapterId: 'c1' } as any,
    ]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      stages: mockStages,
    } as any);

    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      { id: 'p3-1', pageId: 'page-3' },
    ] as any);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);

    // Có ảnh Ink
    vi.mocked(loadPreviousStageArtworks).mockResolvedValue([
      { id: 'art-ink-3', pipelineStageId: 'stg-4', versionNumber: 2 } as any,
    ]);

    // Không có chữ (elements rỗng)
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-3',
      elements: [],
    } as any);

    vi.mocked(buildPageComposite).mockResolvedValue({
      dataUrl: 'data:image/png;base64,mockImageNoText',
      failedImages: 0,
      mode: 'panels',
    });

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    // Chờ dựng xong ảnh
    await waitFor(() => {
      expect(screen.getByTestId('badge-no-lettering')).toHaveTextContent('Chưa chèn chữ');
    });
  });

  it('bấm ảnh mở xem lớn (Lightbox modal) và có nút chuyển trang trước/sau', async () => {
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-1', pageNumber: 1, chapterId: 'c1' } as any,
      { id: 'page-2', pageNumber: 2, chapterId: 'c1' } as any,
    ]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      stages: mockStages,
    } as any);

    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      { id: 'p-1', pageId: 'page-1' },
    ] as any);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);

    vi.mocked(loadPreviousStageArtworks).mockResolvedValue([
      { id: 'art-1', pipelineStageId: 'stg-2', versionNumber: 1 } as any,
    ]);

    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      elements: [{ id: 'el-1', elementType: 'SPEECH_BALLOON', renderedText: 'Alo' }],
    } as any);

    vi.mocked(buildPageComposite).mockResolvedValue({
      dataUrl: 'data:image/png;base64,lightboxPage1',
      failedImages: 0,
      mode: 'panels',
    });

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    // Chờ thumbnail hiển thị
    const thumbBtn = await screen.findByTestId('thumbnail-btn-page-1');
    fireEvent.click(thumbBtn);

    // Modal lightbox mở ra
    const lightbox = await screen.findByTestId('composite-lightbox');
    expect(lightbox).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 2/)).toBeInTheDocument();

    // Nút sang trang sau
    const nextBtn = screen.getByTestId('lightbox-next-btn');
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    // Chuyển sang Trang 2
    expect(screen.getByText(/Trang 2 \/ 2/)).toBeInTheDocument();

    // Nút đóng Lightbox
    const closeBtn = screen.getByTestId('lightbox-close-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('composite-lightbox')).not.toBeInTheDocument();
  });

  it('dùng cache phiên (compositeSessionCache) để không gọi lại buildPageComposite', async () => {
    // Đặt sẵn cache cho page-cached
    compositeSessionCache.set('page-cached', {
      dataUrl: 'data:image/png;base64,fromCache',
      hasArtwork: true,
      hasText: true,
      baseStageName: 'Color',
      baseVersion: 3,
    });

    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-cached', pageNumber: 1, chapterId: 'c1' } as any,
    ]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      stages: mockStages,
    } as any);

    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      { id: 'p-c', pageId: 'page-cached' },
    ] as any);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    // Ảnh lấy từ cache ngay lập tức
    const img = await screen.findByAltText('Trang 1');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fromCache');

    // buildPageComposite không bị gọi vì đã có cache
    expect(buildPageComposite).not.toHaveBeenCalled();
  });
});

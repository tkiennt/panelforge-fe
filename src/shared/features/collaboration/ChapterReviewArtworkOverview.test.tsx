import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChapterReviewArtworkOverview } from './ChapterReviewArtworkOverview';
import { pageService } from '@/services/page.service';
import { artworkService } from '@/services/artwork.service';
import { pipelineService } from '@/services/pipeline.service';

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

describe('ChapterReviewArtworkOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách trang và phiên bản theo stage (bỏ qua stage disabled)', async () => {
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-1', pageNumber: 1, chapterId: 'c1' } as any,
      { id: 'page-2', pageNumber: 2, chapterId: 'c1' } as any,
    ]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      stages: [
        {
          id: 'stage-thumb',
          name: 'Thumbnail',
          stageOrder: 1,
          isEnabled: true,
          colorCode: '#3B82F6',
        },
        { id: 'stage-color', name: 'Color', stageOrder: 2, isEnabled: false, colorCode: '#EC4899' },
      ],
    } as any);

    vi.mocked(artworkService.getArtworks).mockImplementation(async (_chapId, pageId) => {
      if (pageId === 'page-1') {
        return [
          {
            id: 'art-1',
            pageId: 'page-1',
            pipelineStageId: 'stage-thumb',
            versionNumber: 2,
            createdAt: '2026-10-16T10:00:00Z',
          },
          {
            id: 'art-disabled',
            pageId: 'page-1',
            pipelineStageId: 'stage-color',
            versionNumber: 1,
            createdAt: '2026-10-16T09:00:00Z',
          },
        ] as any;
      }
      return [];
    });

    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValue({
      url: '/assets/download/art-1',
      expiresAt: '2026-10-16T12:00:00Z',
    } as any);

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Tổng quan bản vẽ theo trang & công đoạn/)).toBeInTheDocument();
    expect(screen.getByTestId('page-overview-page-1')).toBeInTheDocument();
    expect(screen.getByTestId('page-overview-page-2')).toBeInTheDocument();

    // Stage enabled Thumbnail hiển thị chip v2
    expect(screen.getByText(/Thumbnail v2/)).toBeInTheDocument();

    // Stage disabled Color KHÔNG hiển thị chip
    expect(screen.queryByText(/Color v1/)).not.toBeInTheDocument();

    // Link mở màn duyệt chi tiết
    const reviewBtn = screen.getByTestId('open-review-board');
    expect(reviewBtn).toHaveAttribute('href', expect.stringContaining('/review/a1?chapterId=c1'));

    // Chờ thumbnail tải xong
    await waitFor(() => {
      const img = screen.getByAltText('Trang 1');
      expect(img).toHaveAttribute('src', 'http://test-api/assets/download/art-1');
    });
  });

  it('hiển thị thông báo khi chapter chưa có trang nào', async () => {
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([]);
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({ id: 'p1', stages: [] } as any);

    render(
      <MemoryRouter>
        <ChapterReviewArtworkOverview chapterId='c1' seriesId='s1' assignmentId='a1' />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Chương này chưa có trang nào được tạo.')).toBeInTheDocument();
  });
});

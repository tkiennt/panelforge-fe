import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SeriesChaptersModal } from './SeriesChaptersModal';
import { chapterService } from '@/services/chapter.service';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    createChapter: vi.fn(),
    updateChapter: vi.fn(),
    deleteChapter: vi.fn(),
    approveChapter: vi.fn(),
    reopenChapter: vi.fn(),
  },
}));

describe('SeriesChaptersModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing even if localStorage activeWorkspace is "null", "undefined", or invalid JSON', async () => {
    localStorage.setItem('activeWorkspace', 'null');

    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-1',
          seriesId: 'series-1',
          chapterNumber: 1,
          title: 'Khởi đầu mới',
          targetReleaseDate: '2026-12-01',
          versionVector: 1,
          createdAt: '2026-10-01T00:00:00Z',
          scenesCount: 3,
          pagesCount: 12,
          status: 'InProduction',
          outline: 'Tóm tắt tập 1',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConfirmProvider>
          <SeriesChaptersModal
            isOpen={true}
            seriesId='series-1'
            seriesTitle='Test Series'
            onClose={vi.fn()}
          />
        </ConfirmProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Tập & Lịch Phát Hành Chương')).toBeInTheDocument();
      expect(screen.getByText('Khởi đầu mới')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
    });
  });

  it('handles response as a raw Array without crashing', async () => {
    localStorage.setItem('activeWorkspace', JSON.stringify({ id: 'ws-123' }));

    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue([
      {
        id: 'chap-raw-1',
        seriesId: 'series-1',
        chapterNumber: 2,
        title: 'Tập raw array',
        targetReleaseDate: 'invalid-date',
        versionVector: 1,
        createdAt: 'invalid-date',
        scenesCount: 0,
        pagesCount: 0,
        status: 'InProduction',
      },
    ] as any);

    render(
      <MemoryRouter>
        <ConfirmProvider>
          <SeriesChaptersModal
            isOpen={true}
            seriesId='series-1'
            seriesTitle='Test Series'
            onClose={vi.fn()}
          />
        </ConfirmProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tập raw array')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  it('renders empty state gracefully when there are no chapters', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [],
      totalCount: 0,
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConfirmProvider>
          <SeriesChaptersModal
            isOpen={true}
            seriesId='series-1'
            seriesTitle='Test Series'
            onClose={vi.fn()}
          />
        </ConfirmProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa có chương nào')).toBeInTheDocument();
    });
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <MemoryRouter>
        <ConfirmProvider>
          <SeriesChaptersModal
            isOpen={false}
            seriesId='series-1'
            seriesTitle='Test Series'
            onClose={vi.fn()}
          />
        </ConfirmProvider>
      </MemoryRouter>
    );

    expect(container.innerHTML).toBe('');
  });
});

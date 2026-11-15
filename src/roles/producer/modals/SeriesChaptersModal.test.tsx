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
    startProduction: vi.fn(),
    getScriptComments: vi.fn().mockResolvedValue([]),
    getChapterLockGate: vi.fn().mockResolvedValue({ canApprove: true, items: [] }),
  },
}));

vi.mock('@/services/chapterCast.service', () => ({
  chapterCastService: {
    getChapterCast: vi.fn().mockResolvedValue({
      chapterId: 'chap-1',
      entries: [],
      submitGate: { isPassed: true, blockers: [] },
      gate: { isPassed: true, canStart: true, blockers: [] },
    }),
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
      </MemoryRouter>,
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
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Tập raw array')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  it('renders frozen script badge and hash when chapter is frozen', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-frozen',
          seriesId: 'series-1',
          chapterNumber: 3,
          title: 'Chương Đã Khóa',
          targetReleaseDate: '2026-12-05',
          versionVector: 3,
          createdAt: '2026-10-01T00:00:00Z',
          scenesCount: 2,
          pagesCount: 8,
          status: 'InProduction',
          isScriptFrozen: true,
          scriptContentHash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
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
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Chương Đã Khóa')).toBeInTheDocument();
      expect(screen.getByText('Kịch bản đóng băng')).toBeInTheDocument();
      expect(screen.getByText('#fedcba98')).toBeInTheDocument();
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
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa có chương nào')).toBeInTheDocument();
    });
  });

  it('renders Gate 1 button for PreProduction chapter and lacks isLocked/priceVnd in create form', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-pre',
          seriesId: 'series-1',
          chapterNumber: 1,
          title: 'Chương Tiền Kỳ',
          status: 'PreProduction',
          versionVector: 1,
          createdAt: '2026-10-01T00:00:00Z',
          scenesCount: 1,
          pagesCount: 5,
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
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('producer-gate1-start-chap-pre')).toBeInTheDocument();
      expect(screen.getByText('Tiền kỳ (viết kịch bản)')).toBeInTheDocument();
    });

    // Bấm nút tạo chương mới và kiểm tra không còn trường isLocked hay priceVnd
    const addBtn = screen.getByText('Tạo Chương Mới');
    addBtn.click();

    expect(screen.queryByLabelText(/chương trả phí/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nhập giá vnđ/i)).not.toBeInTheDocument();
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
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe('');
  });
});

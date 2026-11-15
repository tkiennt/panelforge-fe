import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SeriesChaptersModal } from './SeriesChaptersModal';
import { chapterService } from '@/services/chapter.service';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    getChapterLockGate: vi.fn(),
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

  it('chặn duyệt chương và hiển thị banner TASK_GRID_NOT_APPROVED + IMPACT_FLAGS kèm nút Mở Lưới V3', async () => {
    const onShowToast = vi.fn();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-grid',
          seriesId: 'series-1',
          chapterNumber: 4,
          title: 'Chương Lưới V3',
          targetReleaseDate: '2026-12-10',
          versionVector: 1,
          createdAt: '2026-10-01T00:00:00Z',
          scenesCount: 2,
          pagesCount: 5,
          status: 'InProduction',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.mocked(chapterService.getChapterLockGate).mockResolvedValueOnce({
      chapterId: 'chap-grid',
      status: 'InProduction',
      canApprove: false,
      items: [
        {
          code: 'TASK_GRID_NOT_APPROVED',
          blocking: true,
          count: 3,
          message: 'Còn 3 ô trên lưới giao việc chưa được duyệt, chưa thể duyệt Chapter.',
        },
        {
          code: 'IMPACT_FLAGS',
          blocking: true,
          count: 1,
          message: 'Còn 1 cờ ảnh hưởng ⚑ chưa quyết định Keep/Rework, chưa thể duyệt Chapter.',
        },
      ],
    });

    render(
      <MemoryRouter>
        <ConfirmProvider>
          <SeriesChaptersModal
            isOpen={true}
            seriesId='series-1'
            seriesTitle='Test Series'
            onClose={vi.fn()}
            onShowToast={onShowToast}
          />
        </ConfirmProvider>
      </MemoryRouter>,
    );

    const approveBtn = await screen.findByTestId('producer-approve-chapter-chap-grid');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('lock-gate-blocked-banner')).toBeInTheDocument();
      expect(screen.getByTestId('lock-gate-item-TASK_GRID_NOT_APPROVED')).toHaveTextContent(
        'Lưới V3 chưa duyệt hết',
      );
      expect(screen.getByTestId('lock-gate-item-IMPACT_FLAGS')).toHaveTextContent(
        'Cờ ảnh hưởng / Đầu vào lỗi thời',
      );
      expect(screen.getByTestId('lock-gate-open-grid-btn')).toBeInTheDocument();
    });
    expect(chapterService.approveChapter).not.toHaveBeenCalled();
  });
});

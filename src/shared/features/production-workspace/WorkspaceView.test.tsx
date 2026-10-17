import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkspaceView } from './WorkspaceView';
import { chapterService } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesProgress: vi.fn(),
  },
}));

vi.mock('@/shared/features/pipeline-board/KanbanBoard', () => ({
  KanbanBoard: ({ chapterId, filterType }: { chapterId?: string; filterType: string }) => (
    <div data-testid='kanban-board-mock'>
      <span>Mock Kanban Board - Chapter: {chapterId}</span>
      <span>Filter: {filterType}</span>
    </div>
  ),
}));

describe('WorkspaceView Component', () => {
  const mockChapters = [
    {
      id: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      title: 'Khởi đầu cuộc hành trình',
      status: 'InProduction',
      versionVector: 1,
      scenesCount: 2,
      pagesCount: 15,
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      title: 'Đối đầu',
      status: 'Approved',
      versionVector: 2,
      scenesCount: 3,
      pagesCount: 20,
      createdAt: '2026-10-08T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: mockChapters as any,
      totalCount: 2,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });

    vi.mocked(seriesService.getSeriesProgress).mockResolvedValue({
      seriesId: 'series-1',
      generatedAt: '2026-10-08T00:00:00Z',
      chapters: [
        {
          chapterId: 'chap-1',
          chapterNumber: 1,
          title: 'Khởi đầu cuộc hành trình',
          status: 'InProduction',
          targetReleaseDate: null,
          pageCount: 15,
          panelCount: 45,
          percentComplete: 65,
          stages: [],
          assignmentsByStatus: {
            Submitted: 2,
            UnderReview: 1,
          },
          overdueAssignments: 1,
        },
      ],
      workload: [],
      overdue: [],
      burndown: [],
    });
  });

  const renderComponent = (props: Partial<Parameters<typeof WorkspaceView>[0]> = {}) => {
    return render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/workspace']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/workspace'
            element={<WorkspaceView currentUserRole='PRODUCER' onShowToast={vi.fn()} {...props} />}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('nạp danh sách chương thật và hiển thị KPI từ Backend', async () => {
    renderComponent();

    await waitFor(() => {
      // Dropdown chương
      expect(screen.getByText('Chương 1: Khởi đầu cuộc hành trình')).toBeInTheDocument();
      // Badge trạng thái
      expect(screen.getByText('Đang sản xuất')).toBeInTheDocument();
      // KPI hoàn thành
      expect(screen.getByText('65%')).toBeInTheDocument();
      // KPI chờ duyệt (Submitted 2 + UnderReview 1 = 3)
      expect(screen.getByText('3')).toBeInTheDocument();
      // KPI quá hạn
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Mock Kanban Board - Chapter: chap-1/i)).toBeInTheDocument();
  });

  it('cho phép chuyển đổi bộ lọc All, My Tasks, Overdue', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Filter: all')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Của tôi' }));
    expect(screen.getByText('Filter: my-tasks')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quá hạn' }));
    expect(screen.getByText('Filter: overdue')).toBeInTheDocument();
  });

  it('chặn quyền truy cập đối với độc giả (READER mode)', async () => {
    renderComponent({ isReaderMode: true });

    expect(screen.getByText('Khu Vực Sản Xuất Giới Hạn')).toBeInTheDocument();
    expect(screen.queryByTestId('kanban-board-mock')).not.toBeInTheDocument();
  });

  it('không gọi getSeriesProgress và ẩn KPI đối với vai không phải Producer (ví dụ WRITER)', async () => {
    renderComponent({ currentUserRole: 'WRITER' });

    await waitFor(() => {
      expect(screen.getByText('Chương 1: Khởi đầu cuộc hành trình')).toBeInTheDocument();
    });

    expect(seriesService.getSeriesProgress).not.toHaveBeenCalled();
    expect(screen.queryByText('Hoàn thành')).not.toBeInTheDocument();
  });
});

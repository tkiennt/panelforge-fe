import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { KanbanBoard } from './KanbanBoard';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignments: vi.fn(),
    getSubmissions: vi.fn(),
    getChangeRequests: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

describe('KanbanBoard Component (Real Pipeline Board)', () => {
  const mockAssignments = [
    {
      id: 'assign-1',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      entityType: 'Page',
      targetEntityId: 'page-1',
      pipelineStageId: 'stage-1',
      assigneeUserId: 'user-1',
      assignedRole: 'Writer',
      brief: 'Viết kịch bản cho Trang 1',
      referenceNotes: 'Tham khảo Series Bible mục Oren Vale',
      dueDate: '2026-10-15T00:00:00Z',
      priority: 'High',
      status: 'InProgress',
      dependsOnAssignmentId: null,
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'assign-2',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      entityType: 'Page',
      targetEntityId: 'page-2',
      pipelineStageId: 'stage-2',
      assigneeUserId: 'user-2',
      assignedRole: 'Artist',
      brief: 'Vẽ nét Pencil cho Trang 2',
      dueDate: '2026-10-20T00:00:00Z',
      priority: 'Medium',
      status: 'Submitted',
      dependsOnAssignmentId: 'assign-1',
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'assign-3',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      entityType: 'Chapter',
      targetEntityId: 'chap-1',
      pipelineStageId: 'stage-1',
      assigneeUserId: 'user-1',
      assignedRole: 'Writer',
      brief: 'Đề cương chi tiết toàn bộ chương',
      dueDate: '2026-10-01T00:00:00Z', // Quá hạn
      priority: 'Urgent',
      status: 'Approved',
      createdAt: '2026-10-08T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(assignmentService.getAssignments).mockResolvedValue(mockAssignments as any);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([
      {
        id: 'sub-1',
        assignmentId: 'assign-1',
        chapterId: 'chap-1',
        submittedByUserId: 'user-1',
        attemptNumber: 1,
        status: 'Pending',
        submittedAt: '2026-10-08T12:00:00Z',
      } as any,
    ]);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Manga Pipeline',
      stages: [
        {
          id: 'stage-1',
          name: 'Kịch bản (Script)',
          slug: 'script',
          stageOrder: 1,
          colorCode: '#E0E7FF',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
        },
        {
          id: 'stage-2',
          name: 'Vẽ nét (Pencil)',
          slug: 'pencil',
          stageOrder: 2,
          colorCode: '#FEF3C7',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
        },
      ],
      transitions: [],
    });

    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      {
        id: 'page-1',
        chapterId: 'chap-1',
        pageNumber: 1,
        layoutFormat: 'StandardPage',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 0,
      },
      {
        id: 'page-2',
        chapterId: 'chap-1',
        pageNumber: 2,
        layoutFormat: 'StandardPage',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 0,
      },
    ]);

    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      {
        userId: 'user-1',
        fullName: 'Nguyễn Văn Writer',
        email: 'writer@panelforge.com',
        role: 'Writer',
        isOwner: false,
        joinedAt: '2026-10-08T00:00:00Z',
      },
      {
        userId: 'user-2',
        fullName: 'Trần Thị Artist',
        email: 'artist@panelforge.com',
        role: 'Artist',
        isOwner: false,
        joinedAt: '2026-10-08T00:00:00Z',
      },
    ]);
  });

  const renderComponent = (props: Partial<Parameters<typeof KanbanBoard>[0]> = {}) => {
    return render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/workspace']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/workspace'
            element={
              <KanbanBoard chapterId='chap-1' filterType='all' onShowToast={vi.fn()} {...props} />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('render đầy đủ 7 cột trạng thái theo chuẩn Backend', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Chờ thực hiện')).toBeInTheDocument();
      expect(screen.getByText('Đang làm')).toBeInTheDocument();
      expect(screen.getByText('Đã nộp bài')).toBeInTheDocument();
      expect(screen.getByText('Đang duyệt')).toBeInTheDocument();
      expect(screen.getByText('Cần sửa đổi')).toBeInTheDocument();
      expect(screen.getByText('Đã hoàn tất')).toBeInTheDocument();
      expect(screen.getByText('Bị chặn')).toBeInTheDocument();
    });
  });

  it('nạp dữ liệu nhiệm vụ AssignmentDto thật và hiển thị đúng vào các cột', async () => {
    renderComponent();

    await waitFor(() => {
      // Thẻ InProgress -> cột Đang làm
      expect(screen.getByText('Viết kịch bản cho Trang 1')).toBeInTheDocument();
      // Thẻ Submitted -> cột Đã nộp bài
      expect(screen.getByText('Vẽ nét Pencil cho Trang 2')).toBeInTheDocument();
      // Thẻ Approved -> cột Đã hoàn tất
      expect(screen.getByText('Đề cương chi tiết toàn bộ chương')).toBeInTheDocument();
    });

    // Người làm
    expect(screen.getAllByText('Nguyễn Văn Writer').length).toBeGreaterThan(0);
    expect(screen.getByText('Trần Thị Artist')).toBeInTheDocument();
  });

  it('lọc công việc Của tôi (my-tasks) theo currentUserId', async () => {
    renderComponent({ filterType: 'my-tasks', currentUserId: 'user-2' });

    await waitFor(() => {
      // User-2 chỉ có việc 'Vẽ nét Pencil cho Trang 2'
      expect(screen.getByText('Vẽ nét Pencil cho Trang 2')).toBeInTheDocument();
      expect(screen.queryByText('Viết kịch bản cho Trang 1')).not.toBeInTheDocument();
    });
  });

  it('mở SideDrawer khi người dùng click vào thẻ nhiệm vụ', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Viết kịch bản cho Trang 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Viết kịch bản cho Trang 1'));

    await waitFor(() => {
      expect(screen.getByText('Ghi chú & Tài liệu tham chiếu')).toBeInTheDocument();
      expect(screen.getByText('Tham khảo Series Bible mục Oren Vale')).toBeInTheDocument();
      expect(screen.getByText('Lần nộp #1')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Mở Bàn làm việc & Xét duyệt/i }),
      ).toBeInTheDocument();
    });
  });

  it('hiển thị empty state khi chương chưa chọn hoặc chưa có công việc', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Chương này chưa có nhiệm vụ nào được giao')).toBeInTheDocument();
    });
  });
});

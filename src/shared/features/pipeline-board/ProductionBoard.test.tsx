import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductionBoard } from './ProductionBoard';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignmentsStrict: vi.fn(),
    getSubmissions: vi.fn(),
    getChangeRequests: vi.fn(),
    deleteAssignment: vi.fn(),
  },
}));
vi.mock('@/services/pipeline.service', () => ({
  pipelineService: { getSeriesPipeline: vi.fn() },
}));
vi.mock('@/services/page.service', () => ({
  pageService: { getPagesByChapter: vi.fn() },
}));
vi.mock('@/services/workspace.service', () => ({
  workspaceService: { getMembers: vi.fn() },
}));

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
    dueDate: '2099-10-15T00:00:00Z',
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
    dueDate: '2099-10-20T00:00:00Z',
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
    dueDate: '2026-10-01T00:00:00Z',
    completedAt: '2026-09-30T00:00:00Z',
    priority: 'Urgent',
    status: 'Approved',
    createdAt: '2026-10-08T00:00:00Z',
  },
];

const renderBoard = (
  props: Partial<Parameters<typeof ProductionBoard>[0]> = {},
  url = '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&view=grid',
) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/workspace'
          element={<ProductionBoard chapterId='chap-1' onShowToast={vi.fn()} {...props} />}
        />
        <Route path='/workspaces/:workspaceId/series/:seriesId/my-work' element={<p>MY WORK</p>} />
      </Routes>
    </MemoryRouter>,
  );

const quick = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Lọc nhanh theo trạng thái' })).getByRole('button', {
    name,
  });

describe('ProductionBoard (Quy trình sản xuất: lưới + bộ lọc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignmentService.getAssignmentsStrict).mockResolvedValue(mockAssignments as any);
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
    } as any);
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'page-1', chapterId: 'chap-1', pageNumber: 1 },
      { id: 'page-2', chapterId: 'chap-1', pageNumber: 2 },
    ] as any);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      {
        userId: 'user-1',
        fullName: 'Nguyễn Văn Writer',
        email: 'writer@panelforge.com',
        role: 'Writer',
        isOwner: false,
        joinedAt: '',
      },
      {
        userId: 'user-2',
        fullName: 'Trần Thị Artist',
        email: 'artist@panelforge.com',
        role: 'Artist',
        isOwner: false,
        joinedAt: '',
      },
    ] as any);
  });

  it('Producer xem toàn chương ở dạng lưới, chỉ số tính trên toàn chương', async () => {
    renderBoard({ isProducer: true, currentUserRole: 'PRODUCER', currentUserId: 'producer-1' });

    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));
    expect(quick(/Tất cả/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyễn Văn Writer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trang 2').length).toBeGreaterThan(0);
    // Việc đã duyệt hiện thời điểm hoàn tất, không còn "Quá hạn"
    expect(screen.getByText(/^Hoàn tất \d/)).toBeInTheDocument();
    // Producer (không phải người làm) được "Xét duyệt" việc đã nộp
    expect(
      screen.getByRole('button', { name: 'Xét duyệt: Vẽ nét Pencil cho Trang 2' }),
    ).toBeInTheDocument();
  });

  it('thành viên mặc định "Cần tôi xử lý"; tham số filter hợp lệ trên URL được ưu tiên', async () => {
    const { unmount } = renderBoard({ currentUserRole: 'ARTIST', currentUserId: 'user-2' });
    await waitFor(() => expect(quick(/Cần tôi xử lý/)).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() =>
      expect(screen.getByText('Không có việc nào cần bạn xử lý')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả công việc của chương' }));
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));
    unmount();

    renderBoard(
      { currentUserRole: 'WRITER', currentUserId: 'user-1' },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&filter=done&view=grid',
    );
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(1));
    expect(quick(/Hoàn tất/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('kết hợp lọc nhanh + chi tiết, xoá bộ lọc; lưới và danh sách cùng tập kết quả', async () => {
    renderBoard({ isProducer: true, currentUserRole: 'PRODUCER', currentUserId: 'producer-1' });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));

    fireEvent.change(screen.getByLabelText('Người phụ trách'), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByLabelText('Tìm công việc'), { target: { value: 'de cuong' } });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(1));
    expect(screen.getByText('Đề cương chi tiết toàn bộ chương')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Danh sách' }));
    await waitFor(() => expect(screen.getAllByTestId('production-task-row')).toHaveLength(1));

    fireEvent.click(quick(/Đang làm/));
    await waitFor(() =>
      expect(screen.getByText('Không có công việc khớp bộ lọc')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Xoá bộ lọc/ })[0]);
    await waitFor(() => expect(screen.getAllByTestId('production-task-row')).toHaveLength(3));
    expect(quick(/Tất cả/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('nhóm theo trang không làm mất hay đếm trùng việc', async () => {
    renderBoard({ isProducer: true, currentUserRole: 'PRODUCER' });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));
    fireEvent.change(screen.getByLabelText('Nhóm theo'), { target: { value: 'page' } });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^Toàn chương/ })).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('production-task-card')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: /^Trang 1/ })).toBeInTheDocument();
  });

  it('cách xem Kanban phụ vẫn hiển thị đủ 7 cột trạng thái', async () => {
    renderBoard(
      { isProducer: true },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&view=kanban',
    );
    await waitFor(() => {
      for (const label of [
        'Chờ thực hiện',
        'Đã nộp bài',
        'Đang duyệt',
        'Cần sửa đổi',
        'Đã hoàn tất',
      ]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });
  });

  it('lỗi API hiển thị thông báo + thử lại, không biến thành danh sách rỗng', async () => {
    vi.mocked(assignmentService.getAssignmentsStrict).mockRejectedValueOnce(new Error('500'));
    renderBoard({ isProducer: true });
    await waitFor(() =>
      expect(screen.getByText('Không thể tải danh sách công việc của chương.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Chương này chưa có công việc nào')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));
  });

  it('chương chưa có việc hiện trạng thái rỗng riêng', async () => {
    vi.mocked(assignmentService.getAssignmentsStrict).mockResolvedValueOnce([]);
    renderBoard({ isProducer: true, onOpenCreateAssignment: vi.fn() });
    await waitFor(() =>
      expect(screen.getByText('Chương này chưa có công việc nào')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Giao việc cho chương này/ })).toBeInTheDocument();
  });

  it('mở/đóng chi tiết giữ nguyên bộ lọc; huỷ việc cập nhật danh sách', async () => {
    vi.mocked(assignmentService.deleteAssignment).mockResolvedValueOnce();
    renderBoard({ isProducer: true, currentUserRole: 'PRODUCER' });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(3));

    fireEvent.change(screen.getByLabelText('Công đoạn'), { target: { value: 'stage-1' } });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(2));

    fireEvent.click(screen.getByText('Viết kịch bản cho Trang 1'));
    await waitFor(() => {
      expect(screen.getByText('Ghi chú & Tài liệu tham chiếu')).toBeInTheDocument();
      expect(screen.getByText('Lần nộp #1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() =>
      expect(screen.queryByText('Ghi chú & Tài liệu tham chiếu')).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Công đoạn')).toHaveValue('stage-1');
    expect(screen.getAllByTestId('production-task-card')).toHaveLength(2);

    fireEvent.click(screen.getByText('Viết kịch bản cho Trang 1'));
    await waitFor(() => expect(screen.getByText('Huỷ việc')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Huỷ việc'));
    expect(screen.getByText('Xác nhận xoá?').closest('button')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do huỷ việc'), {
      target: { value: 'Đổi kế hoạch' },
    });
    fireEvent.click(screen.getByText('Xác nhận xoá?'));
    await waitFor(() => {
      expect(assignmentService.deleteAssignment).toHaveBeenCalledWith(
        'chap-1',
        'assign-1',
        'Đổi kế hoạch',
      );
      expect(screen.queryByText('Viết kịch bản cho Trang 1')).not.toBeInTheDocument();
    });
  });

  it('người làm bấm "Tiếp tục" được đưa tới Bàn làm việc đúng việc', async () => {
    renderBoard({ currentUserRole: 'WRITER', currentUserId: 'user-1' });
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục: Viết kịch bản cho Trang 1' }));
    await waitFor(() => expect(screen.getByText('MY WORK')).toBeInTheDocument());
  });

  it('mặc định là Bảng trang: mỗi trang một dòng, mỗi công đoạn một cột, ô trống khi chưa giao', async () => {
    renderBoard(
      { isProducer: true, currentUserRole: 'PRODUCER', currentUserId: 'producer-1' },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1',
    );

    const matrix = await screen.findByTestId('page-stage-matrix');
    expect(screen.getByRole('button', { name: 'Bảng trang' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const rowHeaders = within(matrix)
      .getAllByRole('rowheader')
      .map((h) => h.textContent);
    expect(rowHeaders[0]).toContain('Toàn chương');
    expect(rowHeaders[1]).toContain('Trang 1');
    expect(rowHeaders[2]).toContain('Trang 2');
    expect(
      within(matrix).getByRole('columnheader', { name: /Vẽ nét \(Pencil\)/ }),
    ).toBeInTheDocument();

    expect(
      within(matrix).getByRole('button', {
        name: /^Trang 2, Vẽ nét \(Pencil\): Đã nộp, Trần Thị Artist/,
      }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByLabelText('Trang 2, Kịch bản (Script): chưa giao'),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('production-task-card')).toHaveLength(0);
  });

  it('Bảng trang chỉ giữ các trang có việc khớp bộ lọc', async () => {
    renderBoard(
      { isProducer: true, currentUserRole: 'PRODUCER', currentUserId: 'producer-1' },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&filter=done',
    );

    const matrix = await screen.findByTestId('page-stage-matrix');
    const rowHeaders = within(matrix).getAllByRole('rowheader');
    expect(rowHeaders).toHaveLength(1);
    expect(rowHeaders[0].textContent).toContain('Toàn chương');
  });
});

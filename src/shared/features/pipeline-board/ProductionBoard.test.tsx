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
    getTaskGrid: vi.fn(),
    getStageTaskSubmissions: vi.fn(),
    startStageTask: vi.fn(),
    submitStageTasks: vi.fn(),
    approveStageTask: vi.fn(),
    requestStageTaskChanges: vi.fn(),
    reopenStageTask: vi.fn(),
    unassignStageTasks: vi.fn(),
    resolveStageTaskImpact: vi.fn(),
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
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/script/editor'
          element={<p>SCRIPT EDITOR</p>}
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
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue({
      chapterId: 'chap-1',
      stages: [],
      pages: [],
      tasks: [],
      lots: [],
    } as any);
    vi.mocked(assignmentService.getStageTaskSubmissions).mockResolvedValue([]);
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
    await waitFor(() => expect(screen.getByText('SCRIPT EDITOR')).toBeInTheDocument());
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

  it('Lát cắt 4 (Clean Cutover): khi chương đã có ô lưới V3 thì đọc trực tiếp từ getTaskGrid (không gọi getAssignmentsStrict) và điều hướng sang Lưới khi trống', async () => {
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce({
      chapterId: 'chap-1',
      stages: [
        {
          id: 'stage-2',
          name: 'Vẽ nét (Pencil)',
          stageOrder: 1,
          track: null,
          allowedRole: 'Artist',
          isApprovalGate: true,
          granularity: 'Page',
          isEnabled: true,
          prerequisiteStageIds: [],
        },
      ],
      pages: [
        { id: 'page-1', pageNumber: 1 },
        { id: 'page-2', pageNumber: 2 },
      ],
      lots: [
        {
          id: 'lot-1',
          pipelineStageId: 'stage-2',
          assigneeUserId: 'user-2',
          assignedRole: 'Artist',
          brief: 'Lô vẽ nét trang 1-2',
          dueDate: '2099-11-20T00:00:00Z',
          status: 'Active',
          isOverdue: false,
          taskCount: 1,
          approvedCount: 0,
          rowVersion: 1,
        },
      ],
      tasks: [
        {
          id: 'cell-1',
          pipelineStageId: 'stage-2',
          pageId: 'page-1',
          status: 'InProgress',
          lotId: 'lot-1',
          assigneeUserId: 'user-2',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: '2026-11-14T08:00:00Z',
          rowVersion: 1,
        },
        {
          id: 'cell-2',
          pipelineStageId: 'stage-2',
          pageId: 'page-2',
          status: 'Unassigned',
          lotId: null,
          assigneeUserId: null,
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: null,
          rowVersion: 1,
        },
      ],
    } as any);

    renderBoard({ isProducer: true, currentUserRole: 'PRODUCER', currentUserId: 'producer-1' });

    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(1));
    expect(assignmentService.getAssignmentsStrict).not.toHaveBeenCalled();
    expect(
      screen.getByText('Vẽ nét (Pencil) – Trần Thị Artist – Trang 1 (0/1)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lô vẽ nét trang 1-2')).toBeInTheDocument();
  });

  it('LỖI 3 & LỖI 2: Bảng công việc gom các ô cấp Trang theo từng Lô, giữ riêng ô cấp Chương, bỏ ảnh giả "Toàn chương (Kịch bản/Kế hoạch)" và mở thẻ hiện danh sách ô đúng quyền', async () => {
    const richGrid = {
      chapterId: 'chap-1',
      stages: [
        {
          id: 'stg-pencil',
          name: 'Pencil',
          stageOrder: 1,
          track: null,
          allowedRole: 'Artist',
          isApprovalGate: false,
          granularity: 'Page',
          isEnabled: true,
          prerequisiteStageIds: [],
        },
        {
          id: 'stg-review',
          name: 'Review',
          stageOrder: 5,
          track: null,
          allowedRole: 'Editor',
          isApprovalGate: true,
          granularity: 'Chapter',
          isEnabled: true,
          prerequisiteStageIds: ['stg-pencil'],
        },
      ],
      pages: [
        { id: 'page-1', pageNumber: 1 },
        { id: 'page-2', pageNumber: 2 },
      ],
      lots: [
        {
          id: 'lot-pencil-1',
          pipelineStageId: 'stg-pencil',
          assigneeUserId: 'user-2',
          assignedRole: 'Artist',
          brief: null,
          dueDate: '2099-11-20T00:00:00Z',
          status: 'Active',
          isOverdue: false,
          taskCount: 2,
          approvedCount: 1,
          rowVersion: 1,
        },
        {
          id: 'lot-review-1',
          pipelineStageId: 'stg-review',
          assigneeUserId: 'user-1',
          assignedRole: 'Editor',
          brief: null,
          dueDate: null,
          status: 'Active',
          isOverdue: false,
          taskCount: 1,
          approvedCount: 0,
          rowVersion: 1,
        },
      ],
      tasks: [
        {
          id: 'cell-p1',
          pipelineStageId: 'stg-pencil',
          pageId: 'page-1',
          status: 'Approved',
          lotId: 'lot-pencil-1',
          assigneeUserId: 'user-2',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: '2026-11-14T08:00:00Z',
          rowVersion: 2,
        },
        {
          id: 'cell-p2',
          pipelineStageId: 'stg-pencil',
          pageId: 'page-2',
          status: 'InProgress',
          lotId: 'lot-pencil-1',
          assigneeUserId: 'user-2',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: '2026-11-14T08:15:00Z',
          rowVersion: 1,
        },
        {
          id: 'cell-chap-review',
          pipelineStageId: 'stg-review',
          pageId: null,
          status: 'Submitted',
          lotId: 'lot-review-1',
          assigneeUserId: 'user-1',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: '2026-11-14T09:00:00Z',
          rowVersion: 1,
        },
      ],
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(richGrid as any);

    // 1) Artist mở bảng (filter=all): thấy đúng 2 thẻ (1 thẻ Lô Pencil + 1 thẻ cấp Chương Review), KHÔNG có ảnh giả
    const { unmount } = renderBoard(
      { currentUserRole: 'ARTIST', currentUserId: 'user-2', isProducer: false },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&filter=all&view=grid',
    );

    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(2));
    expect(screen.getByText('Pencil – Trần Thị Artist – Trang 1–2 (1/2)')).toBeInTheDocument();
    expect(screen.getByText('Review – Nguyễn Văn Writer – Toàn chương')).toBeInTheDocument();
    expect(screen.queryByText(/Toàn chương \(Kịch bản\/Kế hoạch\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Toàn chương \(Kế hoạch\)/i)).not.toBeInTheDocument();

    // Artist bấm mở thẻ Lô Pencil -> thấy danh sách 2 ô (Trang 1, Trang 2), chỉ thấy nút "Nộp" trên Trang 2, KHÔNG thấy "Mở lại" hay "Bỏ gán"
    fireEvent.click(screen.getByText('Pencil – Trần Thị Artist – Trang 1–2 (1/2)'));
    const lotSection = await screen.findByTestId('side-drawer-lot-cells');
    expect(within(lotSection).getByText('Trang 1')).toBeInTheDocument();
    expect(within(lotSection).getByText('Trang 2')).toBeInTheDocument();
    expect(within(lotSection).getByRole('button', { name: 'Nộp' })).toBeInTheDocument();
    expect(within(lotSection).queryByRole('button', { name: 'Mở lại' })).not.toBeInTheDocument();
    expect(within(lotSection).queryByRole('button', { name: 'Bỏ gán' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bỏ gán lô/i })).not.toBeInTheDocument();
    unmount();

    // 2) Producer mở cùng thẻ Lô -> thấy nút "Mở lại" (cho Trang 1 Approved) và "Bỏ gán" (cho Trang 2 InProgress)
    renderBoard(
      { currentUserRole: 'PRODUCER', currentUserId: 'producer-1', isProducer: true },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&view=grid',
    );
    await waitFor(() => expect(screen.getAllByTestId('production-task-card')).toHaveLength(2));
    fireEvent.click(screen.getByText('Pencil – Trần Thị Artist – Trang 1–2 (1/2)'));
    const producerLotSection = await screen.findByTestId('side-drawer-lot-cells');
    expect(within(producerLotSection).getByRole('button', { name: 'Mở lại' })).toBeInTheDocument();
    expect(within(producerLotSection).getByRole('button', { name: 'Bỏ gán' })).toBeInTheDocument();
  });

  it('Lát cắt 4: khi chương trống và có onOpenTaskGrid thì hiển thị nút Mở Lưới để giao việc thay vì tạo việc V2', async () => {
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce({
      chapterId: 'chap-1',
      stages: [],
      pages: [{ id: 'page-1', pageNumber: 1 }],
      lots: [],
      tasks: [
        {
          id: 'cell-unassigned',
          pipelineStageId: 'stage-2',
          pageId: 'page-1',
          status: 'Unassigned',
          lotId: null,
          assigneeUserId: null,
          isInputOutdated: false,
          isStartable: true,
          rowVersion: 1,
        },
      ],
    } as any);
    const onOpenTaskGrid = vi.fn();

    renderBoard({ isProducer: true, onOpenTaskGrid });
    const btn = await screen.findByRole('button', { name: /Mở Lưới để giao việc/i });
    fireEvent.click(btn);
    expect(onOpenTaskGrid).toHaveBeenCalledTimes(1);
  });

  it('Ma trận lưới + Nộp cả lô: hiện đủ trang của lô, làm mờ Cancelled, hiện lastDecisionComment và báo đúng message 409 khi Nộp cả lô', async () => {
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue({
      chapterId: 'chap-1',
      stages: [
        {
          id: 'stage-1',
          name: 'Pencil',
          stageOrder: 1,
          track: 'A',
          allowedRole: 'Artist',
          isApprovalGate: true,
          granularity: 'Page',
          isEnabled: true,
          prerequisiteStageIds: [],
        },
        {
          id: 'stage-2',
          name: 'Ink',
          stageOrder: 2,
          track: 'A',
          allowedRole: 'Artist',
          isApprovalGate: true,
          granularity: 'Page',
          isEnabled: true,
          prerequisiteStageIds: ['stage-1'],
        },
        {
          id: 'stage-color-off',
          name: 'Color',
          stageOrder: 3,
          track: 'A',
          allowedRole: 'Artist',
          isApprovalGate: true,
          granularity: 'Page',
          isEnabled: false,
          prerequisiteStageIds: ['stage-2'],
        },
      ],
      pages: [
        { id: 'page-1', pageNumber: 1 },
        { id: 'page-2', pageNumber: 2 },
      ],
      lots: [
        {
          id: 'lot-multi',
          pipelineStageId: 'stage-1',
          assigneeUserId: 'user-2',
          assignedRole: 'Artist',
          brief: 'Vẽ chì lô 2 trang',
          dueDate: null,
          status: 'Active',
          isOverdue: false,
          approvedCount: 0,
          taskCount: 2,
        },
      ],
      tasks: [
        {
          id: 'cell-p1-rework',
          pipelineStageId: 'stage-1',
          pageId: 'page-1',
          status: 'ReworkRequired',
          lotId: 'lot-multi',
          assigneeUserId: 'user-2',
          isInputOutdated: false,
          isStartable: true,
          rowVersion: 2,
        },
        {
          id: 'cell-p2-doing',
          pipelineStageId: 'stage-1',
          pageId: 'page-2',
          status: 'InProgress',
          lotId: 'lot-multi',
          assigneeUserId: 'user-2',
          isInputOutdated: false,
          isStartable: true,
          rowVersion: 1,
        },
        {
          id: 'cell-p1-ink-cancelled',
          pipelineStageId: 'stage-2',
          pageId: 'page-1',
          status: 'Cancelled',
          lotId: null,
          assigneeUserId: null,
          isInputOutdated: false,
          isStartable: false,
          rowVersion: 1,
        },
      ],
    } as any);
    vi.mocked(assignmentService.getStageTaskSubmissions).mockResolvedValue([
      {
        id: 'sub-1',
        attemptNumber: 1,
        status: 'Rejected',
        submittedByUserId: 'user-2',
        submittedAt: '2026-11-15T10:00:00Z',
        decisionComment: 'Chỉnh lại giải phẫu tay nhân vật chính',
        artworkReferenceIds: [],
      },
    ] as any);
    const conflictErr: any = new Error('Trang 2: Chưa có artwork cho công đoạn này');
    conflictErr.status = 409;
    vi.mocked(assignmentService.submitStageTasks).mockRejectedValueOnce(conflictErr);

    renderBoard(
      { currentUserRole: 'ARTIST', currentUserId: 'user-2', isProducer: false },
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&filter=all&view=matrix',
    );

    const matrix = await screen.findByTestId('page-stage-matrix');
    // Không hiện cột Color đang tắt
    expect(within(matrix).queryByText('Color')).not.toBeInTheDocument();
    // Hiện đủ cả Trang 1 và Trang 2 của lô trong ma trận
    expect(within(matrix).getByText('Trang 1')).toBeInTheDocument();
    expect(within(matrix).getByText('Trang 2')).toBeInTheDocument();
    // Ô Cancelled được làm mờ
    expect(within(matrix).getByTestId('matrix-cancelled-cell-page:page-1-stage-2')).toHaveTextContent(
      'Đã huỷ',
    );
    // Hiện lastDecisionComment ngay trong ô ReworkRequired trên ma trận
    expect(
      await within(matrix).findByTestId('matrix-rework-comment-lot-multi'),
    ).toHaveTextContent('Chỉnh lại giải phẫu tay nhân vật chính');

    // Mở chi tiết lô từ ô Trang 2 -> thấy cả lastDecisionComment và nút "Nộp cả lô"
    fireEvent.click(within(matrix).getByText('Đang làm'));
    const lotSection = await screen.findByTestId('side-drawer-lot-cells');
    expect(
      await within(lotSection).findByTestId('cell-last-decision-comment-cell-p1-rework'),
    ).toHaveTextContent('Chỉnh lại giải phẫu tay nhân vật chính');

    const submitWholeLotBtn = within(lotSection).getByTestId('submit-whole-lot-btn');
    fireEvent.click(submitWholeLotBtn);

    await waitFor(() => {
      expect(assignmentService.submitStageTasks).toHaveBeenCalledWith('chap-1', ['cell-p2-doing']);
    });
    expect(await screen.findByTestId('side-drawer-lot-submit-error')).toHaveTextContent(
      'Trang 2: Chưa có artwork cho công đoạn này',
    );
  });
});

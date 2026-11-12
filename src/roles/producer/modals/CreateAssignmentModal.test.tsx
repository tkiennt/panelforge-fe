import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { assignmentService } from '@/services/assignment.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/assignment.service', async () => {
  const actual = await vi.importActual<any>('@/services/assignment.service');
  return {
    ...actual,
    assignmentService: {
      getAssignments: vi.fn(),
      createAssignment: vi.fn(),
      transferAssignmentScope: vi.fn(),
      updateAssignment: vi.fn(),
      startAssignment: vi.fn(),
      getAssigneeSuggestions: vi.fn(),
      createBulkAssignments: vi.fn(),
      createAssignmentPlan: vi.fn(),
      getAssignmentPlanTemplate: vi.fn(),
    },
  };
});
vi.mock('@/services/series.service');
vi.mock('@/services/pipeline.service');
vi.mock('@/services/page.service');
vi.mock('@/services/panel.service');
vi.mock('@/services/workspace.service');

describe('CreateAssignmentModal', () => {
  const mockStages = [
    {
      id: 'stage-script',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      allowedRole: 'Writer' as const,
      isApprovalGate: false,
      isInitial: true,
      isTerminal: false,
    },
    {
      id: 'stage-thumbnail',
      name: 'Thumbnail',
      slug: 'thumbnail',
      stageOrder: 2,
      allowedRole: 'Artist' as const,
      isApprovalGate: false,
      isInitial: false,
      isTerminal: false,
    },
  ];

  const mockMembers = [
    {
      id: 'user-w1',
      userId: 'user-w1',
      seriesId: 'series-1',
      fullName: 'Nguyễn Văn Writer',
      email: 'writer@panelforge.app',
      studioRole: 'WRITER',
      seriesRole: 'WRITER',
      joinedAt: '2026-10-01',
    },
    {
      id: 'user-a1',
      userId: 'user-a1',
      seriesId: 'series-1',
      fullName: 'Trần Thị Artist',
      email: 'artist@panelforge.app',
      studioRole: 'ARTIST',
      seriesRole: 'ARTIST',
      joinedAt: '2026-10-01',
    },
  ];

  const mockPages = [
    {
      id: 'page-guid-001',
      chapterId: 'chap-1',
      pageNumber: 1,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
    {
      id: 'page-guid-002',
      chapterId: 'chap-1',
      pageNumber: 2,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
  ];

  const mockPanels = [
    {
      id: 'panel-guid-101',
      pageId: 'page-guid-001',
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: '{"x":0,"y":0,"width":800,"height":600}',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Manga Standard',
      stages: mockStages,
      transitions: [],
    });

    vi.mocked(seriesService.getSeriesMembers).mockResolvedValue(mockMembers);
    // Modal lấy người nhận từ thành viên Workspace; dữ liệu mẫu vẫn khai báo dạng thành viên Series nên chuyển đổi tại đây
    vi.mocked(workspaceService.getMembers).mockImplementation(async () =>
      (await seriesService.getSeriesMembers('', '')).map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        email: m.email,
        avatarUrl: m.avatarUrl,
        role: m.studioRole ?? m.seriesRole,
        isOwner: false,
        joinedAt: m.joinedAt,
        status: m.status,
      })),
    );
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssigneeSuggestions).mockResolvedValue([]);
    vi.mocked(assignmentService.createBulkAssignments).mockResolvedValue({
      batchId: 'batch-1',
      dryRun: false,
      granularity: 'Page',
      createdCount: 2,
      items: [],
    });
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue(mockPages);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue(mockPanels);
    vi.mocked(assignmentService.getAssignmentPlanTemplate).mockResolvedValue({
      sourceChapterId: 'chap-0',
      sourceChapterNumber: 0,
      stages: [
        {
          pipelineStageId: 'stage-script',
          stageName: 'Script',
          stageOrder: 1,
          assigneeUserId: 'user-writer',
          assigneeName: 'Nguyễn Văn Writer',
          brief: 'Kịch bản theo phong cách hài hước',
        },
        {
          pipelineStageId: 'stage-artist',
          stageName: 'Pencil & Ink',
          stageOrder: 2,
          assigneeUserId: 'user-artist',
          assigneeName: 'Trần Thị Artist',
          brief: 'Vẽ nét thanh mảnh',
        },
      ],
    });
    vi.mocked(assignmentService.createAssignmentPlan).mockResolvedValue({
      batchId: 'plan-batch-1',
      dryRun: false,
      createdCount: 2,
      stages: [
        {
          pipelineStageId: 'stage-script',
          stageName: 'Script',
          assigneeUserId: 'user-writer',
          granularity: 'Chapter',
          skippedReason: null,
          items: [],
        },
        {
          pipelineStageId: 'stage-artist',
          stageName: 'Pencil & Ink',
          assigneeUserId: 'user-artist',
          granularity: 'Page',
          skippedReason: null,
          items: [],
        },
      ],
    });
  });

  it('lọc danh sách người nhận theo vai trò của stage và tự động khớp (Point b)', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    // Đợi nạp xong dữ liệu
    await waitFor(() => {
      expect(screen.getByText(/Giao Việc Mới – Chương 1/i)).toBeInTheDocument();
    });

    // Mặc định stage đầu là Script (Writer) -> Người nhận phải là Nguyễn Văn Writer
    expect(screen.getByText(/Nguyễn Văn Writer/i)).toBeInTheDocument();
    expect(screen.queryByText(/Trần Thị Artist/i)).not.toBeInTheDocument();

    // Khi chuyển sang stage Thumbnail (Artist)
    const stageSelect = screen.getByLabelText(/Công đoạn Pipeline/i);
    fireEvent.change(stageSelect, { target: { value: 'stage-thumbnail' } });

    // Lúc này danh sách người nhận chỉ còn Trần Thị Artist
    await waitFor(() => {
      expect(screen.getByText(/Trần Thị Artist/i)).toBeInTheDocument();
      expect(screen.queryByText(/Nguyễn Văn Writer/i)).not.toBeInTheDocument();
    });
  });

  it('hiển thị cảnh báo rõ ràng khi Workspace chưa có ai mang vai trò yêu cầu (Point b)', async () => {
    // Chỉ có thành viên Artist, không có Writer
    vi.mocked(seriesService.getSeriesMembers).mockResolvedValueOnce([mockMembers[1]]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Chưa có thành viên nào trong Workspace có vai trò/i),
      ).toBeInTheDocument();
    });
  });

  it('thay ô gõ id bằng dropdown chọn Trang (Page) thật của chương (Point a)', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Phạm vi giao việc/i)).toBeInTheDocument();
    });

    // Chọn phạm vi Theo Trang (Page)
    fireEvent.change(screen.getByLabelText(/Phạm vi giao việc/i), {
      target: { value: 'Page' },
    });

    // Dropdown chọn trang xuất hiện thay vì ô gõ tay
    await waitFor(() => {
      expect(screen.getByLabelText(/Chọn Trang \(Page\)/i)).toBeInTheDocument();
    });

    // Kiểm tra các trang thật hiển thị trong dropdown
    expect(screen.getByText(/Trang 1 \(StandardPage • 1200×1800px\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Trang 2 \(StandardPage • 1200×1800px\)/i)).toBeInTheDocument();
  });

  it('chọn phạm vi Panel hiển thị dropdown chọn Trang và Khung hình thật (Point a)', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Phạm vi giao việc/i)).toBeInTheDocument();
    });

    // Chọn phạm vi Theo Khung hình (Panel)
    fireEvent.change(screen.getByLabelText(/Phạm vi giao việc/i), {
      target: { value: 'Panel' },
    });

    // Xuất hiện 2 bước: chọn Trang và chọn Khung hình
    await waitFor(() => {
      expect(screen.getByText(/Bước 1: Chọn Trang/i)).toBeInTheDocument();
      expect(screen.getByText(/Bước 2: Chọn Khung hình/i)).toBeInTheDocument();
      expect(screen.getByText(/Panel #1/i)).toBeInTheDocument();
    });
  });

  it('hiển thị chính xác thông báo lỗi khi Backend từ chối (Point c)', async () => {
    vi.mocked(assignmentService.createAssignment).mockRejectedValueOnce(
      new Error("Stage 'Script' dành cho vai trò Writer, người nhận là Artist."),
    );

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Yêu cầu công việc/i)).toBeInTheDocument();
    });

    // Nhập brief hợp lệ
    fireEvent.change(screen.getByLabelText(/Yêu cầu công việc/i), {
      target: { value: 'Viết kịch bản hồi 1' },
    });

    // Bấm Tạo & Giao việc
    fireEvent.click(screen.getByRole('button', { name: /Tạo & Giao Việc/i }));

    // Hiển thị đúng lỗi nghiệp vụ từ Backend
    await waitFor(() => {
      expect(
        screen.getByText("Stage 'Script' dành cho vai trò Writer, người nhận là Artist."),
      ).toBeInTheDocument();
    });
  });

  it('ẩn các công đoạn đã tắt (isEnabled === false) khỏi dropdown chọn stage', async () => {
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValueOnce({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Default Pipeline',
      stages: [
        {
          id: 'stage-script',
          name: 'Script',
          slug: 'script',
          stageOrder: 1,
          allowedRole: 'Writer',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'stage-color',
          name: 'Color Stage',
          slug: 'color',
          stageOrder: 2,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: false,
        },
      ],
      transitions: [],
    } as any);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Công đoạn Pipeline/i)).toBeInTheDocument();
    });

    const stageSelect = screen.getByLabelText(/Công đoạn Pipeline/i) as HTMLSelectElement;
    expect(stageSelect).toHaveTextContent('Script');
    expect(stageSelect).not.toHaveTextContent('Color Stage');
  });

  it('ẩn các công đoạn kết thúc (isTerminal === true, ví dụ Approved) khỏi dropdown chọn stage và chế độ kế hoạch', async () => {
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValueOnce({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Default Pipeline',
      stages: [
        {
          id: 'stage-script',
          name: 'Script',
          slug: 'script',
          stageOrder: 1,
          allowedRole: 'Writer',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'stage-approved',
          name: 'Approved',
          slug: 'approved',
          stageOrder: 2,
          allowedRole: 'Editor',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: true,
          isEnabled: true,
        },
      ],
      transitions: [],
    } as any);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Công đoạn Pipeline/i)).toBeInTheDocument();
    });

    const stageSelect = screen.getByLabelText(/Công đoạn Pipeline/i) as HTMLSelectElement;
    expect(stageSelect).toHaveTextContent('Script');
    expect(stageSelect).not.toHaveTextContent('Approved');

    // Chuyển sang chế độ Kế hoạch toàn chương, kiểm tra không có card cho stage Approved
    fireEvent.click(screen.getByRole('button', { name: /Kế hoạch toàn chương/i }));
    await waitFor(() => {
      expect(screen.getByText(/Các công đoạn phân công/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1\. Script/i)).toBeInTheDocument();
    expect(screen.queryByText(/2\. Approved/i)).not.toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi thân thiện khi Backend trả HTTP 400 chặn giao việc vào công đoạn kết thúc', async () => {
    const errorMsg =
      "Công đoạn 'Approved' là công đoạn kết thúc, không giao việc được. Hãy giao ở công đoạn duyệt trước đó.";
    vi.mocked(assignmentService.createAssignment).mockRejectedValueOnce(new Error(errorMsg));

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Yêu cầu công việc/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Yêu cầu công việc/i), {
      target: { value: 'Nhiệm vụ kiểm tra kết thúc' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo & Giao Việc/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it('lọc danh sách người nhận theo vai trò trong Workspace (studioRole) và chỉ lấy thành viên Active', async () => {
    vi.mocked(seriesService.getSeriesMembers).mockResolvedValueOnce([
      {
        id: 'user-active-w',
        userId: 'user-active-w',
        seriesId: 'series-1',
        fullName: 'Active Writer',
        email: 'active.w@panelforge.app',
        studioRole: 'WRITER',
        seriesRole: 'ARTIST', // seriesRole khác studioRole: phải ưu tiên studioRole của Workspace
        joinedAt: '2026-10-01',
        status: 'Active',
      },
      {
        id: 'user-pending-w',
        userId: 'user-pending-w',
        seriesId: 'series-1',
        fullName: 'Pending Writer',
        email: 'pending.w@panelforge.app',
        studioRole: 'WRITER',
        seriesRole: 'WRITER',
        joinedAt: '2026-10-01',
        status: 'Pending', // Chưa chấp nhận lời mời -> bị loại bỏ
      },
      {
        id: 'user-rejected-w',
        userId: 'user-rejected-w',
        seriesId: 'series-1',
        fullName: 'Rejected Writer',
        email: 'rejected.w@panelforge.app',
        studioRole: 'WRITER',
        seriesRole: 'WRITER',
        joinedAt: '2026-10-01',
        status: 'Rejected', // Đã từ chối lời mời -> bị loại bỏ
      },
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Giao Việc Mới – Chương 1/i)).toBeInTheDocument();
    });

    // Chỉ có Active Writer xuất hiện
    expect(screen.getByText(/Active Writer/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pending Writer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rejected Writer/i)).not.toBeInTheDocument();
  });

  it('không dùng stage giả khi pipelineData rỗng/lỗi, hiển thị cảnh báo và khóa nút giao việc', async () => {
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValueOnce({
      id: 'pipe-empty',
      seriesId: 'series-1',
      name: 'Empty Pipeline',
      stages: [],
      transitions: [],
    } as any);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Không có công đoạn Pipeline hợp lệ/i)).toBeInTheDocument();
    });

    // Nút giao việc phải bị vô hiệu hóa
    const submitBtn = screen.getByRole('button', { name: /Tạo & Giao Việc/i });
    expect(submitBtn).toBeDisabled();
  });

  it('khoá trang đã được giao ở stage đang chọn và vô hiệu hoá giao việc cho cả chương khi đã có việc theo trang/khung', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([
      {
        id: 'assign-1',
        seriesId: 'series-1',
        chapterId: 'chap-1',
        pipelineStageId: 'stage-script',
        entityType: 'Page',
        targetEntityId: 'page-guid-001',
        assigneeUserId: 'user-w1',
        assignedRole: 'Writer',
        brief: 'Vẽ trang 1',
        priority: 'Medium',
        status: 'InProgress',
        createdAt: '2026-10-21T00:00:00Z',
      } as any,
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Phạm vi giao việc/i)).toBeInTheDocument();
    });

    // Tuỳ chọn Chapter bị vô hiệu hoá do stage-script đã có việc theo Page
    const entityTypeSelect = screen.getByLabelText(/Phạm vi giao việc/i) as HTMLSelectElement;
    const chapterOption = Array.from(entityTypeSelect.options).find(
      (opt) => opt.value === 'Chapter',
    );
    expect(chapterOption).toBeDisabled();
    expect(chapterOption?.textContent).toContain('Đã có việc theo trang/khung');

    // Chuyển sang phạm vi Theo Trang (Page)
    fireEvent.change(entityTypeSelect, { target: { value: 'Page' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/Chọn Trang \(Page\)/i)).toBeInTheDocument();
    });

    // Trang 1 đã được giao ở stage-script nên bị disabled và có ghi chú
    const pageSelect = screen.getByLabelText(/Chọn Trang \(Page\)/i) as HTMLSelectElement;
    const page1Option = Array.from(pageSelect.options).find((opt) => opt.value === 'page-guid-001');
    const page2Option = Array.from(pageSelect.options).find((opt) => opt.value === 'page-guid-002');

    expect(page1Option).toBeDisabled();
    expect(page1Option?.textContent).toContain('Đã giao việc ở stage này');
    expect(page2Option).not.toBeDisabled();
  });

  it('khoá toàn bộ tuỳ chọn giao việc và hiển thị cảnh báo khi cả chương đã được giao việc ở stage đang chọn', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([
      {
        id: 'assign-chap',
        seriesId: 'series-1',
        chapterId: 'chap-1',
        pipelineStageId: 'stage-script',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        assigneeUserId: 'user-w1',
        assignedRole: 'Writer',
        brief: 'Viết toàn bộ kịch bản chương',
        priority: 'High',
        status: 'InProgress',
        createdAt: '2026-10-21T00:00:00Z',
      } as any,
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    // Cảnh báo trùng phạm vi xuất hiện và nút giao việc bị khoá
    await waitFor(() => {
      expect(screen.getByText(/Trùng lặp phạm vi giao việc \(409 Conflict\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Công đoạn "Script" đã được giao cho cả chương. Không thể tạo thêm phân công/i,
        ),
      ).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Tạo & Giao Việc/i });
    expect(submitBtn).toBeDisabled();
  });

  it('cho phép tách trang hoặc khung khi công đoạn Artist đã có việc cả chương đang InProgress', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([
      {
        id: 'assign-chap-art',
        seriesId: 'series-1',
        chapterId: 'chap-1',
        pipelineStageId: 'stage-thumbnail',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        assigneeUserId: 'user-a1',
        assignedRole: 'Artist',
        brief: 'Vẽ thumbnail toàn bộ chương',
        priority: 'High',
        status: 'InProgress',
        createdAt: '2026-10-21T00:00:00Z',
      } as any,
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        initialPipelineStageId='stage-thumbnail'
        initialEntityType='Page'
        onClose={vi.fn()}
      />,
    );

    // Kiểm tra không có cảnh báo xung đột chặn tạo
    await waitFor(() => {
      expect(screen.getByText(/Chuyển giao trang\/khung:/i)).toBeInTheDocument();
    });

    const entityTypeSelect = screen.getByLabelText(
      /Phạm vi giao việc \(Entity Type\)/i,
    ) as HTMLSelectElement;
    expect(entityTypeSelect.value).toBe('Page');

    const pageOption = Array.from(entityTypeSelect.options).find((opt) => opt.value === 'Page');
    expect(pageOption).not.toBeDisabled();
    expect(pageOption?.textContent).toContain('Tách từ việc cả chương');

    // Nút giao việc vẫn mở khi đã chọn đủ thông tin
    const briefInput = screen.getByLabelText(/Yêu cầu công việc/i);
    fireEvent.change(briefInput, { target: { value: 'Tách vẽ trang 1' } });

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /Tạo & Giao Việc/i });
      expect(submitBtn).not.toBeDisabled();
    });

    // Phần nằm trong việc cả chương: gọi chuyển giao (không tạo việc chồng phạm vi), brief làm lý do
    vi.mocked(assignmentService.transferAssignmentScope).mockResolvedValueOnce([
      { id: 'assign-part' } as any,
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Tạo & Giao Việc/i }));
    await waitFor(() => {
      expect(assignmentService.transferAssignmentScope).toHaveBeenCalledWith(
        'chap-1',
        'assign-chap-art',
        expect.objectContaining({ targetType: 'Page', reason: 'Tách vẽ trang 1' }),
      );
    });
    expect(assignmentService.createAssignment).not.toHaveBeenCalled();
  });
  it('cho phép chuyển giao nhiều trang cùng lúc với ô lý do riêng (Task 3)', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([
      {
        id: 'assign-chap-art',
        chapterId: 'chap-1',
        pipelineStageId: 'stage-thumbnail',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        status: 'InProgress',
        assignedRole: 'Artist',
        assigneeUserId: 'user-art-main',
        brief: 'Vẽ toàn chương',
        createdAt: '2026-10-20',
      } as any,
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        initialPipelineStageId='stage-thumbnail'
        initialEntityType='Page'
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Chuyển giao trang\/khung:/i)).toBeInTheDocument();
    });

    // Nhập brief và lý do chuyển giao riêng
    const briefInput = screen.getByLabelText(/Yêu cầu công việc/i);
    fireEvent.change(briefInput, { target: { value: 'Vẽ chì hoàn thiện' } });

    const transferReasonInput = screen.getByLabelText(/Lý do chuyển giao/i);
    fireEvent.change(transferReasonInput, { target: { value: 'Phân tải cho hoạ sĩ khác' } });

    // Chọn thêm trang 2
    const page2Checkbox = screen.getByLabelText('Chọn trang 2');
    fireEvent.click(page2Checkbox);

    vi.mocked(assignmentService.transferAssignmentScope).mockResolvedValueOnce([
      { id: 'assign-part-1' } as any,
      { id: 'assign-part-2' } as any,
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Tạo & Giao Việc/i }));

    await waitFor(() => {
      expect(assignmentService.transferAssignmentScope).toHaveBeenCalledWith(
        'chap-1',
        'assign-chap-art',
        expect.objectContaining({
          targetType: 'Page',
          targetIds: expect.arrayContaining(['page-guid-001', 'page-guid-002']),
          reason: 'Phân tải cho hoạ sĩ khác',
          brief: 'Vẽ chì hoàn thiện',
        }),
      );
    });
    expect(assignmentService.createAssignment).not.toHaveBeenCalled();
  });

  it('nạp gợi ý ứng viên tối ưu từ Backend và hiển thị chip lý do đề xuất', async () => {
    vi.mocked(assignmentService.getAssigneeSuggestions).mockResolvedValueOnce([
      {
        userId: 'user-w1',
        fullName: 'Nguyễn Văn Writer',
        avatarUrl: null,
        role: 2 as any,
        activeAssignmentCount: 0,
        overdueCount: 0,
        stageExperienceCount: 5,
        isSeriesMember: true,
        reasons: ['Không có việc đang mở', 'Nhiều kinh nghiệm viết kịch bản'],
      },
    ]);

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Giao Việc Mới – Chương 1/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('assignee-reasons')).toBeInTheDocument();
      expect(screen.getByText(/Không có việc đang mở/i)).toBeInTheDocument();
      expect(screen.getByText(/Nhiều kinh nghiệm viết kịch bản/i)).toBeInTheDocument();
    });
  });

  it('hỗ trợ chế độ giao việc hàng loạt (Bulk): chọn nhiều trang, kiểm tra xung đột dryRun và gửi bulk assignment', async () => {
    const onShowToast = vi.fn();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        initialPipelineStageId='stage-thumbnail'
        initialEntityType='Page'
        onClose={onClose}
        onSuccess={onSuccess}
        onShowToast={onShowToast}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Giao hàng loạt \(Bulk\)/i)).toBeInTheDocument();
    });

    // Bật chế độ giao hàng loạt
    const bulkCheckbox = screen.getByRole('checkbox', { name: /Giao hàng loạt \(Bulk\)/i });
    fireEvent.click(bulkCheckbox);

    expect(screen.getByTestId('bulk-page-section')).toBeInTheDocument();

    // Nhập brief
    const briefInput = screen.getByLabelText(/Yêu cầu công việc/i);
    fireEvent.change(briefInput, { target: { value: 'Vẽ phác thảo thumbnail hàng loạt' } });

    // Mock kết quả dryRun phát hiện trang 2 bị xung đột
    vi.mocked(assignmentService.createBulkAssignments).mockResolvedValueOnce({
      batchId: null,
      dryRun: true,
      granularity: 'Page',
      createdCount: 0,
      items: [
        {
          entityType: 'Page',
          targetEntityId: 'page-guid-001',
          pageNumber: 1,
          conflictReason: null,
          assignmentId: null,
          dependsOnAssignmentIds: ['asg-script-1'],
        },
        {
          entityType: 'Page',
          targetEntityId: 'page-guid-002',
          pageNumber: 2,
          conflictReason: 'Trang 2 đã có việc ở stage này',
          assignmentId: null,
          dependsOnAssignmentIds: null,
        },
      ],
    });

    // Bấm kiểm tra xung đột (Dry Run)
    const dryRunBtn = screen.getByRole('button', { name: /Kiểm tra xung đột trước/i });
    fireEvent.click(dryRunBtn);

    await waitFor(() => {
      expect(assignmentService.createBulkAssignments).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          dryRun: true,
          pipelineStageId: 'stage-thumbnail',
          brief: 'Vẽ phác thảo thumbnail hàng loạt',
        }),
      );
      expect(screen.getByText(/Trang 2 đã có việc ở stage này/i)).toBeInTheDocument();
      expect(screen.getByText(/Bỏ chọn các trang bị xung đột/i)).toBeInTheDocument();
    });

    // Bấm bỏ chọn các trang xung đột
    fireEvent.click(screen.getByRole('button', { name: /Bỏ chọn các trang bị xung đột/i }));

    // Mock kết quả gửi tạo thật
    vi.mocked(assignmentService.createBulkAssignments).mockResolvedValueOnce({
      batchId: 'batch-001',
      dryRun: false,
      granularity: 'Page',
      createdCount: 1,
      items: [
        {
          entityType: 'Page',
          targetEntityId: 'page-guid-001',
          pageNumber: 1,
          conflictReason: null,
          assignmentId: 'asg-bulk-1',
          dependsOnAssignmentIds: ['asg-script-1'],
        },
      ],
    });

    // Bấm nút submit giao việc hàng loạt
    const submitBtn = screen.getByRole('button', { name: /Giao việc hàng loạt/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignmentService.createBulkAssignments).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          dryRun: false,
          pageIds: ['page-guid-001'],
          brief: 'Vẽ phác thảo thumbnail hàng loạt',
        }),
      );
      expect(onShowToast).toHaveBeenCalledWith(
        'Giao việc hàng loạt thành công',
        expect.stringContaining('Thumbnail'),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('chặn chọn ngày quá khứ cho hạn hoàn thành (Due Date) bằng thuộc tính min và validation', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Yêu cầu công việc/i)).toBeInTheDocument();
    });

    const dueDateInput = screen.getByLabelText(/Hạn hoàn thành/i) as HTMLInputElement;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Kiểm tra thuộc tính min được gắn ngày hôm nay
    expect(dueDateInput.min).toBe(todayStr);

    // Điền brief
    fireEvent.change(screen.getByLabelText(/Yêu cầu công việc/i), {
      target: { value: 'Kịch bản thử nghiệm' },
    });

    // Thử cố tình nhập ngày hôm qua
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    fireEvent.change(dueDateInput, { target: { value: yesterdayStr } });

    // Submit form
    const form = document.getElementById('create-assignment-form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Hạn hoàn thành không thể ở trong quá khứ/i)).toBeInTheDocument();
    });
    expect(assignmentService.createAssignment).not.toHaveBeenCalled();
  });

  it('hỗ trợ các nút gợi ý hạn nhanh (+3 ngày, +1 tuần, +2 tuần)', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/\+3 ngày/i)).toBeInTheDocument();
    });

    const dueDateInput = screen.getByLabelText(/Hạn hoàn thành/i) as HTMLInputElement;

    // Bấm gợi ý +3 ngày
    fireEvent.click(screen.getByRole('button', { name: /\+3 ngày/i }));
    const d3 = new Date();
    d3.setDate(d3.getDate() + 3);
    const d3Str = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-${String(d3.getDate()).padStart(2, '0')}`;
    expect(dueDateInput.value).toBe(d3Str);

    // Bấm Xóa hạn
    expect(screen.getByRole('button', { name: /Xóa hạn/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xóa hạn/i }));
    expect(dueDateInput.value).toBe('');
  });

  it('áp dụng mẫu chương trước trong chế độ đơn bằng nút apply-stage-template-btn', async () => {
    const onShowToast = vi.fn();
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
        onShowToast={onShowToast}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('apply-stage-template-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('apply-stage-template-btn'));

    await waitFor(() => {
      expect(assignmentService.getAssignmentPlanTemplate).toHaveBeenCalledWith('chap-1');
      expect(onShowToast).toHaveBeenCalledWith('Đã nạp mẫu', expect.stringContaining('Chương 0'));
    });

    const briefInput = screen.getByLabelText(/Yêu cầu công việc/i) as HTMLTextAreaElement;
    expect(briefInput.value).toBe('Kịch bản theo phong cách hài hước');
  });

  it('chuyển đổi giữa chế độ công đoạn và kế hoạch toàn chương', async () => {
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-mode-single')).toBeInTheDocument();
      expect(screen.getByTestId('tab-mode-plan')).toBeInTheDocument();
    });

    // Chuyển sang Kế hoạch toàn chương
    fireEvent.click(screen.getByTestId('tab-mode-plan'));

    await waitFor(() => {
      expect(screen.getByText(/Giao việc toàn chương theo kế hoạch/i)).toBeInTheDocument();
      expect(screen.getByTestId('load-plan-template-btn')).toBeInTheDocument();
      expect(screen.getByTestId('submit-plan-btn')).toBeInTheDocument();
    });

    // Chuyển lại về chế độ công đoạn
    fireEvent.click(screen.getByTestId('tab-mode-single'));
    await waitFor(() => {
      expect(screen.getByLabelText(/Công đoạn Pipeline/i)).toBeInTheDocument();
    });
  });

  it('nạp mẫu kế hoạch toàn chương từ chương trước', async () => {
    const onShowToast = vi.fn();
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
        onShowToast={onShowToast}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-mode-plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-mode-plan'));

    await waitFor(() => {
      expect(screen.getByTestId('load-plan-template-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('load-plan-template-btn'));

    await waitFor(() => {
      expect(assignmentService.getAssignmentPlanTemplate).toHaveBeenCalledWith('chap-1');
      expect(onShowToast).toHaveBeenCalledWith(
        'Đã nạp mẫu kế hoạch',
        expect.stringContaining('Chương 0'),
      );
    });
  });

  it('hỗ trợ kiểm tra trước (Dry Run) kế hoạch toàn chương', async () => {
    const onShowToast = vi.fn();
    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={vi.fn()}
        onShowToast={onShowToast}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-mode-plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-mode-plan'));

    await waitFor(() => {
      expect(screen.getByTestId('dry-run-plan-btn')).toBeInTheDocument();
    });

    // Nhập brief chung
    const generalBrief = screen.getByLabelText(/Yêu cầu chung toàn chương/i);
    fireEvent.change(generalBrief, { target: { value: 'Brief tổng quan toàn chương 1' } });

    // Bấm kiểm tra trước
    fireEvent.click(screen.getByTestId('dry-run-plan-btn'));

    await waitFor(() => {
      expect(assignmentService.createAssignmentPlan).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          dryRun: true,
          brief: 'Brief tổng quan toàn chương 1',
        }),
      );
      expect(onShowToast).toHaveBeenCalledWith(
        'Kiểm tra kế hoạch',
        expect.stringContaining('Dự kiến tạo 2 công việc'),
      );
    });

    expect(screen.getByText(/Kiểm tra kế hoạch hoàn tất/i)).toBeInTheDocument();
  });

  it('giao kế hoạch toàn chương thành công qua createAssignmentPlan', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const onShowToast = vi.fn();

    render(
      <CreateAssignmentModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        onClose={onClose}
        onSuccess={onSuccess}
        onShowToast={onShowToast}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-mode-plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-mode-plan'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-plan-btn')).toBeInTheDocument();
    });

    // Nhập brief chung
    const generalBrief = screen.getByLabelText(/Yêu cầu chung toàn chương/i);
    fireEvent.change(generalBrief, { target: { value: 'Giao trọn gói kịch bản và vẽ' } });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-plan-btn'));

    await waitFor(() => {
      expect(assignmentService.createAssignmentPlan).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          dryRun: false,
          brief: 'Giao trọn gói kịch bản và vẽ',
        }),
      );
      expect(onShowToast).toHaveBeenCalledWith(
        'Giao kế hoạch thành công',
        expect.stringContaining('Đã tạo 2 công việc'),
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

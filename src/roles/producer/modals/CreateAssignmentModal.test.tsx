import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { assignmentService } from '@/services/assignment.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';

vi.mock('@/services/assignment.service', async () => {
  const actual = await vi.importActual<any>('@/services/assignment.service');
  return {
    ...actual,
    assignmentService: {
      getAssignments: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      startAssignment: vi.fn(),
    },
  };
});
vi.mock('@/services/series.service');
vi.mock('@/services/pipeline.service');
vi.mock('@/services/page.service');
vi.mock('@/services/panel.service');

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
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue(mockPages);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue(mockPanels);
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
      expect(screen.getByText(/Tách trang\/khung:/i)).toBeInTheDocument();
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
  });
});

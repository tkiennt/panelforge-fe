import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskGridBoard } from './TaskGridBoard';
import { assignmentService } from '@/services/assignment.service';
import { workspaceService } from '@/services/workspace.service';
import { chapterService } from '@/services/chapter.service';
import { elementService } from '@/services/element.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { parseStageTaskCanvasVersions, parseStageTaskPanelLayout } from '@/types';
import { aiAgentsService, AiApiError } from '@/services/aiAgents.service';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getTaskGrid: vi.fn(),
    getAutoAssignPlan: vi.fn(),
    generateTaskGrid: vi.fn(),
    assignTaskGridLots: vi.fn(),
    updateStageTaskLot: vi.fn(),
    startStageTask: vi.fn(),
    submitStageTasks: vi.fn(),
    withdrawStageTask: vi.fn(),
    openStageTaskReview: vi.fn(),
    releaseStageTaskReview: vi.fn(),
    approveStageTask: vi.fn(),
    requestStageTaskChanges: vi.fn(),
    getStageTaskSubmissions: vi.fn(),
    reopenStageTask: vi.fn(),
    resolveStageTaskImpact: vi.fn(),
    unassignStageTasks: vi.fn(),
    migrateAssignmentsToGrid: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getScriptVersions: vi.fn().mockResolvedValue([]),
    getChapterById: vi.fn().mockResolvedValue({ id: 'chap-1', seriesId: 'se-1' }),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn().mockResolvedValue([]),
    getArtworkAccessLink: vi.fn().mockResolvedValue({ url: '/mock-art.png' }),
  },
  resolveArtworkUrl: vi.fn((u: string) => `http://localhost:5044${u}`),
}));

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/element.service', () => ({
  elementService: {
    getPageSnapshot: vi.fn().mockResolvedValue({ elements: [] }),
  },
}));

vi.mock('@/shared/utils/compositePageRenderer', () => ({
  buildPageComposite: vi.fn().mockResolvedValue({
    dataUrl: 'data:image/png;base64,COMPOSITE_OK',
    mode: 'panels',
    failedImages: 0,
  }),
}));

vi.mock('@/shared/utils/stageArtworks', () => ({
  loadPreviousStageArtworks: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/shared/components/image-viewer/ImageViewerLightbox', () => ({
  ImageViewerLightbox: ({
    isOpen,
    slides,
  }: {
    isOpen: boolean;
    slides: Array<{ src: string; title?: string }>;
  }) =>
    isOpen ? (
      <div data-testid='mock-replay-lightbox'>
        {slides.map((s, idx) => (
          <div key={idx} data-testid={`replay-slide-${idx}`}>
            {s.title} | {s.src}
          </div>
        ))}
      </div>
    ) : null,
}));

describe('TaskGridBoard (Lưới giao việc V3 – Lát cắt 1)', () => {
  const mockGrid = {
    chapterId: 'chap-1',
    stages: [
      {
        id: 'stg-pencil',
        name: 'Pencil',
        stageOrder: 1,
        track: null,
        allowedRole: 'Artist',
        isApprovalGate: false,
        granularity: 'Page' as const,
        isEnabled: true,
        prerequisiteStageIds: [],
      },
      {
        id: 'stg-ink',
        name: 'Ink',
        stageOrder: 2,
        track: 'A',
        allowedRole: 'Artist',
        isApprovalGate: true,
        granularity: 'Page' as const,
        isEnabled: true,
        prerequisiteStageIds: ['stg-pencil'],
      },
    ],
    pages: [
      { id: 'page-1', pageNumber: 1 },
      { id: 'page-2', pageNumber: 2 },
    ],
    tasks: [
      {
        id: 'task-p1-pencil',
        pipelineStageId: 'stg-pencil',
        pageId: 'page-1',
        status: 'Unassigned' as const,
        lotId: null,
        assigneeUserId: null,
        isInputOutdated: false,
        outdatedReason: null,
        reviewerUserId: null,
        isStartable: false,
        startedAt: null,
        rowVersion: 1,
      },
      {
        id: 'task-p2-pencil',
        pipelineStageId: 'stg-pencil',
        pageId: 'page-2',
        status: 'Assigned' as const,
        lotId: 'lot-1',
        assigneeUserId: 'user-artist-1',
        isInputOutdated: false,
        outdatedReason: null,
        reviewerUserId: null,
        isStartable: true,
        startedAt: null,
        rowVersion: 1,
      },
      {
        id: 'task-p1-ink',
        pipelineStageId: 'stg-ink',
        pageId: 'page-1',
        status: 'InProgress' as const,
        lotId: 'lot-2',
        assigneeUserId: 'user-artist-1',
        isInputOutdated: true,
        outdatedReason: 'Pencil trang 1 vừa mở lại',
        reviewerUserId: null,
        isStartable: true,
        startedAt: '2026-11-14T08:00:00Z',
        rowVersion: 2,
      },
      {
        id: 'task-p2-ink',
        pipelineStageId: 'stg-ink',
        pageId: 'page-2',
        status: 'Submitted' as const,
        lotId: 'lot-2',
        assigneeUserId: 'user-artist-1',
        isInputOutdated: false,
        outdatedReason: null,
        reviewerUserId: null,
        isStartable: true,
        startedAt: '2026-11-14T08:00:00Z',
        rowVersion: 3,
      },
    ],
    lots: [
      {
        id: 'lot-1',
        pipelineStageId: 'stg-pencil',
        assigneeUserId: 'user-artist-1',
        assignedRole: 'Artist',
        brief: 'Vẽ chì chương 1',
        dueDate: '2026-11-20T00:00:00Z',
        status: 'Active' as const,
        isOverdue: false,
        taskCount: 1,
        approvedCount: 0,
        rowVersion: 1,
      },
    ],
  };

  const mockMembers = [
    {
      userId: 'user-artist-1',
      fullName: 'Hoạ sĩ A',
      username: 'artist1',
      email: 'artist1@test.com',
      role: 'Artist',
      status: 'Active',
      joinedAt: '2026-10-01T00:00:00Z',
    },
    {
      userId: 'user-artist-2',
      fullName: 'Hoạ sĩ B',
      username: 'artist2',
      email: 'artist2@test.com',
      role: 'Artist',
      status: 'Active',
      joinedAt: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(mockGrid as any);
    vi.mocked(workspaceService.getMembers).mockResolvedValue(mockMembers as any);
  });

  it('hiển thị các cột công đoạn (kèm Nhánh A / Gate), các hàng Trang và cảnh báo Đầu vào lỗi thời', async () => {
    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    expect(await screen.findByText('1. Pencil')).toBeInTheDocument();
    expect(screen.getByText('2. Ink')).toBeInTheDocument();
    expect(screen.getByText('Nhánh A')).toBeInTheDocument();
    expect(screen.getByText('Trang 1')).toBeInTheDocument();
    expect(screen.getByText('Trang 2')).toBeInTheDocument();
    expect(screen.getByText('Đầu vào lỗi thời')).toBeInTheDocument();
  });

  it('Producer bấm "Sinh / Đồng bộ ô việc" gọi generateTaskGrid, hiện toast "Đã tạo X ô, huỷ Y ô" và tải lại lưới', async () => {
    const onShowToast = vi.fn();
    vi.mocked(assignmentService.generateTaskGrid).mockResolvedValueOnce({
      created: 4,
      cancelled: 2,
      total: 4,
    });

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
        onShowToast={onShowToast}
      />,
    );

    await screen.findByText('1. Pencil');
    fireEvent.click(screen.getByRole('button', { name: /Sinh \/ Đồng bộ ô việc/i }));

    await waitFor(() => {
      expect(assignmentService.generateTaskGrid).toHaveBeenCalledWith('chap-1');
    });
    expect(onShowToast).toHaveBeenCalledWith(
      'Đã đồng bộ lưới ô việc',
      expect.stringContaining('Đã tạo 4 ô, huỷ 2 ô'),
    );
  });

  it('Producer chọn ô trống và giao lô (kèm Dry Run)', async () => {
    vi.mocked(assignmentService.assignTaskGridLots).mockResolvedValue({
      dryRun: true,
      taskCount: 1,
      lots: [],
    });

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');
    fireEvent.click(screen.getByLabelText('Chọn ô Pencil'));
    fireEvent.click(screen.getByLabelText('Giao cho Hoạ sĩ A'));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra thử \(Dry Run\)/i }));

    await waitFor(() => {
      expect(assignmentService.assignTaskGridLots).toHaveBeenCalledWith('chap-1', {
        lots: [
          {
            pipelineStageId: 'stg-pencil',
            assigneeUserId: 'user-artist-1',
            taskIds: ['task-p1-pencil'],
            brief: null,
            dueDate: null,
          },
        ],
        dryRun: true,
      });
    });
    expect(await screen.findByText(/Kiểm tra hợp lệ/i)).toBeInTheDocument();
  });

  it('Người nhận việc bấm Bắt đầu và Nộp ô việc (khi không lỗi thời); Reviewer bấm Duyệt ô đã nộp', async () => {
    const cleanGrid = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p1-ink' ? { ...t, isInputOutdated: false, outdatedReason: null } : t,
      ),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(cleanGrid as any);
    vi.mocked(assignmentService.startStageTask).mockResolvedValueOnce({} as any);
    vi.mocked(assignmentService.submitStageTasks).mockResolvedValueOnce([
      { id: 'task-p1-ink', status: 'Submitted' } as any,
    ]);
    vi.mocked(assignmentService.approveStageTask).mockResolvedValueOnce({} as any);

    const { rerender } = render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-artist-1'
        currentUserRole='Artist'
      />,
    );

    await screen.findByText('1. Pencil');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    await waitFor(() => {
      expect(assignmentService.startStageTask).toHaveBeenCalledWith('chap-1', 'task-p2-pencil');
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Nộp' })[0]);
    await waitFor(() => {
      expect(assignmentService.submitStageTasks).toHaveBeenCalledWith('chap-1', ['task-p1-ink']);
    });

    // Chuyển sang Editor để duyệt ô Submitted (khác người làm theo BR-06)
    rerender(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-editor-1'
        currentUserRole='Editor'
        isEditor={true}
      />,
    );

    fireEvent.click((await screen.findAllByRole('button', { name: 'Duyệt' }))[1]);
    await waitFor(() => {
      expect(assignmentService.approveStageTask).toHaveBeenCalledWith('chap-1', 'task-p2-ink');
    });
  });

  it('Lát cắt 2 & 2b: Reviewer bấm "Yêu cầu sửa" trên ô Submitted và nhập nhận xét bắt buộc gọi requestStageTaskChanges', async () => {
    vi.mocked(assignmentService.requestStageTaskChanges).mockResolvedValueOnce({
      id: 'task-p2-ink',
      status: 'ReworkRequired',
    } as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-editor-1'
        currentUserRole='Editor'
        isEditor={true}
      />,
    );

    const btn = await screen.findByRole('button', { name: /Yêu cầu sửa/i });
    fireEvent.click(btn);

    const commentInput = screen.getByLabelText('Nhận xét yêu cầu sửa');
    fireEvent.change(commentInput, { target: { value: 'Cần tỉa lại bóng đổ trang 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận trả về/i }));

    await waitFor(() => {
      expect(assignmentService.requestStageTaskChanges).toHaveBeenCalledWith(
        'chap-1',
        'task-p2-ink',
        'Cần tỉa lại bóng đổ trang 2',
      );
    });
  });

  it('Lát cắt 2b: Bấm "Lịch sử nộp" gọi getStageTaskSubmissions và hiển thị các lần nộp kèm nhận xét', async () => {
    vi.mocked(assignmentService.getStageTaskSubmissions).mockResolvedValueOnce([
      {
        id: 'sub-2',
        attemptNumber: 2,
        status: 'Pending',
        submittedByUserId: 'user-artist-1',
        submittedAt: '2026-11-14T10:00:00Z',
        artworkReferenceIds: ['art-1', 'art-2'],
        decidedByUserId: null,
        decidedAt: null,
        decisionComment: null,
      },
      {
        id: 'sub-1',
        attemptNumber: 1,
        status: 'Rejected',
        submittedByUserId: 'user-artist-1',
        submittedAt: '2026-11-14T09:00:00Z',
        artworkReferenceIds: ['art-0'],
        decidedByUserId: 'user-editor-1',
        decidedAt: '2026-11-14T09:30:00Z',
        decisionComment: 'Nét còn đứt đoạn ở khung 3',
      },
    ]);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-editor-1'
        currentUserRole='Editor'
        isEditor={true}
      />,
    );

    await screen.findByText('1. Pencil');
    const historyButtons = screen.getAllByRole('button', { name: /Lịch sử nộp/i });
    // Ô cuối có Lịch sử nộp là task-p2-ink (Submitted)
    fireEvent.click(historyButtons[historyButtons.length - 1]);

    await waitFor(() => {
      expect(assignmentService.getStageTaskSubmissions).toHaveBeenCalledWith(
        'chap-1',
        'task-p2-ink',
      );
    });
    expect(await screen.findByText('Lần #2')).toBeInTheDocument();
    expect(screen.getByText('Lần #1')).toBeInTheDocument();
    expect(screen.getByText(/Nét còn đứt đoạn ở khung 3/i)).toBeInTheDocument();
  });

  it('Lát cắt 2: Producer bấm "Mở lại" trên ô Approved và nhập lý do bắt buộc gọi reopenStageTask', async () => {
    const gridWithApproved = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p1-pencil'
          ? { ...t, status: 'Approved' as const, assigneeUserId: 'user-artist-1' }
          : t,
      ),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(gridWithApproved as any);
    vi.mocked(assignmentService.reopenStageTask).mockResolvedValueOnce({
      task: { id: 'task-p1-pencil', status: 'ReworkRequired' } as any,
      outdatedTaskIds: ['task-p1-ink'],
    });

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    const reopenBtn = await screen.findByRole('button', { name: /^Mở lại$/i });
    fireEvent.click(reopenBtn);

    const reasonInput = screen.getByLabelText('Lý do mở lại');
    fireEvent.change(reasonInput, { target: { value: 'Sai bố cục khung tranh số 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận mở lại/i }));

    await waitFor(() => {
      expect(assignmentService.reopenStageTask).toHaveBeenCalledWith(
        'chap-1',
        'task-p1-pencil',
        'Sai bố cục khung tranh số 2',
      );
    });
  });

  it('Lát cắt 2: Ô có isInputOutdated chặn Nộp và cho phép Producer xử lý Impact Review (Giữ kết quả / Làm lại) khi tiền đề đã Approved', async () => {
    // Khi tiền đề task-p1-pencil chưa Approved (đang Unassigned), nút Giữ kết quả / Làm lại bị vô hiệu hoá
    const { rerender } = render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-artist-1'
        currentUserRole='Artist'
      />,
    );

    const submitBtn = await screen.findByRole('button', { name: 'Nộp' });
    expect(submitBtn).toBeDisabled();

    // Khi tiền đề task-p1-pencil đã Approved lại, Producer bấm được Giữ kết quả hoặc Làm lại
    const gridPrereqApproved = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p1-pencil' ? { ...t, status: 'Approved' as const } : t,
      ),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(gridPrereqApproved as any);
    vi.mocked(assignmentService.resolveStageTaskImpact).mockResolvedValue({
      id: 'task-p1-ink',
      status: 'InProgress',
      isInputOutdated: false,
    } as any);

    rerender(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
        refreshKey={1}
      />,
    );

    const keepBtn = await screen.findByRole('button', { name: /Giữ kết quả/i });
    expect(keepBtn).not.toBeDisabled();
    fireEvent.click(keepBtn);

    await waitFor(() => {
      expect(assignmentService.resolveStageTaskImpact).toHaveBeenCalledWith(
        'chap-1',
        'task-p1-ink',
        true,
      );
    });
  });

  it('Lát cắt 2: Producer bỏ gán (Unassign) các ô đang Assigned/InProgress gọi unassignStageTasks', async () => {
    vi.mocked(assignmentService.unassignStageTasks).mockResolvedValueOnce([
      { id: 'task-p2-pencil', status: 'Unassigned', assigneeUserId: null } as any,
    ]);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');
    const unassignButtons = screen.getAllByRole('button', { name: /^Bỏ gán$/i });
    // Ô đầu tiên có nút Bỏ gán theo thứ tự hàng Trang 1 -> Trang 2 là task-p1-ink (InProgress)
    fireEvent.click(unassignButtons[0]);

    await waitFor(() => {
      expect(assignmentService.unassignStageTasks).toHaveBeenCalledWith('chap-1', ['task-p1-ink']);
    });
  });

  it('VIỆC 1: Chỉ hiển thị cột của công đoạn có isEnabled === true và ẩn/không cho giao các ô thuộc công đoạn đã tắt', async () => {
    const gridWithDisabledStage = {
      ...mockGrid,
      stages: [
        ...mockGrid.stages,
        {
          id: 'stg-disabled',
          name: 'Thumbnail',
          slug: 'thumbnail',
          stageOrder: 0,
          allowedRole: 'Artist',
          granularity: 'Page' as const,
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: false,
          track: 'A' as const,
          prerequisiteStageIds: [],
        },
      ],
      tasks: [
        ...mockGrid.tasks,
        {
          id: 'task-p1-disabled',
          chapterId: 'chap-1',
          pageId: 'page-1',
          pipelineStageId: 'stg-disabled',
          granularity: 'Page' as const,
          status: 'Unassigned' as const,
          assigneeUserId: null,
          lotId: null,
          isInputOutdated: false,
          outdatedReason: null,
          reopenedCount: 0,
          isStartable: true,
        },
      ],
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce(gridWithDisabledStage as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');
    expect(screen.queryByText(/0\. Thumbnail/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('disabled-stage-tasks-note')).toHaveTextContent(
      'Đang ẩn 1 ô thuộc công đoạn đã tắt',
    );
  });

  it('VIỆC 1 (Clean Cutover): Parse JSON an toàn (JSON hỏng coi là rỗng), hiện "Kịch bản: v{số}", số panel lúc nộp và dựng lại bản nộp kiểu V2', async () => {
    expect(parseStageTaskPanelLayout('{broken-json')).toEqual([]);
    expect(parseStageTaskPanelLayout('{"not":"array"}')).toEqual([]);
    expect(parseStageTaskCanvasVersions('{broken-json')).toEqual({});
    expect(parseStageTaskCanvasVersions('[1,2,3]')).toEqual({});

    vi.mocked(chapterService.getScriptVersions).mockResolvedValueOnce([
      {
        id: 'sv-3',
        versionNumber: 3,
        message: 'Chốt thoại cảnh 2',
        authorUserId: 'u-writer',
        createdAt: '2026-11-14T08:00:00Z',
        lineCount: 12,
        contentHash: 'hash-v3',
      },
    ]);

    vi.mocked(assignmentService.getStageTaskSubmissions).mockResolvedValueOnce([
      {
        id: 'sub-valid',
        attemptNumber: 2,
        status: 'Pending',
        submittedByUserId: 'user-artist-1',
        submittedAt: '2026-11-14T10:00:00Z',
        artworkReferenceIds: [],
        scriptVersionId: 'sv-3',
        panelLayoutJson: JSON.stringify([
          {
            id: 'pnl-1',
            pageId: 'page-2',
            panelNumber: 1,
            readingOrder: 1,
            boundingBox: '{"x":0,"y":0,"w":600,"h":900}',
          },
          {
            id: 'pnl-2',
            pageId: 'page-2',
            panelNumber: 2,
            readingOrder: 2,
            boundingBox: '{"x":600,"y":0,"w":600,"h":900}',
          },
        ]),
        canvasVersionsJson: JSON.stringify({ 'page-2': 7 }),
      },
      {
        id: 'sub-corrupt',
        attemptNumber: 1,
        status: 'Rejected',
        submittedByUserId: 'user-artist-1',
        submittedAt: '2026-11-14T09:00:00Z',
        artworkReferenceIds: [],
        scriptVersionId: null,
        panelLayoutJson: '{corrupt-json!!!',
        canvasVersionsJson: '{corrupt-canvas!!!',
      },
    ]);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        seriesId='se-1'
        workspaceId='ws-1'
        currentUserId='user-editor-1'
        currentUserRole='Editor'
        isEditor={true}
      />,
    );

    await screen.findByText('1. Pencil');
    const historyButtons = screen.getAllByRole('button', { name: /Lịch sử nộp/i });
    fireEvent.click(historyButtons[historyButtons.length - 1]);

    expect(await screen.findByText('Kịch bản: v3')).toBeInTheDocument();
    expect(screen.getByText('Số panel lúc nộp: 2')).toBeInTheDocument();
    // Bản nộp có JSON hỏng không làm vỡ màn hình, coi là 0 panel và ẩn "Kịch bản: v..." khi scriptVersionId = null
    expect(screen.getByText('Số panel lúc nộp: 0')).toBeInTheDocument();
    expect(screen.queryByText('Kịch bản: vnull')).not.toBeInTheDocument();

    // Bấm "Xem lại" dựng lại canvas theo version 7 + bố cục 2 panel cũ
    fireEvent.click(screen.getByTestId('replay-submission-sub-valid'));

    await waitFor(() => {
      expect(elementService.getPageSnapshot).toHaveBeenCalledWith('page-2', false, 7);
      expect(buildPageComposite).toHaveBeenCalledWith(
        expect.objectContaining({
          panels: expect.arrayContaining([
            expect.objectContaining({ id: 'pnl-1', pageId: 'page-2' }),
            expect.objectContaining({ id: 'pnl-2', pageId: 'page-2' }),
          ]),
          drawText: true,
        }),
      );
    });
    expect(await screen.findByTestId('mock-replay-lightbox')).toHaveTextContent(
      'Lần nộp #2 · Trang 2',
    );
  });

  it('VIỆC 4: Ẩn các ô có trạng thái Cancelled trên lưới', async () => {
    const gridWithCancelled = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p1-pencil' ? { ...t, status: 'Cancelled' as const } : t,
      ),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce(gridWithCancelled as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');
    expect(screen.queryByTestId('grid-cell-task-p1-pencil')).not.toBeInTheDocument();
  });

  it('LỖI 2: Artist / Letterer tuyệt đối không thấy các nút chỉ dành cho Producer (Sinh ô, Chuyển việc cũ, Giao lô, Bỏ gán, Mở lại, Giữ kết quả/Làm lại) và không thấy Duyệt/Yêu cầu sửa', async () => {
    const gridWithAllStates = {
      ...mockGrid,
      tasks: [
        ...mockGrid.tasks,
        {
          id: 'task-approved',
          pipelineStageId: 'stg-pencil',
          pageId: 'page-1',
          status: 'Approved' as const,
          lotId: 'lot-1',
          assigneeUserId: 'user-artist-2',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: 'user-editor-1',
          isStartable: true,
          startedAt: '2026-11-14T07:00:00Z',
          rowVersion: 4,
        },
      ],
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce(gridWithAllStates as any);

    // Kể cả khi prop isProducer bị truyền nhầm là true, currentUserRole='Artist' vẫn khoá chặt quyền Producer
    render(
      <TaskGridBoard
        chapterId='chap-1'
        seriesId='se-1'
        workspaceId='ws-1'
        currentUserId='user-artist-1'
        currentUserRole='Artist'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');

    expect(
      screen.queryByRole('button', { name: /Sinh \/ Đồng bộ ô việc/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chọn cột/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Bỏ gán$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Mở lại$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Giữ kết quả/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Làm lại/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Yêu cầu sửa/i })).not.toBeInTheDocument();

    // Chỉ thấy Bắt đầu / Nộp trên đúng ô của mình
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nộp' })).toBeInTheDocument();
  });

  it('LỖI 4: Khung nhập nhận xét "Yêu cầu sửa" trên ô cấp Chương (cột Review) chiếm toàn chiều rộng ô, nút "Xác nhận trả về" luôn nhìn thấy và bấm được', async () => {
    const gridWithChapterReview = {
      chapterId: 'chap-1',
      stages: [
        ...mockGrid.stages,
        {
          id: 'stg-review',
          name: 'Review',
          stageOrder: 5,
          track: null,
          allowedRole: 'Editor',
          isApprovalGate: true,
          granularity: 'Chapter' as const,
          isEnabled: true,
          prerequisiteStageIds: ['stg-ink'],
        },
      ],
      pages: mockGrid.pages,
      tasks: [
        {
          id: 'task-chap-review',
          pipelineStageId: 'stg-review',
          pageId: null,
          status: 'Submitted' as const,
          lotId: 'lot-review',
          assigneeUserId: 'user-editor-1',
          isInputOutdated: false,
          outdatedReason: null,
          reviewerUserId: null,
          isStartable: true,
          startedAt: '2026-11-14T09:00:00Z',
          rowVersion: 1,
        },
      ],
      lots: [],
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce(gridWithChapterReview as any);
    vi.mocked(assignmentService.requestStageTaskChanges).mockResolvedValueOnce({
      id: 'task-chap-review',
      status: 'ReworkRequired',
    } as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        currentUserRole='Producer'
        isProducer={true}
      />,
    );

    const chapterCell = await screen.findByTestId('task-cell-stg-review-chapter');
    fireEvent.click(screen.getByRole('button', { name: /Yêu cầu sửa/i }));

    const formBox = screen.getByTestId('request-changes-form-task-chap-review');
    expect(chapterCell).toContainElement(formBox);
    expect(formBox.className).toContain('w-full');

    const textarea = screen.getByLabelText('Nhận xét yêu cầu sửa');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.className).toContain('w-full');

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận trả về/i });
    expect(confirmBtn).toBeVisible();
    expect(confirmBtn.parentElement?.className).toContain('flex-wrap');

    fireEvent.change(textarea, { target: { value: 'Cần chỉnh lại nhịp thoại trang cuối' } });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(assignmentService.requestStageTaskChanges).toHaveBeenCalledWith(
        'chap-1',
        'task-chap-review',
        'Cần chỉnh lại nhịp thoại trang cuối',
      );
    });
  });

  it('Làm mờ ô Cancelled, hiện đủ phạm vi trang của lô và hiện lastDecisionComment ở ô ReworkRequired + tooltip', async () => {
    const gridWithReworkAndCancelled = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) => {
        if (t.id === 'task-p1-pencil') return { ...t, status: 'Cancelled' as const };
        if (t.id === 'task-p2-pencil') {
          return {
            ...t,
            status: 'ReworkRequired' as const,
            lotId: 'lot-1',
          };
        }
        return t;
      }),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce(
      gridWithReworkAndCancelled as any,
    );
    vi.mocked(assignmentService.getStageTaskSubmissions).mockResolvedValueOnce([
      {
        id: 'sub-rework-1',
        attemptNumber: 1,
        status: 'Rejected',
        submittedByUserId: 'user-artist-1',
        submittedAt: '2026-11-15T10:00:00Z',
        decisionComment: 'Bố cục khung 3 bị lệch đường chân trời',
        artworkReferenceIds: [],
      },
    ] as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');
    expect(screen.getByTestId('cancelled-task-cell-task-p1-pencil')).toHaveTextContent('Đã huỷ');
    const commentEl = await screen.findByTestId('rework-decision-comment-task-p2-pencil');
    expect(commentEl).toHaveTextContent('Bố cục khung 3 bị lệch đường chân trời');
    expect(screen.getByTestId('task-cell-stg-pencil-page-2')).toHaveAttribute(
      'title',
      expect.stringContaining('Bố cục khung 3 bị lệch đường chân trời'),
    );
  });

  it('Hiện "Lần nộp #N", cho người giữ ô Rút bài, và khoá nút khi UnderReview của người khác kèm nút Gỡ khoá duyệt cho Producer', async () => {
    const gridData = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) => {
        if (t.id === 'task-p2-ink') {
          return {
            ...t,
            status: 'Submitted' as const,
            assigneeUserId: 'user-artist-1',
            attemptCount: 3,
          };
        }
        return t;
      }),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(gridData as any);
    vi.mocked(assignmentService.withdrawStageTask).mockResolvedValueOnce({
      id: 'task-p2-ink',
      status: 'InProgress',
      attemptCount: 3,
    } as any);

    const { unmount } = render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-artist-1'
        currentUserRole='Artist'
      />,
    );

    expect(await screen.findByTestId('task-attempt-count-task-p2-ink')).toHaveTextContent(
      'Lần nộp #3',
    );
    fireEvent.click(screen.getByTestId('withdraw-task-btn-task-p2-ink'));
    await waitFor(() => {
      expect(assignmentService.withdrawStageTask).toHaveBeenCalledWith('chap-1', 'task-p2-ink');
      expect(screen.queryByTestId('withdraw-task-btn-task-p2-ink')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('task-attempt-count-task-p2-ink')).toHaveTextContent('Lần nộp #3');
    expect(assignmentService.getTaskGrid).toHaveBeenCalledTimes(1);
    unmount();

    // Producer thấy "Đang được duyệt bởi..." và nút Gỡ khoá duyệt khi Editor khác đang giữ khoá
    const underReviewGrid = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p2-ink'
          ? {
              ...t,
              status: 'UnderReview' as const,
              reviewerUserId: 'user-editor-1',
              attemptCount: 1,
            }
          : t,
      ),
    };
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(underReviewGrid as any);
    vi.mocked(assignmentService.releaseStageTaskReview).mockResolvedValueOnce({
      id: 'task-p2-ink',
      status: 'Submitted',
    } as any);

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        currentUserRole='Producer'
        isProducer={true}
      />,
    );

    expect(await screen.findByTestId('under-review-by-task-p2-ink')).toHaveTextContent(
      'Đang được duyệt bởi',
    );
    expect(screen.getByRole('button', { name: 'Duyệt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Yêu cầu sửa/i })).toBeDisabled();

    fireEvent.click(screen.getByTestId('force-release-review-btn-task-p2-ink'));
    await waitFor(() => {
      expect(assignmentService.releaseStageTaskReview).toHaveBeenCalledWith(
        'chap-1',
        'task-p2-ink',
      );
    });
  });

  it('Producer có thể Đổi người (reassign: true) cho ô chưa nộp và Sửa hạn/brief lô (PATCH)', async () => {
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      {
        userId: 'user-artist-1',
        fullName: 'Artist Một',
        email: 'a1@test.com',
        role: 'Artist',
        status: 'Active',
      },
      {
        userId: 'user-artist-2',
        fullName: 'Artist Hai',
        email: 'a2@test.com',
        role: 'Artist',
        status: 'Active',
      },
      {
        userId: 'user-writer-1',
        fullName: 'Writer Một',
        email: 'w1@test.com',
        role: 'Writer',
        status: 'Active',
      },
    ] as any);
    vi.mocked(assignmentService.assignTaskGridLots).mockResolvedValueOnce({
      dryRun: false,
      taskCount: 1,
      lots: [],
    });
    vi.mocked(assignmentService.updateStageTaskLot).mockResolvedValueOnce({
      id: 'lot-1',
      pipelineStageId: 'stg-pencil',
      assigneeUserId: 'user-artist-1',
      assignedRole: 'Artist',
      brief: 'Brief đã cập nhật',
      dueDate: '2026-12-01T23:59:59.000Z',
      status: 'Active',
      isOverdue: false,
      taskCount: 1,
      approvedCount: 0,
      rowVersion: 2,
    });

    render(
      <TaskGridBoard
        chapterId='chap-1'
        workspaceId='ws-1'
        currentUserId='user-producer'
        currentUserRole='Producer'
        isProducer={true}
      />,
    );

    await screen.findByText('1. Pencil');

    // Ô đang isInputOutdated (task-p1-ink) khoá nút Đổi người
    expect(screen.getByTestId('reassign-task-btn-task-p1-ink')).toBeDisabled();

    // Đổi người cho task-p2-pencil (Assigned, cùng vai trò Artist, loại bỏ Writer)
    fireEvent.click(screen.getByTestId('reassign-task-btn-task-p2-pencil'));
    const select = screen.getByLabelText('Người nhận mới') as HTMLSelectElement;
    expect(select.value).toBe('user-artist-2');
    expect(screen.queryByText(/Writer Một/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-reassign-task-task-p2-pencil'));
    await waitFor(() => {
      expect(assignmentService.assignTaskGridLots).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          reassign: true,
          dryRun: false,
          lots: [
            expect.objectContaining({
              pipelineStageId: 'stg-pencil',
              assigneeUserId: 'user-artist-2',
              taskIds: ['task-p2-pencil'],
            }),
          ],
        }),
      );
    });

    // Sửa brief & hạn lô lot-1 (PATCH)
    fireEvent.click(screen.getByTestId('edit-lot-btn-lot-1'));
    fireEvent.change(screen.getByLabelText('Brief của lô'), {
      target: { value: 'Brief đã cập nhật' },
    });
    fireEvent.change(screen.getByLabelText('Hạn hoàn thành lô'), {
      target: { value: '2026-12-01' },
    });
    fireEvent.click(screen.getByTestId('save-lot-btn-lot-1'));

    await waitFor(() => {
      expect(assignmentService.updateStageTaskLot).toHaveBeenCalledWith(
        'chap-1',
        'lot-1',
        expect.objectContaining({
          brief: 'Brief đã cập nhật',
          clearDueDate: false,
        }),
      );
    });
  });

  describe('Smart Ripple — Gợi ý xử lý ô isInputOutdated do sửa kịch bản', () => {
    const scriptOutdatedGrid = {
      ...mockGrid,
      tasks: mockGrid.tasks.map((t) =>
        t.id === 'task-p1-pencil'
          ? { ...t, status: 'Approved' as const }
          : t.id === 'task-p1-ink'
            ? {
                ...t,
                isInputOutdated: true,
                outdatedReason: 'Kịch bản của trang đã được sửa sau khi mở lại kịch bản.',
              }
            : t,
      ),
    };

    const impactSuggestion = {
      id: 'sug-imp-1',
      runId: 'run-imp-1',
      stepId: 'step-imp-1',
      sceneId: '00000000-0000-0000-0000-000000000000',
      kind: 'ImpactRipple' as const,
      status: 'Pending' as const,
      summary: 'Gợi ý Keep cho Ink, trang 1',
      payload: {
        taskId: 'task-p1-ink',
        decision: 'Keep',
        reason: 'Chỉ chỉnh câu thoại, bố cục khung tranh giữ nguyên.',
        changes: [
          {
            type: 'Dialogue',
            label: 'Akira',
            before: 'Đi ngay',
            after: 'Đi ngay thôi!',
          },
        ],
      },
      payloadHash: 'hash-imp-1',
      baseChapterVersion: 2,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '2026-11-18T10:00:00Z',
      decisions: [],
      canDecide: true,
      canAccept: true,
    };

    it('Producer bấm "Gợi ý xử lý" gọi runImpactSuggestion, hiện SuggestionCard và Accept xong tải lại lưới', async () => {
      vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(scriptOutdatedGrid as any);
      const runImpactSpy = vi
        .spyOn(aiAgentsService, 'runImpactSuggestion')
        .mockResolvedValueOnce(impactSuggestion);
      const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
        suggestionId: 'sug-imp-1',
        status: 'Accepted',
        decisionId: 'dec-imp-1',
        resultRevisionId: null,
        chapterVersion: 2,
      });

      render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      const suggestBtn = await screen.findByRole('button', { name: /Gợi ý xử lý/i });
      fireEvent.click(suggestBtn);

      await waitFor(() => {
        expect(runImpactSpy).toHaveBeenCalledWith('chap-1', 'task-p1-ink');
      });

      expect(await screen.findByText('Giữ nguyên')).toBeInTheDocument();
      expect(
        screen.getByText('Chỉ chỉnh câu thoại, bố cục khung tranh giữ nguyên.'),
      ).toBeInTheDocument();

      const gridCallsBeforeAccept = vi.mocked(assignmentService.getTaskGrid).mock.calls.length;
      vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce({
        ...scriptOutdatedGrid,
        tasks: scriptOutdatedGrid.tasks.map((t) =>
          t.id === 'task-p1-ink' ? { ...t, isInputOutdated: false, outdatedReason: null } : t,
        ),
      } as any);

      fireEvent.click(screen.getByRole('button', { name: /Accept \(áp dụng xử lý\)/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('se-1', 'sug-imp-1', 'accept', {});
        expect(vi.mocked(assignmentService.getTaskGrid).mock.calls.length).toBeGreaterThan(
          gridCallsBeforeAccept,
        );
      });
      expect(assignmentService.resolveStageTaskImpact).not.toHaveBeenCalled();
    });

    it('Reject đề xuất ImpactRipple không đổi trạng thái ô và không gọi lại getTaskGrid', async () => {
      vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(scriptOutdatedGrid as any);
      vi.spyOn(aiAgentsService, 'runImpactSuggestion').mockResolvedValueOnce(impactSuggestion);
      const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
        suggestionId: 'sug-imp-1',
        status: 'Rejected',
        decisionId: 'dec-imp-rej',
        resultRevisionId: null,
        chapterVersion: 2,
      });

      render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      fireEvent.click(await screen.findByRole('button', { name: /Gợi ý xử lý/i }));
      expect(await screen.findByText('Giữ nguyên')).toBeInTheDocument();

      const gridCallsBeforeReject = vi.mocked(assignmentService.getTaskGrid).mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận Reject/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('se-1', 'sug-imp-1', 'reject', {});
      });
      expect(vi.mocked(assignmentService.getTaskGrid).mock.calls.length).toBe(
        gridCallsBeforeReject,
      );
      expect(assignmentService.resolveStageTaskImpact).not.toHaveBeenCalled();
      expect(screen.getByText('Đầu vào lỗi thời')).toBeInTheDocument();
    });

    it('ẩn nút "Gợi ý xử lý" khi không phải Producer hoặc ô lỗi thời không phải do sửa kịch bản, và hiện nguyên văn lỗi 403/409', async () => {
      // mockGrid mặc định có task-p1-ink với outdatedReason = 'Pencil trang 1 vừa mở lại' -> không hiện Gợi ý xử lý
      const first = render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );
      await screen.findByText('Đầu vào lỗi thời');
      expect(screen.queryByRole('button', { name: /Gợi ý xử lý/i })).not.toBeInTheDocument();
      first.unmount();

      // Lý do do người mở lại có chứa chữ "kịch bản" ("Pencil được mở lại: sửa theo kịch bản") -> KHÔNG hiện Gợi ý xử lý
      vi.mocked(assignmentService.getTaskGrid).mockResolvedValueOnce({
        ...mockGrid,
        tasks: mockGrid.tasks.map((t) =>
          t.id === 'task-p1-pencil'
            ? { ...t, status: 'Approved' as const }
            : t.id === 'task-p1-ink'
              ? {
                  ...t,
                  isInputOutdated: true,
                  outdatedReason: 'Pencil được mở lại: sửa theo kịch bản',
                }
              : t,
        ),
      } as any);
      const reopenWithScriptWord = render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );
      await screen.findByText('Pencil được mở lại: sửa theo kịch bản');
      expect(screen.queryByRole('button', { name: /Gợi ý xử lý/i })).not.toBeInTheDocument();
      reopenWithScriptWord.unmount();

      // Ô sửa kịch bản nhưng người xem là Artist / Editor -> ẩn nút
      vi.mocked(assignmentService.getTaskGrid).mockResolvedValue(scriptOutdatedGrid as any);
      const second = render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-editor'
          currentUserRole='Editor'
          isEditor={true}
        />,
      );
      await screen.findByText('Đầu vào lỗi thời');
      expect(screen.queryByRole('button', { name: /Gợi ý xử lý/i })).not.toBeInTheDocument();
      second.unmount();

      // Producer gọi bị lỗi 403 và 409 -> hiện đúng message Backend
      vi.spyOn(aiAgentsService, 'runImpactSuggestion')
        .mockRejectedValueOnce(
          new AiApiError('Chỉ Producer mới được xin gợi ý xử lý ảnh hưởng.', 'FORBIDDEN', 403),
        )
        .mockRejectedValueOnce(
          new AiApiError(
            'Không tìm thấy thay đổi kịch bản của trang này để so sánh.',
            'CONFLICT',
            409,
          ),
        );

      render(
        <TaskGridBoard
          chapterId='chap-1'
          seriesId='se-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      const suggestBtn = await screen.findByRole('button', { name: /Gợi ý xử lý/i });
      fireEvent.click(suggestBtn);
      expect(
        (await screen.findAllByText('Chỉ Producer mới được xin gợi ý xử lý ảnh hưởng.')).length,
      ).toBeGreaterThanOrEqual(1);

      fireEvent.click(suggestBtn);
      expect(
        (await screen.findAllByText('Không tìm thấy thay đổi kịch bản của trang này để so sánh.'))
          .length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Giao tự động (Auto-assign plan)', () => {
    const mockAutoAssignPlan = {
      chapterId: 'chap-1',
      unassignedCount: 5,
      lots: [
        {
          pipelineStageId: 'stg-pencil',
          stageName: 'Pencil',
          assigneeUserId: 'user-artist-1',
          assigneeName: 'Hoạ sĩ A',
          assignedRole: 'Artist',
          taskIds: ['t-p1', 't-p2', 't-p3', 't-p5'],
          pageNumbers: [1, 2, 3, 5],
          openTaskCount: 2,
        },
        {
          pipelineStageId: 'stg-pencil',
          stageName: 'Pencil',
          assigneeUserId: 'user-artist-2',
          assigneeName: '',
          assignedRole: 'Artist',
          taskIds: ['t-p4'],
          pageNumbers: [4],
          openTaskCount: 1,
        },
        {
          pipelineStageId: 'stg-review',
          stageName: 'Review',
          assigneeUserId: 'user-editor-1',
          assigneeName: 'Biên tập viên E',
          assignedRole: 'Editor',
          taskIds: ['t-review-ch'],
          pageNumbers: [],
          openTaskCount: 0,
        },
      ],
      skipped: [
        {
          pipelineStageId: 'stg-letter',
          stageName: 'Letter',
          taskCount: 2,
          reason: 'Không có thành viên Active có vai trò Letterer.',
        },
      ],
    };

    const membersWithRoles = [
      ...mockMembers,
      {
        userId: 'user-artist-inactive',
        fullName: 'Hoạ sĩ Đã nghỉ',
        username: 'artist_inactive',
        email: 'inactive@test.com',
        role: 'Artist',
        status: 'Inactive',
        joinedAt: '2026-10-01T00:00:00Z',
      },
      {
        userId: 'user-editor-1',
        fullName: 'Biên tập viên E',
        username: 'editor1',
        email: 'editor1@test.com',
        role: 'Editor',
        status: 'Active',
        joinedAt: '2026-10-01T00:00:00Z',
      },
    ];

    it('mở xem trước nhóm theo công đoạn, hiển thị phạm vi trang gọn, Cả chương, số ô, đang có N việc, công đoạn bỏ qua và KHÔNG lưu trước khi xác nhận', async () => {
      vi.mocked(workspaceService.getMembers).mockResolvedValue(membersWithRoles as any);
      vi.mocked(assignmentService.getAutoAssignPlan).mockResolvedValueOnce(mockAutoAssignPlan);

      render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      await screen.findByText('1. Pencil');
      fireEvent.click(screen.getByRole('button', { name: /Giao tự động/i }));

      await waitFor(() => {
        expect(assignmentService.getAutoAssignPlan).toHaveBeenCalledWith('chap-1');
      });

      expect(await screen.findByText('Xem trước Giao tự động')).toBeInTheDocument();
      expect(screen.getByTestId('auto-assign-stage-stg-pencil')).toBeInTheDocument();
      expect(screen.getByTestId('auto-assign-stage-stg-review')).toBeInTheDocument();
      expect(screen.getByText('Trang 1–3, 5')).toBeInTheDocument();
      expect(screen.getByText('Trang 4')).toBeInTheDocument();
      expect(screen.getByText('Cả chương')).toBeInTheDocument();
      expect(screen.getByText('4 ô')).toBeInTheDocument();
      expect(screen.getByText('đang có 2 việc')).toBeInTheDocument();
      expect(screen.getByText('đang có 0 việc')).toBeInTheDocument();

      // Công đoạn bỏ qua kèm lý do
      expect(screen.getByTestId('auto-assign-skipped')).toHaveTextContent('Letter');
      expect(screen.getByTestId('auto-assign-skipped')).toHaveTextContent(
        'Không có thành viên Active có vai trò Letterer.',
      );

      // Select của lô Artist chỉ gồm thành viên Active vai trò Artist (không có Inactive hoặc Editor)
      const pencilSelect = screen.getByLabelText('Người nhận cho Pencil (Trang 1–3, 5)');
      const optionTexts = Array.from(pencilSelect.querySelectorAll('option')).map(
        (o) => o.textContent,
      );
      expect(optionTexts).toEqual(['Hoạ sĩ A', 'Hoạ sĩ B']);

      // Chưa xác nhận -> tuyệt đối chưa gọi assignTaskGridLots
      expect(assignmentService.assignTaskGridLots).not.toHaveBeenCalled();
    });

    it('xác nhận gửi đúng danh sách lô (dryRun: false), hiện toast, tải lại lưới, đóng modal và chống bấm đúp', async () => {
      const onShowToast = vi.fn();
      vi.mocked(workspaceService.getMembers).mockResolvedValue(membersWithRoles as any);
      vi.mocked(assignmentService.getAutoAssignPlan).mockResolvedValueOnce(mockAutoAssignPlan);

      let resolveSave!: (value: any) => void;
      vi.mocked(assignmentService.assignTaskGridLots).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          }),
      );

      render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
          onShowToast={onShowToast}
        />,
      );

      await screen.findByText('1. Pencil');
      const gridCallsBeforeConfirm = vi.mocked(assignmentService.getTaskGrid).mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: /Giao tự động/i }));
      await screen.findByTestId('auto-assign-stage-stg-pencil');
      const confirmBtn = screen.getByTestId('auto-assign-confirm-btn');

      // Bấm đúp nhanh -> chỉ gửi 1 request
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);

      expect(assignmentService.assignTaskGridLots).toHaveBeenCalledTimes(1);
      expect(assignmentService.assignTaskGridLots).toHaveBeenCalledWith('chap-1', {
        lots: [
          {
            pipelineStageId: 'stg-pencil',
            assigneeUserId: 'user-artist-1',
            taskIds: ['t-p1', 't-p2', 't-p3', 't-p5'],
          },
          {
            pipelineStageId: 'stg-pencil',
            assigneeUserId: 'user-artist-2',
            taskIds: ['t-p4'],
          },
          {
            pipelineStageId: 'stg-review',
            assigneeUserId: 'user-editor-1',
            taskIds: ['t-review-ch'],
          },
        ],
        dryRun: false,
      });

      resolveSave({
        dryRun: false,
        taskCount: 6,
        lots: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }],
      });

      await waitFor(() => {
        expect(screen.queryByText('Xem trước Giao tự động')).not.toBeInTheDocument();
      });
      expect(onShowToast).toHaveBeenCalledWith(
        'Giao tự động thành công',
        expect.stringContaining('6'),
      );
      expect(vi.mocked(assignmentService.getTaskGrid).mock.calls.length).toBeGreaterThan(
        gridCallsBeforeConfirm,
      );
    });

    it('đổi người nhận sang cùng 1 người trong cùng công đoạn sẽ tự gộp lô, và bỏ lô sẽ loại khỏi payload gửi đi', async () => {
      vi.mocked(workspaceService.getMembers).mockResolvedValue(membersWithRoles as any);
      vi.mocked(assignmentService.getAutoAssignPlan).mockResolvedValueOnce(mockAutoAssignPlan);
      vi.mocked(assignmentService.assignTaskGridLots).mockResolvedValueOnce({
        dryRun: false,
        taskCount: 5,
        lots: [{ id: 'l-merged' } as any],
      });

      render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      await screen.findByText('1. Pencil');
      fireEvent.click(screen.getByRole('button', { name: /Giao tự động/i }));

      // Đổi lô Pencil thứ 2 từ Hoạ sĩ B -> Hoạ sĩ A (cùng công đoạn Pencil với lô 1)
      const secondPencilSelect = await screen.findByLabelText('Người nhận cho Pencil (Trang 4)');
      fireEvent.change(secondPencilSelect, { target: { value: 'user-artist-1' } });

      // Bỏ lô Review
      fireEvent.click(screen.getByLabelText('Bỏ lô Review (Cả chương)'));

      fireEvent.click(screen.getByTestId('auto-assign-confirm-btn'));

      await waitFor(() => {
        expect(assignmentService.assignTaskGridLots).toHaveBeenCalledWith('chap-1', {
          lots: [
            {
              pipelineStageId: 'stg-pencil',
              assigneeUserId: 'user-artist-1',
              taskIds: ['t-p1', 't-p2', 't-p3', 't-p5', 't-p4'],
            },
          ],
          dryRun: false,
        });
      });
    });

    it('kế hoạch rỗng hiện thông báo trống và vô hiệu hoá nút xác nhận', async () => {
      vi.mocked(assignmentService.getAutoAssignPlan).mockResolvedValueOnce({
        chapterId: 'chap-1',
        unassignedCount: 0,
        lots: [],
        skipped: [],
      });

      render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-editor-1'
          currentUserRole='Editor'
          isEditor={true}
        />,
      );

      await screen.findByText('1. Pencil');
      fireEvent.click(screen.getByRole('button', { name: /Giao tự động/i }));

      expect(await screen.findByTestId('auto-assign-empty')).toBeInTheDocument();
      expect(screen.getByTestId('auto-assign-confirm-btn')).toBeDisabled();
    });

    it('khi Backend báo lỗi vẫn giữ modal mở và hiển thị nguyên văn thông báo lỗi; khi 409 cho phép tải lại kế hoạch', async () => {
      vi.mocked(workspaceService.getMembers).mockResolvedValue(membersWithRoles as any);
      vi.mocked(assignmentService.getAutoAssignPlan)
        .mockResolvedValueOnce(mockAutoAssignPlan)
        .mockResolvedValueOnce({
          chapterId: 'chap-1',
          unassignedCount: 1,
          lots: [mockAutoAssignPlan.lots[2]],
          skipped: [],
        });

      const backendErr: any = new Error('Ô Pencil trang 1 đã được người khác nhận.');
      backendErr.status = 409;
      vi.mocked(assignmentService.assignTaskGridLots).mockRejectedValueOnce(backendErr);

      render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
        />,
      );

      await screen.findByText('1. Pencil');
      fireEvent.click(screen.getByRole('button', { name: /Giao tự động/i }));
      await screen.findByTestId('auto-assign-stage-stg-pencil');
      fireEvent.click(screen.getByTestId('auto-assign-confirm-btn'));

      // Modal vẫn mở và hiện nguyên văn lỗi từ BE + gợi ý tải lại kế hoạch
      const errorBox = await screen.findByTestId('auto-assign-error');
      expect(errorBox).toHaveTextContent('Ô Pencil trang 1 đã được người khác nhận.');
      expect(errorBox).toHaveTextContent(/Lưới công việc đã thay đổi/i);
      expect(screen.getByText('Xem trước Giao tự động')).toBeInTheDocument();

      // Bấm tải lại kế hoạch -> gọi lại getAutoAssignPlan
      fireEvent.click(screen.getByTestId('auto-assign-reload-btn'));
      await waitFor(() => {
        expect(assignmentService.getAutoAssignPlan).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(screen.queryByTestId('auto-assign-stage-stg-pencil')).not.toBeInTheDocument();
        expect(screen.getByTestId('auto-assign-stage-stg-review')).toBeInTheDocument();
      });
    });

    it('ẩn nút "Giao tự động" đối với Artist và khi chương đã khoá', async () => {
      const { rerender } = render(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-artist-1'
          currentUserRole='Artist'
          isProducer={true}
        />,
      );

      await screen.findByText('1. Pencil');
      expect(screen.queryByRole('button', { name: /Giao tự động/i })).not.toBeInTheDocument();

      // Producer nhưng chương đã khoá -> cũng ẩn
      rerender(
        <TaskGridBoard
          chapterId='chap-1'
          workspaceId='ws-1'
          currentUserId='user-producer'
          currentUserRole='Producer'
          isProducer={true}
          isChapterLocked={true}
        />,
      );
      expect(screen.queryByRole('button', { name: /Giao tự động/i })).not.toBeInTheDocument();
    });
  });
});

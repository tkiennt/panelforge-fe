import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MyWorkView } from './MyWorkView';
import { assignmentService } from '@/services/assignment.service';
import { chapterService } from '@/services/chapter.service';
import { pipelineService } from '@/services/pipeline.service';
import { workspaceService } from '@/services/workspace.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { pageService } from '@/services/page.service';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/assignment.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/assignment.service')>(
    '@/services/assignment.service',
  );
  return {
    ...actual,
    assignmentService: {
      ...actual.assignmentService,
      getMyTaskLots: vi.fn(),
      getTaskGridReviewQueue: vi.fn(),
      getMyWorkspaceAssignments: vi.fn(),
      getMyAssignments: vi.fn(),
      getTaskGrid: vi.fn(),
      getAssignments: vi.fn(),
      getStageProgress: vi.fn(),
      startStageTask: vi.fn(),
      submitStageTasks: vi.fn(),
      withdrawStageTask: vi.fn(),
      openStageTaskReview: vi.fn(),
      releaseStageTaskReview: vi.fn(),
      approveStageTask: vi.fn(),
      requestStageTaskChanges: vi.fn(),
      getStageTaskSubmissions: vi.fn(),
    },
  };
});

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/services/scriptLine.service', () => ({
  scriptLineService: {
    getScenesByChapter: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
    getBibleDesignQueue: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

describe('MyWorkView – Lát cắt 4 (Clean Cutover)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [{ id: 'chap-1', chapterNumber: 1, title: 'Chương mở đầu' }],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    } as any);
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'se-1',
      stages: [{ id: 'stg-pencil', name: 'Pencil', stageOrder: 1 }],
      transitions: [],
    } as any);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      { userId: 'u-artist', fullName: 'Minh Artist', email: 'artist@test.com', role: 'Artist' },
    ] as any);
    vi.mocked(assignmentService.getMyWorkspaceAssignments).mockResolvedValue([]);
    vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([]);
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue([]);
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([]);
    vi.mocked(seriesService.getSeriesById).mockResolvedValue({
      id: 'se-1',
      title: 'Dragonball',
      format: 'Manga',
    } as any);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'se-1',
      workspaceId: 'ws-1',
      name: 'Dragonball Bible',
      version: 1,
      entries: [],
    });
    vi.mocked(bibleService.getBibleDesignQueue).mockResolvedValue([]);
  });

  const renderMyWork = (
    props: Partial<React.ComponentProps<typeof MyWorkView>> = {},
    url = '/workspaces/ws-1/series/se-1/my-work',
  ) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/my-work'
            element={<MyWorkView currentUserId='u-artist' workspaceRole='ARTIST' {...props} />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it('Writer Overview dùng dữ liệu thật, tiếp tục chương sửa gần nhất và tổng hợp Bible collaboration', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-old',
          seriesId: 'se-1',
          chapterNumber: 1,
          title: 'Khởi đầu',
          versionVector: 1,
          createdAt: '2026-11-01T08:00:00Z',
          updatedAt: '2026-11-10T08:00:00Z',
          scenesCount: 1,
          pagesCount: 3,
          scriptStatus: 'Draft',
          isScriptFrozen: false,
        },
        {
          id: 'chap-latest',
          seriesId: 'se-1',
          chapterNumber: 2,
          title: 'Hành trình mở ra',
          versionVector: 3,
          createdAt: '2026-11-02T08:00:00Z',
          updatedAt: '2026-11-25T09:30:00Z',
          scenesCount: 4,
          pagesCount: 13,
          outline: 'Goku cùng Bulma lên đường vào Thành phố.',
          scriptStatus: 'Draft',
          isScriptFrozen: false,
        },
      ],
      totalCount: 2,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
    vi.mocked(assignmentService.getMyTaskLots).mockResolvedValue([
      {
        id: 'lot-writer',
        seriesId: 'se-1',
        seriesTitle: 'Dragonball',
        chapterId: 'chap-latest',
        chapterNumber: 2,
        chapterTitle: 'Hành trình mở ra',
        pipelineStageId: 'script-stage',
        stageName: 'Script',
        stageOrder: 1,
        assignedRole: 'Writer',
        status: 'Active',
        isOverdue: false,
        tasks: [],
      },
    ]);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'se-1',
      workspaceId: 'ws-1',
      name: 'Dragonball Bible',
      version: 1,
      entries: [
        {
          id: 'bulma',
          seriesBibleId: 'bible-1',
          category: 'Character',
          code: 'CHAR-BULMA',
          name: 'Bulma',
          description: '',
          detailsJson: '{}',
          createdAt: '2026-11-01T00:00:00Z',
          isStub: true,
        },
      ],
    });
    vi.mocked(bibleService.getBibleDesignQueue).mockResolvedValue([
      {
        entryId: 'yamcha',
        code: 'CHAR-YAMCHA',
        name: 'Yamcha',
        category: 'Character',
        revisionId: 'rev-yamcha',
        reviewStatus: 'Draft',
        variantLabel: 'Mặc định',
        versionNumber: 2,
        updatedAt: '2026-11-26T00:00:00Z',
      },
    ]);

    renderMyWork(
      { currentUserId: 'u-writer', workspaceRole: 'WRITER' },
      '/workspaces/ws-1/series/se-1/my-work',
    );

    expect(await screen.findByTestId('writer-workspace-overview')).toBeInTheDocument();
    expect(screen.getByText('Chương 2: Hành trình mở ra')).toBeInTheDocument();
    expect(screen.getByText('Goku cùng Bulma lên đường vào Thành phố.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('writer-metric-assigned')).toHaveTextContent('1');
      expect(screen.getByTestId('writer-metric-collaborating')).toHaveTextContent('1');
      expect(screen.getByText('1 nhân vật cần bổ sung brief thiết kế')).toBeInTheDocument();
      expect(screen.getByText('Yamcha')).toBeInTheDocument();
    });
    expect(
      document.querySelector('a[href*="script/editor?chapterId=chap-latest"]'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Model Sheet')).not.toBeInTheDocument();
  });

  it('Artist xuyên chương mở Artist Desk thay vì hiện nút Bắt đầu thừa, và vẫn nộp ô đang làm', async () => {
    vi.mocked(assignmentService.getMyTaskLots).mockResolvedValue([
      {
        id: 'lot-1',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        chapterTitle: 'Chương mở đầu',
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        stageOrder: 1,
        assignedRole: 'Artist',
        brief: 'Vẽ chì trang 1-2',
        status: 'Active',
        isOverdue: false,
        tasks: [
          {
            id: 'cell-start',
            pageId: 'p-1',
            pageNumber: 1,
            status: 'Assigned',
            isStartable: true,
            isInputOutdated: false,
          },
          {
            id: 'cell-submit',
            pageId: 'p-2',
            pageNumber: 2,
            status: 'InProgress',
            isStartable: true,
            isInputOutdated: false,
          },
        ],
      },
    ]);
    vi.mocked(assignmentService.startStageTask).mockResolvedValue({} as any);
    vi.mocked(assignmentService.submitStageTasks).mockResolvedValue([] as any);

    renderMyWork();

    expect((await screen.findAllByText('Vẽ chì trang 1-2')).length).toBeGreaterThan(0);
    expect(assignmentService.getTaskGridReviewQueue).not.toHaveBeenCalled();

    expect(screen.queryByTestId('start-lot-cell-cell-start')).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="/artist?chapterId=chap-1"]')).toBeInTheDocument();
    expect(assignmentService.startStageTask).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('submit-lot-cell-cell-submit'));
    await waitFor(() => {
      expect(assignmentService.submitStageTasks).toHaveBeenCalledWith('chap-1', ['cell-submit']);
    });
  });

  it('Editor đọc hàng chờ duyệt từ getTaskGridReviewQueue và khoá tự duyệt theo BR-06', async () => {
    vi.mocked(assignmentService.getMyTaskLots).mockResolvedValue([]);
    vi.mocked(assignmentService.getTaskGridReviewQueue).mockResolvedValue([
      {
        taskId: 'cell-rev-1',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'p-1',
        pageNumber: 1,
        status: 'Submitted',
        assigneeUserId: 'u-artist',
        attemptNumber: 1,
        submittedAt: '2026-11-14T09:00:00Z',
      },
      {
        taskId: 'cell-rev-self',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        pipelineStageId: 'stg-ink',
        stageName: 'Ink',
        pageId: 'p-2',
        pageNumber: 2,
        status: 'Submitted',
        assigneeUserId: 'u-editor',
        attemptNumber: 1,
        submittedAt: '2026-11-14T09:30:00Z',
      },
    ]);
    vi.mocked(assignmentService.approveStageTask).mockResolvedValue({} as any);

    renderMyWork({ currentUserId: 'u-editor', workspaceRole: 'EDITOR' });

    expect(await screen.findByTestId('grid-review-card-cell-rev-1')).toBeInTheDocument();
    expect(screen.getByTestId('self-review-locked-cell-rev-self')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('approve-grid-task-cell-rev-1'));
    await waitFor(() => {
      expect(assignmentService.approveStageTask).toHaveBeenCalledWith('chap-1', 'cell-rev-1');
    });
  });

  it('Chương cũ không có ô lưới V3 thì lùi về đọc GET /assignments như cũ', async () => {
    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue({
      chapterId: 'chap-1',
      stages: [],
      pages: [],
      tasks: [],
      lots: [],
    });
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'asg-legacy-1',
        seriesId: 'se-1',
        chapterId: 'chap-1',
        entityType: 'Chapter',
        targetEntityId: 'chap-1',
        pipelineStageId: 'stg-pencil',
        assigneeUserId: 'u-artist',
        assignedRole: 'Artist',
        brief: 'Bản vẽ chương Published cũ (V2)',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ] as any);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);

    renderMyWork({}, '/workspaces/ws-1/series/se-1/my-work?chapterId=chap-1');

    expect(await screen.findByText('Bản vẽ chương Published cũ (V2)')).toBeInTheDocument();
    expect(assignmentService.getAssignments).toHaveBeenCalledWith('chap-1');
  });

  it('Hiện lastDecisionComment trên ô ReworkRequired, "Lần nộp #N" khi attemptCount > 0, và nút Rút bài cho ô Submitted kèm refetch / xử lý 409', async () => {
    const onShowToast = vi.fn();
    vi.mocked(assignmentService.getMyTaskLots).mockResolvedValue([
      {
        id: 'lot-rework-withdraw',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        chapterTitle: 'Chương mở đầu',
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        stageOrder: 1,
        assignedRole: 'Artist',
        brief: 'Vẽ chì lô 1',
        status: 'Active',
        isOverdue: false,
        tasks: [
          {
            id: 'cell-rework',
            pageId: 'p-1',
            pageNumber: 1,
            status: 'ReworkRequired',
            isStartable: true,
            isInputOutdated: false,
            lastDecisionComment: 'Cần chỉnh lại tỷ lệ đầu nhân vật ở khung 2',
            attemptCount: 2,
          },
          {
            id: 'cell-submitted',
            pageId: 'p-2',
            pageNumber: 2,
            status: 'Submitted',
            isStartable: false,
            isInputOutdated: false,
            attemptCount: 1,
          },
        ],
      },
    ]);

    const conflictErr: any = new Error(
      'Editor đang mở duyệt ô này nên không rút được; nhờ Editor trả bài hoặc nhả khoá duyệt.',
    );
    conflictErr.status = 409;
    vi.mocked(assignmentService.withdrawStageTask)
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({ id: 'cell-submitted', status: 'InProgress' } as any);

    renderMyWork({ onShowToast });

    expect(await screen.findByTestId('lot-cell-rework-comment-cell-rework')).toHaveTextContent(
      'Cần chỉnh lại tỷ lệ đầu nhân vật ở khung 2',
    );
    expect(screen.getByTestId('lot-cell-attempt-cell-rework')).toHaveTextContent('Lần nộp #2');
    expect(screen.getByTestId('lot-cell-attempt-cell-submitted')).toHaveTextContent('Lần nộp #1');

    // Lần 1: BE trả 409 -> hiện đúng message BE, không báo thành công giả, vẫn refetch danh sách
    fireEvent.click(screen.getByTestId('withdraw-lot-cell-cell-submitted'));
    await waitFor(() => {
      expect(assignmentService.withdrawStageTask).toHaveBeenCalledWith('chap-1', 'cell-submitted');
      expect(onShowToast).toHaveBeenCalledWith(
        'Không thể rút bài',
        'Editor đang mở duyệt ô này nên không rút được; nhờ Editor trả bài hoặc nhả khoá duyệt.',
      );
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Editor đang mở duyệt ô này nên không rút được; nhờ Editor trả bài hoặc nhả khoá duyệt.',
    );
    expect(assignmentService.getMyTaskLots).toHaveBeenCalledTimes(2);

    // Lần 2: BE trả 200 OK -> báo Đã rút bài và cập nhật ô trực tiếp từ DTO trả về
    fireEvent.click(screen.getByTestId('withdraw-lot-cell-cell-submitted'));
    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith('Đã rút bài', 'Pencil · Trang 2');
      expect(screen.queryByTestId('withdraw-lot-cell-cell-submitted')).not.toBeInTheDocument();
    });
    expect(assignmentService.getMyTaskLots).toHaveBeenCalledTimes(2);
  });

  it('Khoá nút trên thẻ review đang UnderReview bởi người khác và cho Producer bấm Gỡ khoá duyệt', async () => {
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      { userId: 'u-artist', fullName: 'Minh Artist', email: 'artist@test.com', role: 'Artist' },
      { userId: 'u-editor-other', fullName: 'Lan Editor', email: 'lan@test.com', role: 'Editor' },
    ] as any);
    vi.mocked(assignmentService.getMyTaskLots).mockResolvedValue([]);
    vi.mocked(assignmentService.getTaskGridReviewQueue).mockResolvedValue([
      {
        taskId: 'cell-locked',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'p-1',
        pageNumber: 1,
        status: 'UnderReview',
        assigneeUserId: 'u-artist',
        reviewerUserId: 'u-editor-other',
        attemptNumber: 1,
        submittedAt: '2026-11-15T10:00:00Z',
      },
    ]);
    vi.mocked(assignmentService.releaseStageTaskReview).mockResolvedValue({
      id: 'cell-locked',
      status: 'Submitted',
    } as any);

    renderMyWork({ currentUserId: 'u-producer', workspaceRole: 'PRODUCER' });

    expect(await screen.findByTestId('locked-by-reviewer-cell-locked')).toHaveTextContent(
      'Đang được duyệt bởi Lan Editor',
    );
    expect(screen.getByTestId('approve-grid-task-cell-locked')).toBeDisabled();
    expect(screen.getByTestId('reject-grid-task-toggle-cell-locked')).toBeDisabled();

    fireEvent.click(screen.getByTestId('force-release-review-cell-locked'));
    await waitFor(() => {
      expect(assignmentService.releaseStageTaskReview).toHaveBeenCalledWith(
        'chap-1',
        'cell-locked',
      );
      expect(assignmentService.getTaskGridReviewQueue).toHaveBeenCalledTimes(2);
    });
  });
});

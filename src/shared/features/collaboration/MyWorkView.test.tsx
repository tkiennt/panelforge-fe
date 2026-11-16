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

  it('Artist xuyên chương đọc lô từ getMyTaskLots (không gọi review-queue để tránh 403) và Bắt đầu / Nộp ô trực tiếp', async () => {
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

    expect(await screen.findByText('Vẽ chì trang 1-2')).toBeInTheDocument();
    expect(assignmentService.getTaskGridReviewQueue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('start-lot-cell-cell-start'));
    await waitFor(() => {
      expect(assignmentService.startStageTask).toHaveBeenCalledWith('chap-1', 'cell-start');
    });

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
});

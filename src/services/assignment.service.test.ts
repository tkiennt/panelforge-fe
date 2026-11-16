import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignmentService, extractError } from './assignment.service';
import axiosClient from '../api/axiosClient';

vi.mock('../api/axiosClient');

describe('assignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyAssignments gọi /workspaces/{id}/my-assignments kèm bộ lọc', async () => {
    const mockData = [{ id: 'asg-9', chapterId: 'chap-2', seriesTitle: 'S', chapterNumber: 2 }];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await assignmentService.getMyAssignments('ws-1', { status: 'InProgress' });
    expect(axiosClient.get).toHaveBeenCalledWith('/workspaces/ws-1/my-assignments', {
      params: { status: 'InProgress' },
    });
    expect(result).toEqual(mockData);
  });

  it('getAssignments trả về mảng phân công khi gọi thành công', async () => {
    const mockData = [
      {
        id: 'asg-1',
        chapterId: 'chap-1',
        brief: 'Vẽ chì trang 1',
        status: 'Assigned',
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await assignmentService.getAssignments('chap-1');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/assignments', {
      params: undefined,
    });
    expect(result).toEqual(mockData);
  });

  it('getAssignments trả về mảng rỗng khi API lỗi', async () => {
    vi.mocked(axiosClient.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await assignmentService.getAssignments('chap-1');
    expect(result).toEqual([]);
  });

  it('getMyWorkspaceAssignments gọi GET /workspaces/{id}/my-assignments thành công', async () => {
    const mockList = [
      {
        id: 'asg-1',
        seriesId: 'ser-1',
        seriesTitle: 'Đại Chiến',
        chapterId: 'chap-1',
        chapterNumber: 1,
        brief: 'Vẽ Lineart',
        status: 'InProgress',
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockList });

    const result = await assignmentService.getMyWorkspaceAssignments('ws-1', { seriesId: 'ser-1' });
    expect(axiosClient.get).toHaveBeenCalledWith('/workspaces/ws-1/my-assignments', {
      params: { seriesId: 'ser-1' },
    });
    expect(result).toEqual(mockList);
  });

  it('getMyWorkspaceAssignments trả về mảng rỗng khi API lỗi', async () => {
    vi.mocked(axiosClient.get).mockRejectedValueOnce(new Error('Network error'));
    const result = await assignmentService.getMyWorkspaceAssignments('ws-1');
    expect(result).toEqual([]);
  });

  it('createAssignment gọi POST và trả về assignment mới', async () => {
    const req = {
      entityType: 'Page' as const,
      targetEntityId: 'page-1',
      pipelineStageId: 'stage-pencil',
      assigneeUserId: 'user-artist',
      brief: 'Phác thảo chì trang 1',
    };
    const mockCreated = { id: 'asg-2', ...req, status: 'Assigned' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockCreated });

    const result = await assignmentService.createAssignment('chap-1', req);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments', req);
    expect(result).toEqual(mockCreated);
  });

  it('createBulkAssignments gọi POST /bulk và trả về kết quả hoặc xem trước dryRun', async () => {
    const bulkReq = {
      pipelineStageId: 'stage-pencil',
      assigneeUserId: 'user-artist',
      brief: 'Vẽ chì hàng loạt',
      pageIds: ['page-1', 'page-2'],
      dryRun: true,
    };
    const mockBulkResult = {
      batchId: null,
      dryRun: true,
      granularity: 'Page' as const,
      createdCount: 0,
      items: [
        {
          entityType: 'Page' as const,
          targetEntityId: 'page-1',
          pageNumber: 1,
          conflictReason: null,
          assignmentId: null,
          dependsOnAssignmentIds: ['asg-thumbnail-1'],
        },
      ],
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockBulkResult });

    const result = await assignmentService.createBulkAssignments('chap-1', bulkReq);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/bulk', bulkReq);
    expect(result).toEqual(mockBulkResult);
  });

  it('getAssigneeSuggestions gọi GET /assignee-suggestions với pipelineStageId', async () => {
    const mockSuggestions = [
      {
        userId: 'user-artist-1',
        fullName: 'Artist Một',
        avatarUrl: null,
        role: 3, // WorkspaceRole.Artist
        activeAssignmentCount: 0,
        overdueCount: 0,
        stageExperienceCount: 4,
        isSeriesMember: true,
        reasons: ['Không có việc đang mở', 'Đã từng làm 4 việc ở stage này'],
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockSuggestions });

    const result = await assignmentService.getAssigneeSuggestions('chap-1', 'stage-pencil');
    expect(axiosClient.get).toHaveBeenCalledWith(
      '/chapters/chap-1/assignments/assignee-suggestions',
      { params: { pipelineStageId: 'stage-pencil' } },
    );
    expect(result).toEqual(mockSuggestions);
  });

  it('getAssigneeSuggestions trả về mảng rỗng khi API bị lỗi', async () => {
    vi.mocked(axiosClient.get).mockRejectedValueOnce(new Error('Lỗi máy chủ'));
    const result = await assignmentService.getAssigneeSuggestions('chap-1', 'stage-pencil');
    expect(result).toEqual([]);
  });

  it('updateAssignment gọi PUT và trả về assignment đã cập nhật', async () => {
    const req = {
      brief: 'Cập nhật ghi chú chì',
      priority: 'High' as const,
      assigneeUserId: 'user-artist-2',
    };
    const mockUpdated = { id: 'asg-2', ...req, status: 'Assigned' };
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: mockUpdated });

    const result = await assignmentService.updateAssignment('chap-1', 'asg-2', req);
    expect(axiosClient.put).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-2', req);
    expect(result).toEqual(mockUpdated);
  });

  it('startAssignment gọi POST /start để chuyển sang InProgress', async () => {
    const mockStarted = { id: 'asg-1', status: 'InProgress', startedAt: '2026-10-06T19:00:00Z' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockStarted });

    const result = await assignmentService.startAssignment('chap-1', 'asg-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-1/start');
    expect(result).toEqual(mockStarted);
  });

  it('submitAssignment gọi POST /submit để chuyển sang Submitted', async () => {
    const mockSubmitted = { id: 'asg-1', status: 'Submitted', completedAt: '2026-10-06T19:30:00Z' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockSubmitted });

    const result = await assignmentService.submitAssignment('chap-1', 'asg-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-1/submit');
    expect(result).toEqual(mockSubmitted);
  });

  it('getStageProgress gọi GET /stage-progress và trả về tiến độ panel', async () => {
    const mockProgress = [
      {
        id: 'sp-1',
        pageId: 'page-1',
        panelId: 'panel-1',
        pipelineStageId: 'stage-pencil',
        status: 'InProgress',
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockProgress });

    const result = await assignmentService.getStageProgress('chap-1', 'page-1');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/stage-progress', {
      params: { pageId: 'page-1' },
    });
    expect(result).toEqual(mockProgress);
  });

  it('openReview gọi POST /open-review và chuyển trạng thái sang UnderReview', async () => {
    const mockUnderReview = { id: 'asg-1', status: 'UnderReview' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockUnderReview });

    const result = await assignmentService.openReview('chap-1', 'asg-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-1/open-review');
    expect(result).toEqual(mockUnderReview);
  });

  it('approveAssignment gọi POST /approve và chuyển trạng thái sang Approved', async () => {
    const mockApproved = { id: 'asg-1', status: 'Approved' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockApproved });

    const result = await assignmentService.approveAssignment('chap-1', 'asg-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-1/approve');
    expect(result).toEqual(mockApproved);
  });

  it('requestChanges gọi POST /request-changes kèm comment và chuyển sang ReworkRequired', async () => {
    const mockRework = { id: 'asg-1', status: 'ReworkRequired', lastFeedbackComment: 'Nét còn mờ' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockRework });

    const result = await assignmentService.requestChanges('chap-1', 'asg-1', {
      comment: 'Nét còn mờ',
    });
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/assignments/asg-1/request-changes',
      { comment: 'Nét còn mờ' },
    );
    expect(result).toEqual(mockRework);
  });

  it('getSubmissions gọi GET /submissions và trả về danh sách các lần nộp', async () => {
    const mockSubmissions = [
      { id: 'sub-1', attemptNumber: 1, status: 'Rejected' },
      { id: 'sub-2', attemptNumber: 2, status: 'Pending' },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockSubmissions });

    const result = await assignmentService.getSubmissions('chap-1', 'asg-1');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/assignments/asg-1/submissions');
    expect(result).toEqual(mockSubmissions);
  });

  it('resolveChangeRequest gọi POST /resolve để đánh dấu đã sửa', async () => {
    const mockCR = { id: 'cr-1', status: 'Resolved', resolutionNote: 'Đã tỉa lại nét' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockCR });

    const result = await assignmentService.resolveChangeRequest('chap-1', 'cr-1', 'Đã tỉa lại nét');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/change-requests/cr-1/resolve', {
      note: 'Đã tỉa lại nét',
    });
    expect(result).toEqual(mockCR);
  });

  it('extractError trích xuất lỗi ASP.NET ProblemDetails errors (Point c)', () => {
    const errorWithProblemDetails = {
      response: {
        status: 400,
        data: {
          type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: {
            targetEntityId: [
              'The JSON value could not be converted to System.Nullable`1[System.Guid].',
            ],
          },
        },
      },
    };

    const msg = extractError(errorWithProblemDetails, 'Lỗi mặc định');
    expect(msg).toContain('The JSON value could not be converted to System.Nullable');
  });

  it('extractError trích xuất lỗi nghiệp vụ role không khớp (Point c)', () => {
    const errorRoleMismatch = {
      response: {
        status: 400,
        data: {
          error: "Stage 'Script' dành cho vai trò Writer, người nhận là Artist.",
        },
      },
    };

    const msg = extractError(errorRoleMismatch, 'Lỗi mặc định');
    expect(msg).toBe("Stage 'Script' dành cho vai trò Writer, người nhận là Artist.");
  });

  it('getVisualConsistencyReport gọi GET /visual-consistency-report với threshold', async () => {
    const mockReport = {
      chapterId: 'chap-1',
      threshold: 0.75,
      totalEvaluated: 4,
      passedCount: 3,
      deviationCount: 1,
      blockingDeviationCount: 0,
      deviations: [],
    };
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockReport });

    const result = await assignmentService.getVisualConsistencyReport('chap-1', 0.8);
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/visual-consistency-report', {
      params: { threshold: 0.8 },
    });
    expect(result).toEqual(mockReport);
  });

  it('runVisualConsistencyCheck gọi POST /visual-consistency-check thành công', async () => {
    const mockReport = {
      chapterId: 'chap-1',
      threshold: 0.75,
      totalEvaluated: 2,
      passedCount: 1,
      deviationCount: 1,
      blockingDeviationCount: 1,
      deviations: [],
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockReport });

    const result = await assignmentService.runVisualConsistencyCheck('chap-1', 0.75);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/visual-consistency-check', {
      threshold: 0.75,
    });
    expect(result).toEqual(mockReport);
  });
  it('transferAssignmentScope gọi đúng POST /transfer với nhiều targetIds và reason riêng', async () => {
    const mockCreated = [{ id: 'asg-transfer-1', brief: 'Vẽ trang 1' }];
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockCreated });

    const result = await assignmentService.transferAssignmentScope('chap-1', 'asg-orig', {
      targetType: 'Page',
      targetIds: ['page-1', 'page-2'],
      newAssigneeUserId: 'user-artist-2',
      reason: 'Phân tải tiến độ sang hoạ sĩ khác',
      brief: 'Vẽ trang 1 và 2',
    });

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/assignments/asg-orig/transfer',
      {
        targetType: 'Page',
        targetIds: ['page-1', 'page-2'],
        newAssigneeUserId: 'user-artist-2',
        reason: 'Phân tải tiến độ sang hoạ sĩ khác',
        brief: 'Vẽ trang 1 và 2',
      },
    );
    expect(result).toEqual(mockCreated);
  });

  it('resolveImpactReview gọi POST /impact-review với decision và reason', async () => {
    const mockResult = { id: 'asg-1', impactReviewReason: null, status: 'InProgress' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockResult });

    const result = await assignmentService.resolveImpactReview('chap-1', 'asg-1', {
      decision: 'Keep',
      reason: 'Đã rà soát, đầu ra vẫn tương thích',
    });

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/assignments/asg-1/impact-review',
      {
        decision: 'Keep',
        reason: 'Đã rà soát, đầu ra vẫn tương thích',
      },
    );
    expect(result).toEqual(mockResult);
  });

  it('extractError giữ nguyên thông báo nghiệp vụ của BE khi gặp 409 CONFLICT', () => {
    const err = {
      response: {
        status: 409,
        data: { code: 'CONFLICT', message: 'Dữ liệu phân công đã thay đổi' },
      },
    };
    const msg = extractError(err, 'Lỗi thao tác');
    expect(msg).toBe('Dữ liệu phân công đã thay đổi');
  });

  it('createAssignmentPlan gọi POST /chapters/{id}/assignments/plan với payload kế hoạch', async () => {
    const mockPlanResult = {
      batchId: 'batch-123',
      dryRun: false,
      createdCount: 3,
      stages: [
        {
          pipelineStageId: 'stage-1',
          stageName: 'Script',
          assigneeUserId: 'user-w',
          granularity: 'Chapter',
          items: [],
        },
      ],
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockPlanResult });

    const request = {
      stages: [{ pipelineStageId: 'stage-1', assigneeUserId: 'user-w', brief: 'Viết kịch bản' }],
      brief: 'Kế hoạch chương 1',
      dryRun: false,
    };

    const result = await assignmentService.createAssignmentPlan('chap-1', request as any);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/assignments/plan', request);
    expect(result).toEqual(mockPlanResult);
  });

  it('getAssignmentPlanTemplate gọi GET /chapters/{id}/assignments/plan-template thành công', async () => {
    const mockTemplate = {
      sourceChapterId: 'chap-0',
      sourceChapterNumber: 1,
      stages: [
        {
          pipelineStageId: 'stage-script',
          stageName: 'Kịch bản',
          stageOrder: 1,
          assigneeUserId: 'user-writer',
          assigneeName: 'Alex Writer',
          brief: 'Kịch bản mẫu',
        },
      ],
    };
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockTemplate });

    const result = await assignmentService.getAssignmentPlanTemplate('chap-2');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-2/assignments/plan-template');
    expect(result).toEqual(mockTemplate);
  });

  // ==========================================
  // Assignment Grid V3 (Lát cắt 1)
  // ==========================================
  it('getTaskGrid gọi GET /chapters/{id}/task-grid và trả về TaskGridDto', async () => {
    const mockGrid = {
      chapterId: 'chap-1',
      stages: [],
      pages: [{ id: 'p-1', pageNumber: 1 }],
      tasks: [],
      lots: [],
    };
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockGrid });

    const result = await assignmentService.getTaskGrid('chap-1');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/task-grid');
    expect(result).toEqual(mockGrid);
  });

  it('generateTaskGrid gọi POST /chapters/{id}/task-grid/generate', async () => {
    const mockRes = { created: 10, cancelled: 0, total: 10 };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockRes });

    const result = await assignmentService.generateTaskGrid('chap-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/generate');
    expect(result).toEqual(mockRes);
  });

  it('assignTaskGridLots gọi POST /chapters/{id}/task-grid/lots kèm dryRun', async () => {
    const mockRes = { dryRun: true, taskCount: 2, lots: [] };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockRes });

    const result = await assignmentService.assignTaskGridLots('chap-1', {
      lots: [{ pipelineStageId: 'stg-1', assigneeUserId: 'u-1', taskIds: ['t-1', 't-2'] }],
      dryRun: true,
    });
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/lots', {
      lots: [{ pipelineStageId: 'stg-1', assigneeUserId: 'u-1', taskIds: ['t-1', 't-2'] }],
      dryRun: true,
    });
    expect(result).toEqual(mockRes);
  });

  it('startStageTask, submitStageTasks và approveStageTask gọi đúng các route Lát cắt 1', async () => {
    const mockTask = { id: 't-1', pipelineStageId: 'stg-1', status: 'InProgress' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockTask });
    await assignmentService.startStageTask('chap-1', 't-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/tasks/t-1/start');

    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: [{ ...mockTask, status: 'Submitted' }],
    });
    const submitted = await assignmentService.submitStageTasks('chap-1', ['t-1']);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/tasks/submit', {
      taskIds: ['t-1'],
    });
    expect(submitted[0].status).toBe('Submitted');

    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: { ...mockTask, status: 'Approved' },
    });
    const approved = await assignmentService.approveStageTask('chap-1', 't-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/tasks/t-1/approve');
    expect(approved.status).toBe('Approved');
  });

  // ==========================================
  // Assignment Grid V3 (Lát cắt 2 & 2b)
  // ==========================================
  it('requestStageTaskChanges (kèm comment), getStageTaskSubmissions, reopenStageTask, resolveStageTaskImpact và unassignStageTasks gọi đúng các route Lát cắt 2/2b', async () => {
    const mockTask = { id: 't-1', pipelineStageId: 'stg-1', status: 'ReworkRequired' };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockTask });
    const reqChanges = await assignmentService.requestStageTaskChanges(
      'chap-1',
      't-1',
      'Sửa lại bố cục khung 2',
    );
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/task-grid/tasks/t-1/request-changes',
      { comment: 'Sửa lại bố cục khung 2' },
    );
    expect(reqChanges.status).toBe('ReworkRequired');

    const mockSubs = [
      {
        id: 'sub-1',
        attemptNumber: 1,
        status: 'Rejected',
        submittedByUserId: 'u-1',
        submittedAt: '2026-11-14T09:00:00Z',
        artworkReferenceIds: ['art-1'],
        decidedByUserId: 'u-editor',
        decidedAt: '2026-11-14T09:30:00Z',
        decisionComment: 'Sửa lại bố cục khung 2',
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockSubs });
    const subs = await assignmentService.getStageTaskSubmissions('chap-1', 't-1');
    expect(axiosClient.get).toHaveBeenCalledWith(
      '/chapters/chap-1/task-grid/tasks/t-1/submissions',
    );
    expect(subs).toEqual(mockSubs);

    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: { task: mockTask, outdatedTaskIds: ['t-2'] },
    });
    const reopened = await assignmentService.reopenStageTask('chap-1', 't-1', 'Sửa nét');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/tasks/t-1/reopen', {
      reason: 'Sửa nét',
    });
    expect(reopened.outdatedTaskIds).toEqual(['t-2']);

    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: { ...mockTask, status: 'InProgress', isInputOutdated: false },
    });
    const resolved = await assignmentService.resolveStageTaskImpact('chap-1', 't-2', true);
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/task-grid/tasks/t-2/resolve-impact',
      { keep: true },
    );
    expect(resolved.isInputOutdated).toBe(false);

    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: [{ ...mockTask, status: 'Unassigned', assigneeUserId: null }],
    });
    const unassigned = await assignmentService.unassignStageTasks('chap-1', ['t-1']);
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/task-grid/tasks/unassign', {
      taskIds: ['t-1'],
    });
    expect(unassigned[0].status).toBe('Unassigned');
  });

  // ==========================================
  // Assignment Grid V3 – Lát cắt 4 (Clean Cutover)
  // ==========================================
  it('getMyTaskLots, getTaskGridReviewQueue và migrateAssignmentsToGrid gọi đúng các route Lát cắt 4', async () => {
    const mockLots = [
      {
        id: 'lot-1',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        chapterTitle: 'Khởi đầu',
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        stageOrder: 1,
        assignedRole: 'Artist',
        status: 'Active',
        isOverdue: false,
        tasks: [
          {
            id: 'cell-1',
            pageId: 'page-1',
            pageNumber: 1,
            status: 'InProgress',
            isStartable: true,
            isInputOutdated: false,
          },
        ],
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockLots });
    const lots = await assignmentService.getMyTaskLots('ws-1', {
      seriesId: 'se-1',
      includeCompleted: true,
    });
    expect(axiosClient.get).toHaveBeenCalledWith('/workspaces/ws-1/my-task-lots', {
      params: { seriesId: 'se-1', includeCompleted: true },
    });
    expect(lots).toEqual(mockLots);

    const mockQueue = [
      {
        taskId: 'cell-2',
        seriesId: 'se-1',
        seriesTitle: 'Đốm Lửa Trường Sinh',
        chapterId: 'chap-1',
        chapterNumber: 1,
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'page-2',
        pageNumber: 2,
        status: 'Submitted',
        assigneeUserId: 'u-artist',
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:00:00Z',
      },
    ];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockQueue });
    const queue = await assignmentService.getTaskGridReviewQueue('ws-1', { seriesId: 'se-1' });
    expect(axiosClient.get).toHaveBeenCalledWith('/workspaces/ws-1/task-grid/review-queue', {
      params: { seriesId: 'se-1' },
    });
    expect(queue).toEqual(mockQueue);

    const mockMigrate = {
      migrated: 3,
      cellsAssigned: 12,
      skipped: [{ assignmentId: 'asg-old', chapterId: 'chap-1', reason: 'Công đoạn đã tắt' }],
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockMigrate });
    const migrated = await assignmentService.migrateAssignmentsToGrid('se-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/series/se-1/task-grid/migrate-assignments');
    expect(migrated).toEqual(mockMigrate);
  });
});

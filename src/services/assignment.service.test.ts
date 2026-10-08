import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignmentService, extractError } from './assignment.service';
import axiosClient from '../api/axiosClient';

vi.mock('../api/axiosClient');

describe('assignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

import axiosClient from '../api/axiosClient';
import {
  AssignmentDto,
  WorkspaceAssignmentDto,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  StageProgressDto,
  AssignmentStatus,
  WorkflowEntityType,
  AssignmentPriority,
  SubmissionDto,
  SubmissionStatus,
  ChangeRequestDto,
  ChangeRequestStatus,
  ChangeRequestItemRequest,
  RequestAssignmentChangesRequest,
  ConsistencyCheckResultDto,
  ConsistencyFindingDto,
  VisualDeviationDto,
  VisualConsistencyReportDto,
} from '@/types';

export type {
  AssignmentDto,
  WorkspaceAssignmentDto,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  StageProgressDto,
  AssignmentStatus,
  WorkflowEntityType,
  AssignmentPriority,
  SubmissionDto,
  SubmissionStatus,
  ChangeRequestDto,
  ChangeRequestStatus,
  ChangeRequestItemRequest,
  RequestAssignmentChangesRequest,
  ConsistencyCheckResultDto,
  ConsistencyFindingDto,
  VisualDeviationDto,
  VisualConsistencyReportDto,
};

export function extractError(error: any, defaultMsg: string): string {
  const data = error?.response?.data || error?.data;
  if (!data) return error?.message || defaultMsg;

  if (typeof data === 'string' && data.trim()) return data;
  if (data.error && typeof data.error === 'string') return data.error;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.detail && typeof data.detail === 'string') return data.detail;

  // ASP.NET Core ModelState Validation / ProblemDetails
  if (data.errors && typeof data.errors === 'object') {
    const errorList: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const fieldErrors = data.errors[key];
      if (Array.isArray(fieldErrors)) {
        errorList.push(...fieldErrors);
      } else if (typeof fieldErrors === 'string') {
        errorList.push(fieldErrors);
      }
    }
    if (errorList.length > 0) {
      return errorList.join('; ');
    }
  }

  if (data.title && typeof data.title === 'string') {
    return data.title;
  }

  return error?.message || defaultMsg;
}

export const assignmentService = {
  /**
   * Lấy danh sách phân công nhiệm vụ của Chapter (GET /api/chapters/{chapterId}/assignments)
   */
  getAssignments: async (
    chapterId: string,
    params?: {
      assigneeUserId?: string;
      status?: AssignmentStatus;
    },
  ): Promise<AssignmentDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/assignments`, {
        params,
      });
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp danh sách Assignment:', error);
      return [];
    }
  },

  /**
   * Danh sách toàn bộ việc được giao của một hoạ sĩ/biên kịch trên tất cả các chương trong Studio (Cross-Chapter Worklist).
   * GET /api/workspaces/{workspaceId}/my-assignments
   */
  getMyWorkspaceAssignments: async (
    workspaceId: string,
    params?: {
      status?: AssignmentStatus;
      seriesId?: string;
    },
  ): Promise<WorkspaceAssignmentDto[]> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/my-assignments`, {
        params,
      });
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp danh sách công việc toàn Studio:', error);
      return [];
    }
  },

  /**
   * Producer giao việc cho Chapter, Page hoặc Panel (POST /api/chapters/{chapterId}/assignments)
   */
  createAssignment: async (
    chapterId: string,
    request: CreateAssignmentRequest,
  ): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/assignments`, request);
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể tạo phân công nhiệm vụ'));
    }
  },

  /**
   * Producer sửa, giao lại hoặc đổi dependency (PUT /api/chapters/{chapterId}/assignments/{assignmentId})
   */
  updateAssignment: async (
    chapterId: string,
    assignmentId: string,
    request: UpdateAssignmentRequest,
  ): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.put(
        `/chapters/${chapterId}/assignments/${assignmentId}`,
        request,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể cập nhật phân công nhiệm vụ'));
    }
  },

  /**
   * Producer xoá mềm hoặc huỷ phân công nhiệm vụ (DELETE /api/chapters/{chapterId}/assignments/{assignmentId})
   */
  deleteAssignment: async (chapterId: string, assignmentId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/chapters/${chapterId}/assignments/${assignmentId}`);
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể huỷ/xoá phân công nhiệm vụ'));
    }
  },

  /**
   * Người được giao việc bắt đầu làm (POST /api/chapters/{chapterId}/assignments/{assignmentId}/start)
   * Tạo dòng InProgress trong StageProgress cho các Panel được giao
   */
  startAssignment: async (chapterId: string, assignmentId: string): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/start`,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể bắt đầu nhiệm vụ'));
    }
  },

  /**
   * Người được giao việc nộp sản phẩm (POST /api/chapters/{chapterId}/assignments/{assignmentId}/submit)
   * Chuyển trạng thái sang Submitted, bắt buộc Assignment đang ở InProgress
   */
  submitAssignment: async (chapterId: string, assignmentId: string): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/submit`,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể nộp bài phân công'));
    }
  },

  /**
   * Lấy tiến độ sản xuất theo Panel × Stage của Chapter (GET /api/chapters/{chapterId}/stage-progress)
   */
  getStageProgress: async (chapterId: string, pageId?: string): Promise<StageProgressDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/stage-progress`, {
        params: pageId ? { pageId } : undefined,
      });
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp StageProgress:', error);
      return [];
    }
  },

  /**
   * Mở xét duyệt review cho Assignment đã nộp (POST /api/chapters/{chapterId}/assignments/{assignmentId}/open-review)
   * Yêu cầu vai trò Editor hoặc Producer; chuyển Assignment sang UnderReview, StageProgress sang InReview
   */
  openReview: async (chapterId: string, assignmentId: string): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/open-review`,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể mở xét duyệt'));
    }
  },

  /**
   * Phê duyệt hoàn thành Assignment (POST /api/chapters/{chapterId}/assignments/{assignmentId}/approve)
   * Chuyển Assignment sang Approved, StageProgress sang Approved (mở stage sau BR-19).
   * expectedSubmissionId (tuỳ chọn): chống quyết định nhầm lần nộp; lệch → 409.
   */
  approveAssignment: async (
    chapterId: string,
    assignmentId: string,
    expectedSubmissionId?: string,
  ): Promise<AssignmentDto> => {
    try {
      const response = expectedSubmissionId
        ? await axiosClient.post(`/chapters/${chapterId}/assignments/${assignmentId}/approve`, {
            expectedSubmissionId,
          })
        : await axiosClient.post(`/chapters/${chapterId}/assignments/${assignmentId}/approve`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể phê duyệt nhiệm vụ'));
    }
  },

  /**
   * Yêu cầu sửa đổi / trả về Assignment (POST /api/chapters/{chapterId}/assignments/{assignmentId}/request-changes)
   * Chuyển Assignment sang ReworkRequired, StageProgress sang ChangesRequested
   */
  requestChanges: async (
    chapterId: string,
    assignmentId: string,
    req: RequestAssignmentChangesRequest,
  ): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/request-changes`,
        req,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể yêu cầu sửa đổi'));
    }
  },

  /**
   * Helper requestAssignmentChanges tiện dụng
   */
  requestAssignmentChanges: async (
    chapterId: string,
    assignmentId: string,
    comment: string,
    changes?: ChangeRequestItemRequest[],
    expectedSubmissionId?: string,
  ): Promise<AssignmentDto> => {
    return assignmentService.requestChanges(chapterId, assignmentId, {
      comment,
      changes,
      expectedSubmissionId,
    });
  },

  /**
   * Lấy lịch sử các lần nộp bài (GET /api/chapters/{chapterId}/assignments/{assignmentId}/submissions)
   */
  getSubmissions: async (chapterId: string, assignmentId: string): Promise<SubmissionDto[]> => {
    try {
      const response = await axiosClient.get(
        `/chapters/${chapterId}/assignments/${assignmentId}/submissions`,
      );
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp danh sách Submission:', error);
      return [];
    }
  },

  /**
   * Lấy danh sách yêu cầu sửa đổi ChangeRequests (GET /api/chapters/{chapterId}/change-requests)
   */
  getChangeRequests: async (
    chapterId: string,
    params?: {
      assignmentId?: string;
      status?: ChangeRequestStatus;
      responsibleUserId?: string;
    },
  ): Promise<ChangeRequestDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/change-requests`, { params });
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp danh sách ChangeRequest:', error);
      return [];
    }
  },

  /**
   * Đánh dấu đã sửa yêu cầu (POST /api/chapters/{chapterId}/change-requests/{changeRequestId}/resolve)
   * Chỉ người chịu trách nhiệm (assignee) mới có quyền gọi
   */
  resolveChangeRequest: async (
    chapterId: string,
    changeRequestId: string,
    note?: string,
  ): Promise<ChangeRequestDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/change-requests/${changeRequestId}/resolve`,
        note ? { note } : undefined,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể đánh dấu đã sửa yêu cầu'));
    }
  },

  /**
   * Xác minh yêu cầu đã sửa xong (POST /api/chapters/{chapterId}/change-requests/{changeRequestId}/verify)
   * Editor hoặc Producer gọi; nhận comment tuỳ chọn (lý do xác minh đạt).
   */
  verifyChangeRequest: async (
    chapterId: string,
    changeRequestId: string,
    comment?: string,
  ): Promise<ChangeRequestDto> => {
    try {
      const response =
        comment !== undefined
          ? await axiosClient.post(
              `/chapters/${chapterId}/change-requests/${changeRequestId}/verify`,
              { comment },
            )
          : await axiosClient.post(
              `/chapters/${chapterId}/change-requests/${changeRequestId}/verify`,
            );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể xác minh yêu cầu'));
    }
  },

  /**
   * Mở lại yêu cầu sửa đổi (POST /api/chapters/{chapterId}/change-requests/{changeRequestId}/reopen)
   */
  reopenChangeRequest: async (
    chapterId: string,
    changeRequestId: string,
    comment: string,
  ): Promise<ChangeRequestDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/change-requests/${changeRequestId}/reopen`,
        { comment },
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể mở lại yêu cầu'));
    }
  },

  /**
   * Từ chối yêu cầu sửa đổi (POST /api/chapters/{chapterId}/change-requests/{changeRequestId}/reject)
   */
  rejectChangeRequest: async (
    chapterId: string,
    changeRequestId: string,
    comment: string,
  ): Promise<ChangeRequestDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/change-requests/${changeRequestId}/reject`,
        { comment },
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể từ chối yêu cầu'));
    }
  },

  /** CF3: chạy kiểm tra nhất quán bằng code cho chương (POST /api/chapters/{chapterId}/consistency-check) */
  runConsistencyCheck: async (chapterId: string): Promise<ConsistencyCheckResultDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/consistency-check`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể chạy kiểm tra nhất quán'));
    }
  },

  /** CF3: finding của chương (GET /api/chapters/{chapterId}/consistency-findings) */
  getConsistencyFindings: async (chapterId: string): Promise<ConsistencyFindingDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/consistency-findings`);
      return response.data || [];
    } catch (error: any) {
      console.warn('Không thể nạp kết quả kiểm tra nhất quán:', error);
      return [];
    }
  },

  /** CF3 (BR-21): phân loại finding; Ignored/NeedsClarification bắt buộc note */
  triageConsistencyFinding: async (
    chapterId: string,
    findingId: string,
    decision: 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification',
    note?: string,
  ): Promise<ConsistencyFindingDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/consistency-findings/${findingId}/triage`,
        { decision, note },
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể phân loại lỗi nhất quán'));
    }
  },

  /** CF3 (V1.2): Lấy báo cáo nhất quán hình ảnh so với Character Sheet khóa (GET /api/chapters/{chapterId}/visual-consistency-report) */
  getVisualConsistencyReport: async (
    chapterId: string,
    threshold?: number,
  ): Promise<VisualConsistencyReportDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/visual-consistency-report`, {
        params: threshold !== undefined ? { threshold } : undefined,
      });
      return response.data;
    } catch (error: any) {
      console.warn('Không thể nạp báo cáo nhất quán hình ảnh:', error);
      throw new Error(extractError(error, 'Không thể nạp báo cáo nhất quán hình ảnh'));
    }
  },

  /** CF3 (V1.2): Chạy kiểm tra nhất quán hình ảnh cho chương (POST /api/chapters/{chapterId}/visual-consistency-check) */
  runVisualConsistencyCheck: async (
    chapterId: string,
    threshold?: number,
  ): Promise<VisualConsistencyReportDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/visual-consistency-check`, {
        threshold,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể chạy kiểm tra nhất quán hình ảnh'));
    }
  },
};

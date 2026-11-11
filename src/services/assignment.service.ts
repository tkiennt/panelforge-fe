import axiosClient from '../api/axiosClient';

// Request "start" đang chạy theo chapterId:assignmentId (chống gọi trùng)
const startInflight = new Map<string, Promise<any>>();
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
  ReturnWorkFromReviewRequest,
  TransferAssignmentScopeRequest,
  ResolveImpactReviewRequest,
  CreateBulkAssignmentRequest,
  BulkAssignmentItemDto,
  BulkAssignmentResultDto,
  AssigneeSuggestionDto,
  AssignmentPlanStageRequest,
  CreateAssignmentPlanRequest,
  AssignmentPlanStageResultDto,
  AssignmentPlanResultDto,
  AssignmentPlanTemplateStageDto,
  AssignmentPlanTemplateDto,
  EditorReviewQueueItemDto,
} from '@/types';

export type {
  AssignmentDto,
  WorkspaceAssignmentDto,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  CreateBulkAssignmentRequest,
  BulkAssignmentItemDto,
  BulkAssignmentResultDto,
  AssigneeSuggestionDto,
  AssignmentPlanStageRequest,
  CreateAssignmentPlanRequest,
  AssignmentPlanStageResultDto,
  AssignmentPlanResultDto,
  AssignmentPlanTemplateStageDto,
  AssignmentPlanTemplateDto,
  EditorReviewQueueItemDto,
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
  ReturnWorkFromReviewRequest,
  TransferAssignmentScopeRequest,
  ResolveImpactReviewRequest,
};

export function extractError(error: any, defaultMsg: string): string {
  const data = error?.response?.data || error?.data;
  if (!data) return error?.message || defaultMsg;

  if (error?.response?.status === 409 || data?.code === 'CONFLICT') {
    const detail = data?.message || data?.error || data?.detail;
    return detail
      ? `${detail}. Vui lòng tải lại trang để xem trạng thái mới nhất.`
      : 'Xung đột dữ liệu (409 Conflict): Thông tin công việc đã thay đổi. Vui lòng tải lại trang để xem trạng thái mới nhất.';
  }

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
   * Việc cá nhân của người đang đăng nhập trên mọi series/chương của Studio
   * (GET /api/workspaces/{workspaceId}/my-assignments)
   */
  getMyAssignments: async (
    workspaceId: string,
    params?: { status?: AssignmentStatus; seriesId?: string },
  ): Promise<WorkspaceAssignmentDto[]> => {
    const response = await axiosClient.get(`/workspaces/${workspaceId}/my-assignments`, {
      params,
    });
    return response.data || [];
  },

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
   * Cùng endpoint với getAssignments nhưng ném lỗi thay vì trả [] để màn Quy trình sản xuất
   * phân biệt "chương chưa có việc" với "lỗi tải" (GET /api/chapters/{chapterId}/assignments).
   */
  getAssignmentsStrict: async (chapterId: string): Promise<AssignmentDto[]> => {
    const response = await axiosClient.get(`/chapters/${chapterId}/assignments`);
    return response.data || [];
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
   * Lấy chi tiết Assignment theo ID (tìm kiếm từ Chapter assignments hoặc Workspace assignments)
   */
  getAssignmentById: async (
    assignmentId: string,
    chapterId?: string,
    workspaceId?: string,
  ): Promise<AssignmentDto | null> => {
    try {
      if (chapterId) {
        const list = await assignmentService.getAssignments(chapterId);
        const match = list.find((a) => a.id === assignmentId);
        if (match) return match;
      }
      if (workspaceId) {
        const list = await assignmentService.getMyWorkspaceAssignments(workspaceId);
        const match = list.find((a) => a.id === assignmentId);
        if (match) return match;
      }
      return null;
    } catch (err: any) {
      console.warn('Không thể nạp thông tin chi tiết Assignment:', err);
      return null;
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
   * Producer giao việc hàng loạt theo granularity của stage hoặc xem trước xung đột (dryRun)
   * (POST /api/chapters/{chapterId}/assignments/bulk)
   */
  createBulkAssignments: async (
    chapterId: string,
    request: CreateBulkAssignmentRequest,
  ): Promise<BulkAssignmentResultDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/assignments/bulk`, request);
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể giao việc hàng loạt'));
    }
  },

  /**
   * Ứng viên nhận việc đã xếp hạng theo stage cho Producer
   * (GET /api/chapters/{chapterId}/assignments/assignee-suggestions?pipelineStageId=)
   */
  getAssigneeSuggestions: async (
    chapterId: string,
    pipelineStageId: string,
  ): Promise<AssigneeSuggestionDto[]> => {
    try {
      const response = await axiosClient.get(
        `/chapters/${chapterId}/assignments/assignee-suggestions`,
        { params: { pipelineStageId } },
      );
      return response.data;
    } catch (error: any) {
      console.warn('Không thể nạp gợi ý người nhận việc:', error);
      return [];
    }
  },

  /**
   * Producer giao nhiều stage/role một lần theo kế hoạch
   * (POST /api/chapters/{chapterId}/assignments/plan)
   */
  createAssignmentPlan: async (
    chapterId: string,
    request: CreateAssignmentPlanRequest,
  ): Promise<AssignmentPlanResultDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/plan`,
        request,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể tạo kế hoạch giao việc'));
    }
  },

  /**
   * Lấy mẫu "giao như chương trước" từ chương gần nhất đã có phân công việc
   * (GET /api/chapters/{chapterId}/assignments/plan-template)
   */
  getAssignmentPlanTemplate: async (
    chapterId: string,
  ): Promise<AssignmentPlanTemplateDto> => {
    try {
      const response = await axiosClient.get(
        `/chapters/${chapterId}/assignments/plan-template`,
      );
      return response.data;
    } catch (error: any) {
      console.warn('Không thể nạp mẫu kế hoạch giao việc:', error);
      return { sourceChapterId: null, sourceChapterNumber: null, stages: [] };
    }
  },

  /**
   * Producer chuyển giao trang/khung của việc cả chương sang người khác; trả các việc mới
   * (POST /api/chapters/{chapterId}/assignments/{assignmentId}/transfer)
   */
  transferAssignmentScope: async (
    chapterId: string,
    assignmentId: string,
    request: TransferAssignmentScopeRequest,
  ): Promise<AssignmentDto[]> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/transfer`,
        request,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể chuyển giao phần việc'));
    }
  },

  /**
   * Editor/Producer quyết việc "cần kiểm tra ảnh hưởng": giữ kết quả hoặc làm lại
   * (POST /api/chapters/{chapterId}/assignments/{assignmentId}/impact-review)
   */
  resolveImpactReview: async (
    chapterId: string,
    assignmentId: string,
    request: ResolveImpactReviewRequest,
  ): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/impact-review`,
        request,
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể ghi quyết định kiểm tra ảnh hưởng'));
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
   * Producer huỷ phân công, lý do bắt buộc (DELETE /api/chapters/{chapterId}/assignments/{assignmentId}?reason=)
   */
  deleteAssignment: async (
    chapterId: string,
    assignmentId: string,
    reason: string,
  ): Promise<void> => {
    try {
      await axiosClient.delete(`/chapters/${chapterId}/assignments/${assignmentId}`, {
        params: { reason },
      });
    } catch (error: any) {
      throw new Error(extractError(error, 'Không thể huỷ/xoá phân công nhiệm vụ'));
    }
  },

  /**
   * Người được giao việc bắt đầu làm (POST /api/chapters/{chapterId}/assignments/{assignmentId}/start)
   * Tạo dòng InProgress trong StageProgress cho các Panel được giao
   */
  startAssignment: (chapterId: string, assignmentId: string): Promise<AssignmentDto> => {
    // Bấm đúp / gọi trùng khi request trước chưa xong: dùng chung một request, tránh 409 do gọi start hai lần
    const key = `${chapterId}:${assignmentId}`;
    const inflight = startInflight.get(key);
    if (inflight) return inflight;
    const req = (async () => {
      try {
        const response = await axiosClient.post(
          `/chapters/${chapterId}/assignments/${assignmentId}/start`,
        );
        return response.data as AssignmentDto;
      } catch (error: any) {
        // 409 ở đây là luật nghiệp vụ (việc phụ thuộc chưa Approved, chương không còn InProduction, BR-14...):
        // giữ nguyên câu `error` của BE và mã lỗi để giao diện giải thích đúng lý do.
        const err: any = new Error(extractError(error, 'Không thể bắt đầu nhiệm vụ'));
        err.status = error?.response?.status;
        err.code =
          error?.response?.data?.code || (error?.response?.status === 409 ? 'CONFLICT' : undefined);
        throw err;
      } finally {
        startInflight.delete(key);
      }
    })();
    startInflight.set(key, req);
    return req;
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

  /**
   * CF3: Màn duyệt cả chương (7. Review): trả việc của một trang/khung về người làm
   * (POST /api/chapters/{chapterId}/assignments/{reviewAssignmentId}/return-work)
   */
  returnWorkFromReview: async (
    chapterId: string,
    reviewAssignmentId: string,
    data: ReturnWorkFromReviewRequest,
  ): Promise<ChangeRequestDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${reviewAssignmentId}/return-work`,
        data,
      );
      return response.data;
    } catch (error: any) {
      const err = new Error(extractError(error, 'Không thể trả việc từ bước duyệt chương'));
      (err as any).status = error?.response?.status;
      (err as any).data = error?.response?.data;
      (err as any).rawError = error;
      throw err;
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

  /** Lấy danh sách hàng đợi duyệt của Editor theo Series (GET /api/series/{seriesId}/editor/review-queue) */
  getEditorReviewQueue: async (
    seriesId: string,
    params?: { gate?: string; status?: string }
  ): Promise<EditorReviewQueueItemDto[]> => {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/editor/review-queue`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.warn('Không thể nạp hàng đợi thẩm định Editor:', error);
      throw new Error(extractError(error, 'Không thể nạp hàng đợi thẩm định Editor'));
    }
  },
};

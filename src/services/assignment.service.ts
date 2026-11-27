import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

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
  StageTaskStatus,
  StageTaskLotStatus,
  TaskGridStageDto,
  TaskGridPageDto,
  StageTaskDto,
  StageTaskLotDto,
  TaskGridDto,
  GenerateStageTasksResultDto,
  StageTaskLotRequest,
  AssignStageTaskLotsRequest,
  AssignStageTaskLotsResultDto,
  AutoAssignPlanLotDto,
  AutoAssignPlanSkippedStageDto,
  AutoAssignPlanDto,
  UpdateStageTaskLotRequest,
  SubmitStageTasksRequest,
  ApproveStageTasksRequest,
  UnassignStageTasksRequest,
  ReopenStageTaskRequest,
  ResolveStageTaskImpactRequest,
  ReopenStageTaskResultDto,
  RequestStageTaskChangesRequest,
  StageTaskSubmissionStatus,
  StageTaskSubmissionDto,
  SubmissionPanelDto,
  MyTaskCellDto,
  MyTaskLotDto,
  TaskGridReviewItemDto,
  MigrateSkippedDto,
  MigrateAssignmentsResultDto,
  parseStageTaskPanelLayout,
  parseStageTaskCanvasVersions,
  pickLatestDecisionComment,
  resolveReworkDecisionComments,
} from '@/types';

export {
  parseStageTaskPanelLayout,
  parseStageTaskCanvasVersions,
  pickLatestDecisionComment,
  resolveReworkDecisionComments,
};

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
  StageTaskStatus,
  StageTaskLotStatus,
  TaskGridStageDto,
  TaskGridPageDto,
  StageTaskDto,
  StageTaskLotDto,
  TaskGridDto,
  GenerateStageTasksResultDto,
  StageTaskLotRequest,
  AssignStageTaskLotsRequest,
  AssignStageTaskLotsResultDto,
  AutoAssignPlanLotDto,
  AutoAssignPlanSkippedStageDto,
  AutoAssignPlanDto,
  UpdateStageTaskLotRequest,
  SubmitStageTasksRequest,
  ApproveStageTasksRequest,
  UnassignStageTasksRequest,
  ReopenStageTaskRequest,
  ResolveStageTaskImpactRequest,
  ReopenStageTaskResultDto,
  RequestStageTaskChangesRequest,
  StageTaskSubmissionStatus,
  StageTaskSubmissionDto,
  SubmissionPanelDto,
  MyTaskCellDto,
  MyTaskLotDto,
  TaskGridReviewItemDto,
  MigrateSkippedDto,
  MigrateAssignmentsResultDto,
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
    return detail || translate('errors.services.assignment.conflict');
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

export function extractBlockers<T = any>(error: any): T[] {
  const data = error?.response?.data || error?.data;
  if (Array.isArray(data?.blockers)) return data.blockers;
  if (Array.isArray(error?.blockers)) return error.blockers;
  return [];
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
      throw new Error(extractError(error, translate('errors.services.assignment.createFailed')));
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.createBulkFailed')),
      );
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
      const response = await axiosClient.post(`/chapters/${chapterId}/assignments/plan`, request);
      return response.data;
    } catch (error: any) {
      throw new Error(
        extractError(error, translate('errors.services.assignment.createPlanFailed')),
      );
    }
  },

  /**
   * Lấy mẫu "giao như chương trước" từ chương gần nhất đã có phân công việc
   * (GET /api/chapters/{chapterId}/assignments/plan-template)
   */
  getAssignmentPlanTemplate: async (chapterId: string): Promise<AssignmentPlanTemplateDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/assignments/plan-template`);
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.transferScopeFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.resolveImpactReviewFailed')),
      );
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
      throw new Error(extractError(error, translate('errors.services.assignment.updateFailed')));
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
      throw new Error(extractError(error, translate('errors.services.assignment.deleteFailed')));
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
        const err: any = new Error(
          extractError(error, translate('errors.services.assignment.startFailed')),
        );
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
      throw new Error(extractError(error, translate('errors.services.assignment.submitFailed')));
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.openReviewFailed')),
      );
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
      throw new Error(extractError(error, translate('errors.services.assignment.approveFailed')));
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.requestChangesFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.resolveChangeRequestFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.verifyChangeRequestFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.reopenChangeRequestFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.rejectChangeRequestFailed')),
      );
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
      const err = new Error(
        extractError(error, translate('errors.services.assignment.returnWorkFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.runConsistencyCheckFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.triageFindingFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.getVisualReportFailed')),
      );
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
      throw new Error(
        extractError(error, translate('errors.services.assignment.runVisualCheckFailed')),
      );
    }
  },

  /** Lấy danh sách hàng đợi duyệt của Editor theo Series (GET /api/series/{seriesId}/editor/review-queue) */
  getEditorReviewQueue: async (
    seriesId: string,
    params?: { gate?: string; status?: string },
  ): Promise<EditorReviewQueueItemDto[]> => {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/editor/review-queue`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.warn('Không thể nạp hàng đợi thẩm định Editor:', error);
      throw new Error(
        extractError(error, translate('errors.services.assignment.getEditorReviewQueueFailed')),
      );
    }
  },

  // ==========================================
  // Assignment Grid V3 (StageTask × StageTaskLot)
  // ==========================================

  /** Lấy lưới giao việc V3 của chương (GET /api/chapters/{chapterId}/task-grid) */
  getTaskGrid: async (chapterId: string): Promise<TaskGridDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/task-grid`);
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.getTaskGridFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Sinh / đồng bộ các ô StageTask cho chương (POST /api/chapters/{chapterId}/task-grid/generate) — chỉ Producer */
  generateTaskGrid: async (chapterId: string): Promise<GenerateStageTasksResultDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/task-grid/generate`);
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.generateTaskGridFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Lấy kế hoạch giao tự động các ô Unassigned trên lưới V3 (GET /api/chapters/{chapterId}/task-grid/auto-assign-plan) — chỉ xem trước, không ghi DB */
  getAutoAssignPlan: async (chapterId: string): Promise<AutoAssignPlanDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/task-grid/auto-assign-plan`);
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.getAutoAssignPlanFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Giao việc theo lô trên lưới V3 (POST /api/chapters/{chapterId}/task-grid/lots) — chỉ Producer */
  assignTaskGridLots: async (
    chapterId: string,
    request: AssignStageTaskLotsRequest,
  ): Promise<AssignStageTaskLotsResultDto> => {
    try {
      const payload: AssignStageTaskLotsRequest = {
        lots: request.lots,
        dryRun: request.dryRun ?? false,
        ...(request.reassign !== undefined ? { reassign: request.reassign } : {}),
        ...(request.confirmStartedWork !== undefined
          ? { confirmStartedWork: request.confirmStartedWork }
          : {}),
        ...(request.expectedRowVersions !== undefined
          ? { expectedRowVersions: request.expectedRowVersions }
          : {}),
      };
      const response = await axiosClient.post(`/chapters/${chapterId}/task-grid/lots`, payload);
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.assignLotsFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Sửa brief / hạn hoàn thành của lô trên lưới V3 (PATCH /api/chapters/{chapterId}/task-grid/lots/{lotId}) — chỉ Producer */
  updateStageTaskLot: async (
    chapterId: string,
    lotId: string,
    request: UpdateStageTaskLotRequest,
  ): Promise<StageTaskLotDto> => {
    try {
      const response = await axiosClient.patch(`/chapters/${chapterId}/task-grid/lots/${lotId}`, {
        brief: request.brief ?? null,
        dueDate: request.dueDate ?? null,
        clearDueDate: request.clearDueDate ?? false,
        expectedRowVersion: request.expectedRowVersion ?? null,
      });
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.updateLotFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Bắt đầu một ô StageTask (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/start) */
  startStageTask: async (chapterId: string, taskId: string): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/start`,
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.startStageTaskFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Nộp một hoặc nhiều ô StageTask (POST /api/chapters/{chapterId}/task-grid/tasks/submit) */
  submitStageTasks: async (chapterId: string, taskIds: string[]): Promise<StageTaskDto[]> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/task-grid/tasks/submit`, {
        taskIds,
      });
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.submitStageTasksFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Người giữ ô rút bài đã nộp khi ô còn Submitted (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/withdraw) */
  withdrawStageTask: async (chapterId: string, taskId: string): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/withdraw`,
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.withdrawStageTaskFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Editor/Producer mở khoá duyệt một ô Submitted → UnderReview (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/open-review) */
  openStageTaskReview: async (chapterId: string, taskId: string): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/open-review`,
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.openStageTaskReviewFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Người đang duyệt hoặc Producer nhả khoá duyệt UnderReview → Submitted (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/release-review) */
  releaseStageTaskReview: async (chapterId: string, taskId: string): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/release-review`,
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.releaseStageTaskReviewFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Duyệt một ô StageTask (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/approve) — Editor/Producer khác người làm */
  approveStageTask: async (chapterId: string, taskId: string): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/approve`,
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.approveStageTaskFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Duyệt nhiều ô StageTask một lần, tất cả hoặc không (POST /api/chapters/{chapterId}/task-grid/tasks/approve) — Editor/Producer */
  approveStageTasks: async (chapterId: string, taskIds: string[]): Promise<StageTaskDto[]> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/task-grid/tasks/approve`, {
        taskIds,
      });
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.approveStageTasksFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Yêu cầu sửa một ô StageTask kèm nhận xét bắt buộc (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/request-changes) — Editor/Producer khác người làm */
  requestStageTaskChanges: async (
    chapterId: string,
    taskId: string,
    comment: string,
  ): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/request-changes`,
        { comment },
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.requestStageTaskChangesFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Lấy lịch sử lần nộp của một ô StageTask (GET /api/chapters/{chapterId}/task-grid/tasks/{taskId}/submissions) */
  getStageTaskSubmissions: async (
    chapterId: string,
    taskId: string,
  ): Promise<StageTaskSubmissionDto[]> => {
    try {
      const response = await axiosClient.get(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/submissions`,
      );
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.getStageTaskSubmissionsFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Mở lại một ô StageTask đã Approved (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/reopen) — chỉ Producer */
  reopenStageTask: async (
    chapterId: string,
    taskId: string,
    reason: string,
  ): Promise<ReopenStageTaskResultDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/reopen`,
        { reason },
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.reopenStageTaskFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Xử lý cờ lỗi thời trên ô StageTask (POST /api/chapters/{chapterId}/task-grid/tasks/{taskId}/resolve-impact) — chỉ Producer */
  resolveStageTaskImpact: async (
    chapterId: string,
    taskId: string,
    keep: boolean,
  ): Promise<StageTaskDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/task-grid/tasks/${taskId}/resolve-impact`,
        { keep },
      );
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.resolveStageTaskImpactFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Bỏ gán một hoặc nhiều ô StageTask (POST /api/chapters/{chapterId}/task-grid/tasks/unassign) — chỉ Producer */
  unassignStageTasks: async (chapterId: string, taskIds: string[]): Promise<StageTaskDto[]> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/task-grid/tasks/unassign`, {
        taskIds,
      });
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.unassignStageTasksFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  // ==========================================
  // Assignment Grid V3 — Clean Cutover (Lát cắt 4)
  // ==========================================

  /** Lấy các lô công việc của người gọi xuyên chương (GET /api/workspaces/{workspaceId}/my-task-lots) */
  getMyTaskLots: async (
    workspaceId: string,
    params?: { seriesId?: string; includeCompleted?: boolean },
  ): Promise<MyTaskLotDto[]> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/my-task-lots`, {
        params,
      });
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.getMyTaskLotsFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Lấy hàng đợi duyệt ô Lưới V3 trong Workspace (GET /api/workspaces/{workspaceId}/task-grid/review-queue) — Editor/Producer */
  getTaskGridReviewQueue: async (
    workspaceId: string,
    params?: { seriesId?: string },
  ): Promise<TaskGridReviewItemDto[]> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/task-grid/review-queue`, {
        params,
      });
      return response.data || [];
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.getTaskGridReviewQueueFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },

  /** Chuyển Assignment V2 còn sống của Series sang Lưới V3 (POST /api/series/{seriesId}/task-grid/migrate-assignments) — chỉ Producer */
  migrateAssignmentsToGrid: async (seriesId: string): Promise<MigrateAssignmentsResultDto> => {
    try {
      const response = await axiosClient.post(`/series/${seriesId}/task-grid/migrate-assignments`);
      return response.data;
    } catch (error: any) {
      const err: any = new Error(
        extractError(error, translate('errors.services.assignment.migrateAssignmentsFailed')),
      );
      err.status = error?.response?.status;
      err.code = error?.response?.data?.code;
      err.data = error?.response?.data;
      throw err;
    }
  },
};

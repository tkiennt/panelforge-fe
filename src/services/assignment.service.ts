import axiosClient from '../api/axiosClient';
import {
  AssignmentDto,
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
  RequestAssignmentChangesRequest,
} from '@/types';

export type {
  AssignmentDto,
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
  RequestAssignmentChangesRequest,
};

function extractError(error: any, defaultMsg: string): string {
  return error.response?.data?.error || error.response?.data?.message || defaultMsg;
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
   * Chuyển Assignment sang Approved, StageProgress sang Approved (mở stage sau BR-19)
   */
  approveAssignment: async (chapterId: string, assignmentId: string): Promise<AssignmentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/assignments/${assignmentId}/approve`,
      );
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
   * Editor hoặc Producer gọi
   */
  verifyChangeRequest: async (
    chapterId: string,
    changeRequestId: string,
  ): Promise<ChangeRequestDto> => {
    try {
      const response = await axiosClient.post(
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
};

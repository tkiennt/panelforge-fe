// src/services/assignment.service.ts
import axiosClient from '../api/axiosClient';
import {
  AssignmentDto,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  StageProgressDto,
  AssignmentStatus,
  WorkflowEntityType,
  AssignmentPriority,
} from '@/types';

export type {
  AssignmentDto,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  StageProgressDto,
  AssignmentStatus,
  WorkflowEntityType,
  AssignmentPriority,
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
};

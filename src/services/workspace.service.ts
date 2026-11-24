// src/services/workspace.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

export interface CreateWorkspaceRequest {
  name: string;
  storageQuotaBytes?: number;
}

export interface UpdateWorkspaceRequest {
  name: string;
}

export interface WorkspaceMemberPreviewDto {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  createdAt: string;
  isOwner: boolean;
  currentUserRole?: string | number | null;
  memberCount: number;
  pendingTasks?: number;
  coverUrl?: string | null;
  description?: string | null;
  memberPreviews?: WorkspaceMemberPreviewDto[] | null;
  seriesCount?: number;
  seriesPreviews?: any[] | null;
  lastActivityAt?: string | null;
}

export interface UsageMeterDto {
  used: number;
  quota: number;
  isUnlimited: boolean;
  percentUsed: number | null;
}

export interface WorkspaceUsageDto {
  workspaceId: string;
  storage: UsageMeterDto;
  aiTokens: UsageMeterDto | null;
  aiEnabled: boolean | null;
  images: UsageMeterDto | null;
  activeSessions?: UsageMeterDto | null;
  activeMemberCount?: number | null;
  maxConcurrentSessionsPerUser?: number | null;
}

export interface WorkspaceSessionDto {
  sessionId: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionStartedAt: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
}

export interface ChapterReaderStatsDto {
  chapterId: string;
  chapterNumber: number;
  title?: string | null;
  isPublished: boolean;
  views: number;
  uniqueReaders: number;
}

export interface SeriesReaderStatsDto {
  seriesId: string;
  title: string;
  views: number;
  uniqueReaders: number;
  chapters: ChapterReaderStatsDto[];
}

export interface WorkspaceReaderStatsDto {
  totalViews: number;
  totalUniqueReaders: number;
  series: SeriesReaderStatsDto[];
}

export interface WorkspaceMemberDto {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: string | number;
  isOwner: boolean;
  joinedAt: string;
  isEmailConfirmed?: boolean;
  invitationEmailSent?: boolean;
  status?: 'Active' | 'Pending' | 'Rejected' | string;
}

export interface AddWorkspaceMemberRequest {
  email: string;
  role: string | number;
}

export interface UpdateMemberRoleRequest {
  newRole: string | number;
}

// Xử lý lỗi từ Axios
async function parseErrorResponse(error: any, defaultMsg: string): Promise<string> {
  if (error.response) {
    const data = error.response.data;
    const status = error.response.status;
    if (typeof data === 'string' && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;

    if (status === 401) return translate('errors.services.workspace.unauthorized');
    if (status === 403) return translate('errors.services.workspace.forbidden');
    if (status === 404) return translate('errors.services.workspace.notFound');
    if (status === 409) return 'Thao tác bị xung đột với trạng thái hiện tại (409 Conflict).';
  }
  return defaultMsg;
}

export const MOCK_WORKSPACES: WorkspaceDto[] = [];
export const MOCK_WORKSPACE_MEMBERS: WorkspaceMemberDto[] = [];

export const workspaceService = {
  createWorkspace: async (request: CreateWorkspaceRequest): Promise<WorkspaceDto> => {
    try {
      const response = await axiosClient.post('/Workspaces', request);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.createFailed')),
      );
    }
  },

  getMyWorkspaces: async (): Promise<WorkspaceDto[]> => {
    // Chưa đăng nhập thì không gọi API (tránh 401 làm phát 'auth:unauthorized')
    if (
      typeof window !== 'undefined' &&
      !localStorage.getItem('user') &&
      !localStorage.getItem('token')
    ) {
      return [];
    }
    try {
      const response = await axiosClient.get('/Workspaces');
      return response.data;
    } catch (error) {
      console.warn('workspaceService.getMyWorkspaces error:', error);
      return [];
    }
  },

  getWorkspaceById: async (id: string): Promise<WorkspaceDto> => {
    try {
      const response = await axiosClient.get(`/Workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.getByIdFailed')),
      );
    }
  },

  updateWorkspace: async (id: string, request: UpdateWorkspaceRequest): Promise<WorkspaceDto> => {
    try {
      const response = await axiosClient.put(`/Workspaces/${id}`, request);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.updateFailed')),
      );
    }
  },

  deleteWorkspace: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await axiosClient.delete(`/Workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.deleteFailed')),
      );
    }
  },

  getMembers: async (id: string): Promise<WorkspaceMemberDto[]> => {
    try {
      const response = await axiosClient.get(`/Workspaces/${id}/members`);
      return response.data;
    } catch (error) {
      console.warn('workspaceService.getMembers error:', error);
      return [];
    }
  },

  addMember: async (
    id: string,
    request: AddWorkspaceMemberRequest,
  ): Promise<WorkspaceMemberDto> => {
    try {
      const response = await axiosClient.post(`/Workspaces/${id}/members`, request);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.addMemberFailed')),
      );
    }
  },

  resendInvitation: async (id: string, userId: string): Promise<void> => {
    try {
      await axiosClient.post(`/Workspaces/${id}/members/${userId}/resend-invitation`);
    } catch (error) {
      throw new Error(
        await parseErrorResponse(
          error,
          translate('errors.services.workspace.resendInvitationFailed'),
        ),
      );
    }
  },

  updateMemberRole: async (
    id: string,
    userId: string,
    request: UpdateMemberRoleRequest,
  ): Promise<WorkspaceMemberDto> => {
    try {
      const response = await axiosClient.put(`/Workspaces/${id}/members/${userId}`, request);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(
          error,
          translate('errors.services.workspace.updateMemberRoleFailed'),
        ),
      );
    }
  },

  removeMember: async (id: string, userId: string): Promise<{ message: string }> => {
    try {
      const response = await axiosClient.delete(`/Workspaces/${id}/members/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.removeMemberFailed')),
      );
    }
  },

  acceptInvitation: async (workspaceId: string): Promise<WorkspaceMemberDto> => {
    try {
      const response = await axiosClient.post(`/Workspaces/${workspaceId}/accept-invitation`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(
          error,
          translate('errors.services.workspace.acceptInvitationFailed'),
        ),
      );
    }
  },

  rejectInvitation: async (workspaceId: string): Promise<void> => {
    try {
      await axiosClient.post(`/Workspaces/${workspaceId}/reject-invitation`);
    } catch (error) {
      throw new Error(
        await parseErrorResponse(
          error,
          translate('errors.services.workspace.rejectInvitationFailed'),
        ),
      );
    }
  },

  getPendingInvitations: async (): Promise<
    Array<{
      workspaceId: string;
      workspaceName: string;
      ownerName: string;
      ownerEmail: string;
      role: string;
      invitedAt: string;
    }>
  > => {
    try {
      const response = await axiosClient.get('/Workspaces/pending-invitations');
      return response.data;
    } catch (error) {
      console.warn('workspaceService.getPendingInvitations error:', error);
      return [];
    }
  },

  getWorkspaceAuditLogs: async (
    workspaceId: string,
    params?: Record<string, any>,
  ): Promise<any> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/audit-logs`, { params });
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.getAuditLogsFailed')),
      );
    }
  },

  /**
   * Lấy mức dùng Storage và AI Tokens so với giới hạn (GET /api/workspaces/{id}/usage)
   */
  getWorkspaceUsage: async (workspaceId: string): Promise<WorkspaceUsageDto> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/usage`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.getUsageFailed')),
      );
    }
  },

  /**
   * Lấy danh sách thiết bị và phiên làm việc đồng thời trong Studio (GET /api/workspaces/{id}/sessions)
   */
  getActiveSessions: async (workspaceId: string): Promise<WorkspaceSessionDto[]> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/sessions`);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.getSessionsFailed')),
      );
    }
  },

  /**
   * Thu hồi phiên làm việc của một thiết bị (DELETE /api/workspaces/{id}/sessions/{sessionId})
   */
  revokeSession: async (workspaceId: string, sessionId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/workspaces/${workspaceId}/sessions/${sessionId}`);
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.revokeSessionFailed')),
      );
    }
  },

  /**
   * Lấy số liệu lượt đọc & độc giả thực tế của Studio (GET /api/workspaces/{id}/reader-stats)
   */
  getReaderStats: async (workspaceId: string): Promise<WorkspaceReaderStatsDto> => {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/reader-stats`);
      return response.data;
    } catch (error) {
      console.warn('workspaceService.getReaderStats error:', error);
      return { totalViews: 0, totalUniqueReaders: 0, series: [] };
    }
  },

  /**
   * Đặt ảnh bìa Studio (PUT /api/workspaces/{id}/cover, multipart/form-data)
   * Backend lưu lên Cloudflare R2 và cập nhật DB, trả về URL ảnh kèm version hash.
   */
  setWorkspaceCover: async (id: string, file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.put<{ value?: string | null }>(
        `/workspaces/${id}/cover`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data?.value ?? null;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.setCoverFailed')),
      );
    }
  },

  /**
   * Xóa ảnh bìa Studio, quay về ảnh mặc định (DELETE /api/workspaces/{id}/cover)
   */
  clearWorkspaceCover: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`/workspaces/${id}/cover`);
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.workspace.clearCoverFailed')),
      );
    }
  },
};

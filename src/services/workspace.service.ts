// src/services/workspace.service.ts
import axiosClient from '../api/axiosClient';

export interface CreateWorkspaceRequest {
  name: string;
  storageQuotaBytes?: number;
}

export interface UpdateWorkspaceRequest {
  name: string;
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
  currentUserRole: string | number | null;
  memberCount: number;
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
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (status === 401) return 'Chưa xác thực danh tính (401 Unauthorized).';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này (403 Forbidden).';
    if (status === 404) return 'Không tìm thấy Workspace hoặc thành viên.';
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
      throw new Error(await parseErrorResponse(error, 'Tạo Workspace thất bại.'));
    }
  },

  getMyWorkspaces: async (): Promise<WorkspaceDto[]> => {
    if (!localStorage.getItem('token') && !localStorage.getItem('jwt_token')) return [];
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
      throw new Error(await parseErrorResponse(error, 'Không thể lấy thông tin Workspace.'));
    }
  },

  updateWorkspace: async (id: string, request: UpdateWorkspaceRequest): Promise<WorkspaceDto> => {
    try {
      const response = await axiosClient.put(`/Workspaces/${id}`, request);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Cập nhật Workspace thất bại.'));
    }
  },

  deleteWorkspace: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await axiosClient.delete(`/Workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Xóa Workspace thất bại.'));
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
      throw new Error(await parseErrorResponse(error, 'Thêm thành viên thất bại.'));
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
      throw new Error(await parseErrorResponse(error, 'Cập nhật vai trò thành viên thất bại.'));
    }
  },

  removeMember: async (id: string, userId: string): Promise<{ message: string }> => {
    try {
      const response = await axiosClient.delete(`/Workspaces/${id}/members/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Xóa thành viên khỏi Workspace thất bại.'));
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
        await parseErrorResponse(error, 'Không thể tải lịch sử Audit của Workspace.'),
      );
    }
  },
};

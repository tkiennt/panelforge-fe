// src/services/workspace.service.ts
import { API_URL } from '../config/env';

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

function getActiveToken(customToken?: string): string | null {
  if (customToken) return customToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

function isMockOrUnauthenticated(token: string | null): boolean {
  return !token || token.startsWith('mock-');
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = getActiveToken(customToken) || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseErrorResponse(response: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await response.json();
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  } catch {
    // empty body
  }
  if (response.status === 401) return 'Chưa xác thực danh tính (401 Unauthorized).';
  if (response.status === 403)
    return 'Bạn không có quyền thực hiện thao tác này trong Workspace (403 Forbidden).';
  if (response.status === 404) return 'Không tìm thấy Workspace hoặc thành viên.';
  return defaultMsg;
}

// Danh sách rỗng mặc định khi chưa có dữ liệu thật từ API
export const MOCK_WORKSPACES: WorkspaceDto[] = [];
export const MOCK_WORKSPACE_MEMBERS: WorkspaceMemberDto[] = [];

export const workspaceService = {
  createWorkspace: async (
    request: CreateWorkspaceRequest,
    token?: string,
  ): Promise<WorkspaceDto> => {
    const response = await fetch(`${API_URL}/api/Workspaces`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Tạo Workspace thất bại.'));
    }
    return await response.json();
  },

  getMyWorkspaces: async (token?: string): Promise<WorkspaceDto[]> => {
    const activeToken = getActiveToken(token);
    if (!activeToken) {
      return [];
    }

    try {
      const response = await fetch(`${API_URL}/api/Workspaces`, {
        method: 'GET',
        headers: getAuthHeaders(activeToken),
      });
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        return [];
      }
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể lấy danh sách Workspaces.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('workspaceService.getMyWorkspaces error:', err.message);
      return [];
    }
  },

  getWorkspaceById: async (id: string, token?: string): Promise<WorkspaceDto> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(activeToken),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể lấy thông tin Workspace.'));
    }
    return await response.json();
  },

  updateWorkspace: async (
    id: string,
    request: UpdateWorkspaceRequest,
    token?: string,
  ): Promise<WorkspaceDto> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(activeToken),
      body: JSON.stringify(request),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Cập nhật Workspace thất bại.'));
    }
    return await response.json();
  },

  deleteWorkspace: async (id: string, token?: string): Promise<{ message: string }> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(activeToken),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Xóa Workspace thất bại.'));
    }
    return await response.json();
  },

  getMembers: async (id: string, token?: string): Promise<WorkspaceMemberDto[]> => {
    const activeToken = getActiveToken(token);
    if (!activeToken) return [];

    try {
      const response = await fetch(`${API_URL}/api/Workspaces/${id}/members`, {
        method: 'GET',
        headers: getAuthHeaders(activeToken),
      });
      if (response.status === 401) {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        return [];
      }
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể lấy danh sách thành viên.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('workspaceService.getMembers error:', err.message);
      return [];
    }
  },

  addMember: async (
    id: string,
    request: AddWorkspaceMemberRequest,
    token?: string,
  ): Promise<WorkspaceMemberDto> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members`, {
      method: 'POST',
      headers: getAuthHeaders(activeToken),
      body: JSON.stringify(request),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Thêm thành viên thất bại.'));
    }
    return await response.json();
  },

  updateMemberRole: async (
    id: string,
    userId: string,
    request: UpdateMemberRoleRequest,
    token?: string,
  ): Promise<WorkspaceMemberDto> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(activeToken),
      body: JSON.stringify(request),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Cập nhật vai trò thành viên thất bại.'));
    }
    return await response.json();
  },

  removeMember: async (
    id: string,
    userId: string,
    token?: string,
  ): Promise<{ message: string }> => {
    const activeToken = getActiveToken(token);
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(activeToken),
    });
    if (response.status === 401) {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      throw new Error('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new Error(
        await parseErrorResponse(response, 'Xóa thành viên khỏi Workspace thất bại.'),
      );
    }
    return await response.json();
  },
};

// src/services/workspace.service.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5044';

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

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
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

// Mock fallback for workspaces
export const MOCK_WORKSPACES: WorkspaceDto[] = [
  {
    id: 'w-1111-2222-3333-4444',
    name: 'Chronicles of Aria Main Studio',
    ownerId: 'u-admin-1',
    ownerName: 'Tatsuki Fujimoto',
    ownerEmail: 'producer@panelforge.com',
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    usedStorageBytes: 3.4 * 1024 * 1024 * 1024,
    createdAt: '2026-01-15T09:00:00Z',
    isOwner: true,
    currentUserRole: 'Producer',
    memberCount: 8,
  },
  {
    id: 'w-5555-6666-7777-8888',
    name: 'Ghost Protocol Cyberpunk Desk',
    ownerId: 'u-admin-2',
    ownerName: 'Kenji Sato',
    ownerEmail: 'kenji@panelforge.com',
    storageQuotaBytes: 5 * 1024 * 1024 * 1024,
    usedStorageBytes: 1.2 * 1024 * 1024 * 1024,
    createdAt: '2026-02-01T14:30:00Z',
    isOwner: false,
    currentUserRole: 'Editor',
    memberCount: 4,
  },
];

export const MOCK_WORKSPACE_MEMBERS: WorkspaceMemberDto[] = [
  {
    userId: 'u-01',
    fullName: 'Tatsuki Fujimoto',
    email: 'producer@panelforge.com',
    role: 'Producer',
    isOwner: true,
    joinedAt: '2026-01-15T09:00:00Z',
  },
  {
    userId: 'u-02',
    fullName: 'Gen Urobuchi',
    email: 'writer@panelforge.com',
    role: 'Reviewer',
    isOwner: false,
    joinedAt: '2026-01-20T10:00:00Z',
  },
  {
    userId: 'u-03',
    fullName: 'Yusuke Murata',
    email: 'artist@panelforge.com',
    role: 'Reviewer',
    isOwner: false,
    joinedAt: '2026-02-01T11:15:00Z',
  },
];

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
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Tạo Workspace thất bại.'));
    }
    return await response.json();
  },

  getMyWorkspaces: async (token?: string): Promise<WorkspaceDto[]> => {
    try {
      const response = await fetch(`${API_URL}/api/Workspaces`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể lấy danh sách Workspaces.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('workspaceService.getMyWorkspaces fallback:', err.message);
      return MOCK_WORKSPACES;
    }
  },

  getWorkspaceById: async (id: string, token?: string): Promise<WorkspaceDto> => {
    try {
      const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể lấy thông tin Workspace.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('workspaceService.getWorkspaceById fallback:', err.message);
      return MOCK_WORKSPACES.find((w) => w.id === id) || MOCK_WORKSPACES[0];
    }
  },

  updateWorkspace: async (
    id: string,
    request: UpdateWorkspaceRequest,
    token?: string,
  ): Promise<WorkspaceDto> => {
    const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Cập nhật Workspace thất bại.'));
    }
    return await response.json();
  },

  deleteWorkspace: async (id: string, token?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/api/Workspaces/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Xóa Workspace thất bại.'));
    }
    return await response.json();
  },

  getMembers: async (id: string, token?: string): Promise<WorkspaceMemberDto[]> => {
    try {
      const response = await fetch(`${API_URL}/api/Workspaces/${id}/members`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể lấy danh sách thành viên.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('workspaceService.getMembers fallback:', err.message);
      return MOCK_WORKSPACE_MEMBERS;
    }
  },

  addMember: async (
    id: string,
    request: AddWorkspaceMemberRequest,
    token?: string,
  ): Promise<WorkspaceMemberDto> => {
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
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
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
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
    const response = await fetch(`${API_URL}/api/Workspaces/${id}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(
        await parseErrorResponse(response, 'Xóa thành viên khỏi Workspace thất bại.'),
      );
    }
    return await response.json();
  },
};

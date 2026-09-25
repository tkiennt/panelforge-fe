// src/services/admin.service.ts
import { API_URL } from '../config/env';
export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  isEmailConfirmed: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  projectRoles?: { projectId: string; roles: string[] }[];
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  pageSize: number;
  items: AdminUserItem[];
}

export interface AssignRoleRequest {
  userId: string;
  newRole: string | number;
}

export interface AssignRoleResponse {
  message: string;
  userId: string;
  newRole: string;
}

export interface SystemStatsResponse {
  totalUsers: number;
  admins: number;
  registeredUsers: number;
  totalWorkspaces: number;
  totalWorkspaceMembers: number;
  serverTimeUtc: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  fullName: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
}

async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    if (typeof response.json === 'function') {
      const data = await response.json();
      if (data && typeof data === 'object' && data.message) {
        return data.message;
      }
    }
  } catch {
    // response body empty or non-JSON
  }

  if (response.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập (401 Unauthorized).';
  }
  if (response.status === 403) {
    return 'Bạn không có quyền quản trị viên để thực hiện thao tác này (403 Forbidden).';
  }
  return defaultMessage;
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Fallback Mock Users when offline or demo (empty)
export const MOCK_ADMIN_USERS: AdminUserItem[] = [];

export const adminService = {
  /**
   * Lấy danh sách toàn bộ người dùng có phân trang (GET /api/Admin/users?page=&pageSize=)
   */
  getAllUsers: async (page = 1, pageSize = 20, token?: string): Promise<AdminUsersResponse> => {
    // Chỉ gọi API Admin nếu là vai trò ADMINISTRATOR/ADMIN
    const currentRole = localStorage.getItem('userRole');
    if (
      currentRole &&
      currentRole.toUpperCase() !== 'ADMINISTRATOR' &&
      currentRole.toUpperCase() !== 'ADMIN'
    ) {
      return { total: 0, page, pageSize, items: [] };
    }

    try {
      const response = await fetch(`${API_URL}/api/Admin/users?page=${page}&pageSize=${pageSize}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải danh sách người dùng.'));
      }

      return await response.json();
    } catch (err: any) {
      console.warn('adminService.getAllUsers error:', err.message);
      return {
        total: 0,
        page,
        pageSize,
        items: [],
      };
    }
  },

  /**
   * Phân quyền vai trò mới cho người dùng (POST /api/Admin/assign-role)
   */
  assignRole: async (request: AssignRoleRequest, token?: string): Promise<AssignRoleResponse> => {
    const response = await fetch(`${API_URL}/api/Admin/assign-role`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể phân quyền cho người dùng.'));
    }

    return await response.json();
  },

  /**
   * Lấy thống kê tổng quan hệ thống (GET /api/Admin/system-stats)
   */
  getSystemStats: async (token?: string): Promise<SystemStatsResponse> => {
    // Chỉ gọi API Admin nếu là vai trò ADMINISTRATOR/ADMIN
    const currentRole = localStorage.getItem('userRole');
    if (
      currentRole &&
      currentRole.toUpperCase() !== 'ADMINISTRATOR' &&
      currentRole.toUpperCase() !== 'ADMIN'
    ) {
      return {
        totalUsers: 0,
        admins: 0,
        registeredUsers: 0,
        totalWorkspaces: 0,
        totalWorkspaceMembers: 0,
        serverTimeUtc: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(`${API_URL}/api/Admin/system-stats`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải thống kê hệ thống.'));
      }

      return await response.json();
    } catch (err: any) {
      console.warn('adminService.getSystemStats error:', err.message);
      return {
        totalUsers: 0,
        admins: 0,
        registeredUsers: 0,
        totalWorkspaces: 0,
        totalWorkspaceMembers: 0,
        serverTimeUtc: new Date().toISOString(),
      };
    }
  },

  /**
   * Tra cứu Audit Log toàn hệ thống (GET /api/Admin/audit-logs) (UC-15, BR-18)
   */
  getAuditLogs: async (
    workspaceId?: string,
    action?: string,
    page = 1,
    pageSize = 30,
    token?: string,
  ): Promise<{ totalCount: number; page: number; pageSize: number; items: any[] }> => {
    const url = new URL(`${API_URL}/api/Admin/audit-logs`);
    if (workspaceId) url.searchParams.set('workspaceId', workspaceId);
    if (action) url.searchParams.set('action', action);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('pageSize', pageSize.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tải danh sách Audit Log.'));
    }

    return await response.json();
  },

  /**
   * Thống kê mức độ sử dụng AI Token theo Workspace (GET /api/Admin/ai-usage) (UC-15)
   */
  getAiUsage: async (token?: string): Promise<any[]> => {
    const response = await fetch(`${API_URL}/api/Admin/ai-usage`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tải thống kê AI Usage.'));
    }

    return await response.json();
  },

  /**
   * Lấy cấu hình AI Provider theo Workspace (GET /api/workspaces/{id}/ai-config) (UC-02)
   */
  getWorkspaceAiConfig: async (workspaceId: string, token?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/ai-config`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(
        await parseErrorResponse(response, 'Không thể tải cấu hình AI của Workspace.'),
      );
    }

    return await response.json();
  },

  /**
   * Cập nhật AI Provider & Quota theo Workspace (PUT /api/workspaces/{id}/ai-config) (UC-02)
   */
  updateWorkspaceAiConfig: async (
    workspaceId: string,
    data: {
      provider: string;
      apiKey?: string;
      isEnabled: boolean;
      monthlyTokenQuota: number;
      allowedModels: string[];
    },
    token?: string,
  ): Promise<any> => {
    const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/ai-config`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        await parseErrorResponse(response, 'Không thể lưu cấu hình AI của Workspace.'),
      );
    }

    return await response.json();
  },
};

// src/services/admin.service.ts
import { API_URL } from '../config/env';
export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: string;
  canCreateStudio?: boolean;
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
  canCreateStudio?: boolean;
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
  role: 'Admin' | 'User';
  isActive?: boolean;
}

export interface UpdateUserPayload {
  fullName: string;
  phoneNumber?: string;
  role: 'Admin' | 'User';
  isActive: boolean;
}

// UC-15: Audit Log Types
export interface AuditLogDto {
  id: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  details?: string | null;
  changesJson?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditLogsPagedResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AuditLogDto[];
}

export interface AuditLogFilterParams {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  entityName?: string;
  entityId?: string;
  action?: string;
  from?: string; // ISO 8601 UTC
  to?: string;   // ISO 8601 UTC
  page?: number;
  pageSize?: number;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  rowCount: number;
  isTruncated: boolean;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// UC-15: AI Usage Report & Records Types
export interface AiUsageFeatureSummary {
  feature: string;
  callCount: number;
  totalTokens: number;
}

export interface AiUsageReportItemDto {
  workspaceId: string;
  workspaceName: string;
  provider?: string | null;
  monthlyTokenQuota: number;
  usedTokensCurrentMonth: number;
  usagePercent: number;
  isEnabled: boolean;
  periodFrom: string;
  periodTo: string;
  callCount: number;
  succeededCount: number;
  failedCount: number;
  blockedCount: number;
  totalTokens: number;
  totalCostUsd: number;
  byFeature: AiUsageFeatureSummary[];
}

export interface AiUsageRecordDto {
  id: string;
  workspaceId: string;
  userId?: string | null;
  feature: string;
  provider: string;
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number | null;
  status: 'Succeeded' | 'Failed' | 'QuotaExceeded' | 'ProviderUnavailable' | 'Disabled' | string;
  errorMessage?: string | null;
  durationMs?: number | null;
  occurredAtUtc: string;
}

export interface AiUsageRecordsFilterParams {
  workspaceId?: string;
  userId?: string;
  feature?: string;
  status?: string;
  from?: string; // ISO 8601 UTC
  to?: string;   // ISO 8601 UTC
  page?: number;
  pageSize?: number;
}

export interface AiUsageRecordsPagedResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AiUsageRecordDto[];
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
   * Phân quyền Producer / SystemRole cho người dùng (POST /api/Admin/assign-producer)
   */
  assignProducer: async (request: AssignRoleRequest, token?: string): Promise<AssignRoleResponse> => {
    const response = await fetch(`${API_URL}/api/Admin/assign-producer`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể phân quyền cho người dùng.'));
    }

    return await response.json();
  },

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
   * Tạo người dùng mới từ trang quản trị (POST /api/Admin/users)
   */
  createUser: async (payload: CreateUserPayload, token?: string): Promise<AdminUserItem> => {
    const response = await fetch(`${API_URL}/api/Admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tạo người dùng mới.'));
    }

    return await response.json();
  },

  /**
   * Cập nhật thông tin người dùng từ trang quản trị (PUT /api/Admin/users/{id})
   */
  updateUser: async (id: string, payload: UpdateUserPayload, token?: string): Promise<AdminUserItem> => {
    const response = await fetch(`${API_URL}/api/Admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể cập nhật thông tin người dùng.'));
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
    workspaceIdOrParams?: string | AuditLogFilterParams,
    action?: string,
    page = 1,
    pageSize = 30,
    token?: string,
  ): Promise<AuditLogsPagedResponse> => {
    let params: AuditLogFilterParams = {};
    if (typeof workspaceIdOrParams === 'object' && workspaceIdOrParams !== null) {
      params = workspaceIdOrParams;
    } else {
      params = {
        workspaceId: workspaceIdOrParams,
        action,
        page,
        pageSize,
      };
    }

    const url = new URL(`${API_URL}/api/Admin/audit-logs`);
    if (params.workspaceId) url.searchParams.set('workspaceId', params.workspaceId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.userEmail) url.searchParams.set('userEmail', params.userEmail);
    if (params.entityName) url.searchParams.set('entityName', params.entityName);
    if (params.entityId) url.searchParams.set('entityId', params.entityId);
    if (params.action) url.searchParams.set('action', params.action);
    if (params.from) url.searchParams.set('from', params.from);
    if (params.to) url.searchParams.set('to', params.to);
    url.searchParams.set('page', (params.page || 1).toString());
    url.searchParams.set('pageSize', (params.pageSize || 30).toString());

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
   * Xuất danh sách Audit Log ra CSV có Bearer Auth (GET /api/Admin/audit-logs/export) (UC-15)
   */
  exportAuditLogs: async (
    params: AuditLogFilterParams = {},
    token?: string,
  ): Promise<ExportResult> => {
    const url = new URL(`${API_URL}/api/Admin/audit-logs/export`);
    if (params.workspaceId) url.searchParams.set('workspaceId', params.workspaceId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.userEmail) url.searchParams.set('userEmail', params.userEmail);
    if (params.entityName) url.searchParams.set('entityName', params.entityName);
    if (params.entityId) url.searchParams.set('entityId', params.entityId);
    if (params.action) url.searchParams.set('action', params.action);
    if (params.from) url.searchParams.set('from', params.from);
    if (params.to) url.searchParams.set('to', params.to);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể xuất file CSV Audit Log.'));
    }

    const rowCountHeader = response.headers.get('X-Export-Row-Count');
    const truncatedHeader = response.headers.get('X-Export-Truncated');
    const contentDisposition = response.headers.get('Content-Disposition') || '';

    let fileName = 'audit-logs.csv';
    const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }

    const blob = await response.blob();
    return {
      blob,
      fileName,
      rowCount: rowCountHeader ? parseInt(rowCountHeader, 10) : 0,
      isTruncated: truncatedHeader === 'true',
    };
  },

  /**
   * Thống kê mức độ sử dụng AI Token theo Workspace (GET /api/Admin/ai-usage) (UC-15)
   */
  getAiUsage: async (
    params: { workspaceId?: string; from?: string; to?: string } = {},
    token?: string,
  ): Promise<AiUsageReportItemDto[]> => {
    const url = new URL(`${API_URL}/api/Admin/ai-usage`);
    if (params.workspaceId) url.searchParams.set('workspaceId', params.workspaceId);
    if (params.from) url.searchParams.set('from', params.from);
    if (params.to) url.searchParams.set('to', params.to);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tải thống kê AI Usage.'));
    }

    return await response.json();
  },

  /**
   * Lấy lịch sử các bản ghi gọi AI phân trang (GET /api/Admin/ai-usage/records) (UC-15)
   */
  getAiUsageRecords: async (
    params: AiUsageRecordsFilterParams = {},
    token?: string,
  ): Promise<AiUsageRecordsPagedResponse> => {
    const url = new URL(`${API_URL}/api/Admin/ai-usage/records`);
    if (params.workspaceId) url.searchParams.set('workspaceId', params.workspaceId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.feature) url.searchParams.set('feature', params.feature);
    if (params.status) url.searchParams.set('status', params.status);
    if (params.from) url.searchParams.set('from', params.from);
    if (params.to) url.searchParams.set('to', params.to);
    url.searchParams.set('page', (params.page || 1).toString());
    url.searchParams.set('pageSize', (params.pageSize || 30).toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tải lịch sử gọi AI records.'));
    }

    return await response.json();
  },

  /**
   * Xuất danh sách bản ghi AI Usage ra CSV (GET /api/Admin/ai-usage/export) (UC-15)
   */
  exportAiUsage: async (
    params: AiUsageRecordsFilterParams = {},
    token?: string,
  ): Promise<ExportResult> => {
    const url = new URL(`${API_URL}/api/Admin/ai-usage/export`);
    if (params.workspaceId) url.searchParams.set('workspaceId', params.workspaceId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.feature) url.searchParams.set('feature', params.feature);
    if (params.status) url.searchParams.set('status', params.status);
    if (params.from) url.searchParams.set('from', params.from);
    if (params.to) url.searchParams.set('to', params.to);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể xuất file CSV AI Usage.'));
    }

    const rowCountHeader = response.headers.get('X-Export-Row-Count');
    const truncatedHeader = response.headers.get('X-Export-Truncated');
    const contentDisposition = response.headers.get('Content-Disposition') || '';

    let fileName = 'ai-usage-records.csv';
    const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }

    const blob = await response.blob();
    return {
      blob,
      fileName,
      rowCount: rowCountHeader ? parseInt(rowCountHeader, 10) : 0,
      isTruncated: truncatedHeader === 'true',
    };
  },

  /**
   * Lấy cấu hình AI Provider theo Workspace (GET /api/Admin/workspaces/{id}/ai-config) (UC-02)
   */
  getWorkspaceAiConfig: async (workspaceId: string, token?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/api/Admin/workspaces/${workspaceId}/ai-config`, {
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
   * Cập nhật AI Provider & Quota theo Workspace (PUT /api/Admin/workspaces/{id}/ai-config) (UC-02)
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
    const response = await fetch(`${API_URL}/api/Admin/workspaces/${workspaceId}/ai-config`, {
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

// src/services/admin.service.ts
import axiosClient from '../api/axiosClient';

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
  from?: string;
  to?: string;
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
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AiUsageRecordsPagedResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AiUsageRecordDto[];
}

function extractError(error: any, defaultMsg: string): string {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập (401 Unauthorized).';
  if (error.response?.status === 403) return 'Bạn không có quyền quản trị viên để thực hiện thao tác này (403 Forbidden).';
  return defaultMsg;
}

export const MOCK_ADMIN_USERS: AdminUserItem[] = [];

export const adminService = {
  getAllUsers: async (page = 1, pageSize = 20): Promise<AdminUsersResponse> => {
    const currentRole = localStorage.getItem('userRole');
    if (
      currentRole &&
      currentRole.toUpperCase() !== 'ADMINISTRATOR' &&
      currentRole.toUpperCase() !== 'ADMIN'
    ) {
      return { total: 0, page, pageSize, items: [] };
    }

    try {
      const response = await axiosClient.get('/Admin/users', { params: { page, pageSize } });
      return response.data;
    } catch (error: any) {
      console.warn('adminService.getAllUsers error:', error.message);
      return { total: 0, page, pageSize, items: [] };
    }
  },

  assignProducer: async (request: AssignRoleRequest): Promise<AssignRoleResponse> => {
    try {
      const response = await axiosClient.post('/Admin/assign-producer', request);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể phân quyền cho người dùng.'));
    }
  },

  assignRole: async (request: AssignRoleRequest): Promise<AssignRoleResponse> => {
    try {
      const response = await axiosClient.post('/Admin/assign-role', request);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể phân quyền cho người dùng.'));
    }
  },

  createUser: async (payload: CreateUserPayload): Promise<AdminUserItem> => {
    try {
      const response = await axiosClient.post('/Admin/users', payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tạo người dùng mới.'));
    }
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<AdminUserItem> => {
    try {
      const response = await axiosClient.put(`/Admin/users/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể cập nhật thông tin người dùng.'));
    }
  },

  getSystemStats: async (): Promise<SystemStatsResponse> => {
    const currentRole = localStorage.getItem('userRole');
    if (
      currentRole &&
      currentRole.toUpperCase() !== 'ADMINISTRATOR' &&
      currentRole.toUpperCase() !== 'ADMIN'
    ) {
      return {
        totalUsers: 0, admins: 0, registeredUsers: 0, totalWorkspaces: 0, totalWorkspaceMembers: 0, serverTimeUtc: new Date().toISOString(),
      };
    }

    try {
      const response = await axiosClient.get('/Admin/system-stats');
      return response.data;
    } catch (error: any) {
      console.warn('adminService.getSystemStats error:', error.message);
      return {
        totalUsers: 0, admins: 0, registeredUsers: 0, totalWorkspaces: 0, totalWorkspaceMembers: 0, serverTimeUtc: new Date().toISOString(),
      };
    }
  },

  getAuditLogs: async (
    workspaceIdOrParams?: string | AuditLogFilterParams,
    action?: string,
    page = 1,
    pageSize = 30,
  ): Promise<AuditLogsPagedResponse> => {
    let params: AuditLogFilterParams = {};
    if (typeof workspaceIdOrParams === 'object' && workspaceIdOrParams !== null) {
      params = workspaceIdOrParams;
    } else {
      params = {
        workspaceId: typeof workspaceIdOrParams === 'string' ? workspaceIdOrParams : undefined,
        action, page, pageSize,
      };
    }

    try {
      const response = await axiosClient.get('/Admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải danh sách Audit Log.'));
    }
  },

  exportAuditLogs: async (params: AuditLogFilterParams = {}): Promise<ExportResult> => {
    try {
      const response = await axiosClient.get('/Admin/audit-logs/export', {
        params,
        responseType: 'blob'
      });

      const rowCountHeader = response.headers['x-export-row-count'];
      const truncatedHeader = response.headers['x-export-truncated'];
      const contentDisposition = response.headers['content-disposition'] || '';

      let fileName = 'audit-logs.csv';
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1]);
      }

      return {
        blob: response.data,
        fileName,
        rowCount: rowCountHeader ? parseInt(rowCountHeader, 10) : 0,
        isTruncated: truncatedHeader === 'true',
      };
    } catch (error) {
      throw new Error(extractError(error, 'Không thể xuất file CSV Audit Log.'));
    }
  },

  getAiUsage: async (
    params: { workspaceId?: string; from?: string; to?: string } = {},
  ): Promise<AiUsageReportItemDto[]> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải thống kê AI Usage.'));
    }
  },

  getAiUsageRecords: async (
    params: AiUsageRecordsFilterParams = {},
  ): Promise<AiUsageRecordsPagedResponse> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage/records', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải lịch sử gọi AI records.'));
    }
  },

  exportAiUsage: async (params: AiUsageRecordsFilterParams = {}): Promise<ExportResult> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage/export', {
        params,
        responseType: 'blob'
      });

      const rowCountHeader = response.headers['x-export-row-count'];
      const truncatedHeader = response.headers['x-export-truncated'];
      const contentDisposition = response.headers['content-disposition'] || '';

      let fileName = 'ai-usage-records.csv';
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1]);
      }

      return {
        blob: response.data,
        fileName,
        rowCount: rowCountHeader ? parseInt(rowCountHeader, 10) : 0,
        isTruncated: truncatedHeader === 'true',
      };
    } catch (error) {
      throw new Error(extractError(error, 'Không thể xuất file CSV AI Usage.'));
    }
  },

  getWorkspaceAiConfig: async (workspaceId: string): Promise<any> => {
    try {
      const response = await axiosClient.get(`/Admin/workspaces/${workspaceId}/ai-config`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải cấu hình AI của Workspace.'));
    }
  },

  updateWorkspaceAiConfig: async (
    workspaceId: string,
    data: {
      provider: string;
      apiKey?: string;
      isEnabled: boolean;
      monthlyTokenQuota: number;
      allowedModels: string[];
    },
  ): Promise<any> => {
    try {
      const response = await axiosClient.put(`/Admin/workspaces/${workspaceId}/ai-config`, data);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể lưu cấu hình AI của Workspace.'));
    }
  },
};

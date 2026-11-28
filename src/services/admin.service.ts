// src/services/admin.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

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
  /** BE trả timestampUtc; createdAt giữ cho tương thích. */
  timestampUtc?: string;
  createdAt?: string;
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

export interface WorkspaceSessionPolicyDto {
  workspaceId: string;
  sessionLifetimeMinutes: number | null;
  idleTimeoutMinutes: number | null;
  maxConcurrentSessions: number | null;
}

export interface UpdateWorkspaceSessionPolicyRequest {
  sessionLifetimeMinutes?: number | null;
  idleTimeoutMinutes?: number | null;
  maxConcurrentSessions?: number | null;
}

export type AiProviderType = 'Gemini' | 'Cloudflare';

export interface AiProviderCredentialDto {
  id: string;
  name: string;
  providerType: AiProviderType | string;
  accountId?: string | null;
  keyHint: string;
  textModel: string;
  imageModel?: string | null;
  isEnabled: boolean;
  workspaceCount: number;
  createdAt: string;
  updatedAt?: string | null;
  isDefaultText?: boolean;
  isDefaultImage?: boolean;
  keyDecryptable?: boolean;
}

export interface CreateAiProviderCredentialRequest {
  name: string;
  providerType: AiProviderType;
  accountId?: string | null;
  apiKey: string;
  textModel: string;
  imageModel?: string | null;
}

export interface UpdateAiProviderCredentialRequest {
  name: string;
  accountId?: string | null;
  apiKey?: string | null;
  textModel: string;
  imageModel?: string | null;
  isEnabled: boolean;
}

export interface AiProviderModelDto {
  id: string;
  kind: 'text' | 'image' | string;
  free: boolean;
  description?: string | null;
}

export interface WorkspaceAiConfigDto {
  id: string;
  workspaceId: string;
  /** TASK-350/355: loại API chữ thực sự dùng (Studio tự chọn hoặc mặc định; rỗng nếu chưa có). */
  provider: string;
  /** TASK-350/355: có API chữ dùng được (Studio tự chọn hoặc mặc định). */
  hasApiKey: boolean;
  /** TASK-350/355: API chữ thực sự dùng đang bật (isEnabled). */
  apiKeyUsable?: boolean;
  /** Lựa chọn riêng của Studio; null = theo API mặc định. */
  providerCredentialId?: string | null;
  /** Lựa chọn ảnh riêng của Studio; null = theo API mặc định. */
  imageProviderCredentialId?: string | null;
  isEnabled: boolean;
  monthlyTokenQuota: number;
  usedTokensCurrentMonth: number;
  allowedModels: string[];
  lastResetAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  monthlyImageQuota: number;
  usedImagesCurrentMonth: number;
}

export interface UpdateWorkspaceAiConfigRequest {
  isEnabled: boolean;
  monthlyTokenQuota: number;
  allowedModels: string[];
  monthlyImageQuota?: number;
}

export interface AdminWorkspaceDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  memberCount: number;
  seriesCount: number;
  createdAt: string;
}

export interface UpdateWorkspaceQuotaRequest {
  storageQuotaBytes: number;
}

function extractError(error: any, defaultMsg: string): string {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (error.response?.status === 401) return translate('errors.services.admin.unauthorized');
  if (error.response?.status === 403) return translate('errors.services.admin.forbidden');
  return defaultMsg;
}

/** Gói mở Studio (spec D11) cho Admin: giá hiện hành (null = chưa bán) và số lượt đã mua. */
export interface AdminStudioPackageDto {
  priceVnd: number | null;
  changedAt: string | null;
  changedByName: string | null;
  purchaseCount: number;
  minPriceVnd: number;
  maxPriceVnd: number;
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
      throw new Error(extractError(error, translate('errors.services.admin.assignRoleFailed')));
    }
  },

  assignRole: async (request: AssignRoleRequest): Promise<AssignRoleResponse> => {
    try {
      const response = await axiosClient.post('/Admin/assign-role', request);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.assignRoleFailed')));
    }
  },

  createUser: async (payload: CreateUserPayload): Promise<AdminUserItem> => {
    try {
      const response = await axiosClient.post('/Admin/users', payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.createUserFailed')));
    }
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<AdminUserItem> => {
    try {
      const response = await axiosClient.put(`/Admin/users/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.updateUserFailed')));
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
        totalUsers: 0,
        admins: 0,
        registeredUsers: 0,
        totalWorkspaces: 0,
        totalWorkspaceMembers: 0,
        serverTimeUtc: new Date().toISOString(),
      };
    }

    try {
      const response = await axiosClient.get('/Admin/system-stats');
      return response.data;
    } catch (error: any) {
      console.warn('adminService.getSystemStats error:', error.message);
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
        action,
        page,
        pageSize,
      };
    }

    try {
      const response = await axiosClient.get('/Admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.getAuditLogsFailed')));
    }
  },

  exportAuditLogs: async (params: AuditLogFilterParams = {}): Promise<ExportResult> => {
    try {
      const response = await axiosClient.get('/Admin/audit-logs/export', {
        params,
        responseType: 'blob',
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
      throw new Error(
        extractError(error, translate('errors.services.admin.exportAuditLogsFailed')),
      );
    }
  },

  getAiUsage: async (
    params: { workspaceId?: string; from?: string; to?: string } = {},
  ): Promise<AiUsageReportItemDto[]> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.getAiUsageFailed')));
    }
  },

  getAiUsageRecords: async (
    params: AiUsageRecordsFilterParams = {},
  ): Promise<AiUsageRecordsPagedResponse> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage/records', { params });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.getAiUsageRecordsFailed')),
      );
    }
  },

  exportAiUsage: async (params: AiUsageRecordsFilterParams = {}): Promise<ExportResult> => {
    try {
      const response = await axiosClient.get('/Admin/ai-usage/export', {
        params,
        responseType: 'blob',
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
      throw new Error(extractError(error, translate('errors.services.admin.exportAiUsageFailed')));
    }
  },

  getWorkspaceAiConfig: async (workspaceId: string): Promise<WorkspaceAiConfigDto> => {
    try {
      const response = await axiosClient.get(`/Admin/workspaces/${workspaceId}/ai-config`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.getWorkspaceAiConfigFailed')),
      );
    }
  },

  updateWorkspaceAiConfig: async (
    workspaceId: string,
    data: UpdateWorkspaceAiConfigRequest,
  ): Promise<WorkspaceAiConfigDto> => {
    try {
      const response = await axiosClient.put(`/Admin/workspaces/${workspaceId}/ai-config`, data);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.updateWorkspaceAiConfigFailed')),
      );
    }
  },

  getAiProviders: async (): Promise<AiProviderCredentialDto[]> => {
    try {
      const response = await axiosClient.get('/Admin/ai-providers');
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.getAiProvidersFailed')));
    }
  },

  createAiProvider: async (
    data: CreateAiProviderCredentialRequest,
  ): Promise<AiProviderCredentialDto> => {
    try {
      const response = await axiosClient.post('/Admin/ai-providers', data);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.createAiProviderFailed')),
      );
    }
  },

  updateAiProvider: async (
    id: string,
    data: UpdateAiProviderCredentialRequest,
  ): Promise<AiProviderCredentialDto> => {
    try {
      const response = await axiosClient.put(`/Admin/ai-providers/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.updateAiProviderFailed')),
      );
    }
  },

  deleteAiProvider: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`/Admin/ai-providers/${id}`);
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.deleteAiProviderFailed')),
      );
    }
  },

  getAiProviderModels: async (id: string): Promise<AiProviderModelDto[]> => {
    try {
      const response = await axiosClient.get(`/Admin/ai-providers/${id}/models`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.getAiProviderModelsFailed')),
      );
    }
  },

  testAiProvider: async (id: string): Promise<{ ok: boolean }> => {
    try {
      const response = await axiosClient.post(`/Admin/ai-providers/${id}/test`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.testAiProviderFailed')));
    }
  },

  setDefaultAiProvider: async (
    kind: 'text' | 'image',
    providerCredentialId: string | null,
  ): Promise<AiProviderCredentialDto[]> => {
    try {
      const response = await axiosClient.put('/Admin/ai-providers/default', {
        kind,
        providerCredentialId,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.setDefaultAiProviderFailed')),
      );
    }
  },

  setWorkspaceAiProvider: async (
    workspaceId: string,
    providerCredentialId: string | null,
  ): Promise<WorkspaceAiConfigDto> => {
    try {
      const response = await axiosClient.put(`/Admin/workspaces/${workspaceId}/ai-provider`, {
        providerCredentialId,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.setWorkspaceAiProviderFailed')),
      );
    }
  },

  setWorkspaceAiImageProvider: async (
    workspaceId: string,
    providerCredentialId: string | null,
  ): Promise<WorkspaceAiConfigDto> => {
    try {
      const response = await axiosClient.put(`/Admin/workspaces/${workspaceId}/ai-image-provider`, {
        providerCredentialId,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.setWorkspaceAiImageProviderFailed')),
      );
    }
  },

  getWorkspaceSessionPolicy: async (workspaceId: string): Promise<WorkspaceSessionPolicyDto> => {
    try {
      const response = await axiosClient.get(`/Admin/workspaces/${workspaceId}/session-policy`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.getSessionPolicyFailed')),
      );
    }
  },

  updateWorkspaceSessionPolicy: async (
    workspaceId: string,
    data: UpdateWorkspaceSessionPolicyRequest,
  ): Promise<WorkspaceSessionPolicyDto> => {
    try {
      // Đảm bảo luôn gửi đủ 3 field (null nếu không đặt giới hạn) vì PUT thay thế toàn bộ policy
      const payload: UpdateWorkspaceSessionPolicyRequest = {
        sessionLifetimeMinutes: data.sessionLifetimeMinutes ?? null,
        idleTimeoutMinutes: data.idleTimeoutMinutes ?? null,
        maxConcurrentSessions: data.maxConcurrentSessions ?? null,
      };
      const response = await axiosClient.put(
        `/Admin/workspaces/${workspaceId}/session-policy`,
        payload,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.updateSessionPolicyFailed')),
      );
    }
  },

  /** GET /api/admin/studio-package */
  getStudioPackage: async (): Promise<AdminStudioPackageDto> => {
    try {
      const { data } = await axiosClient.get('/admin/studio-package');
      return data;
    } catch (error: any) {
      throw new Error(
        extractError(error, translate('errors.services.admin.studioPackageLoadFailed')),
      );
    }
  },

  /** PUT /api/admin/studio-package/price — thêm một mức giá mới (append-only, có audit). */
  setStudioPackagePrice: async (priceVnd: number): Promise<AdminStudioPackageDto> => {
    try {
      const { data } = await axiosClient.put('/admin/studio-package/price', { priceVnd });
      return data;
    } catch (error: any) {
      throw new Error(
        extractError(error, translate('errors.services.admin.studioPackageSaveFailed')),
      );
    }
  },

  getWorkspaces: async (): Promise<AdminWorkspaceDto[]> => {
    try {
      const response = await axiosClient.get('/Admin/workspaces');
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, translate('errors.services.admin.getWorkspacesFailed')));
    }
  },

  updateWorkspaceQuota: async (
    workspaceId: string,
    storageQuotaBytes: number,
  ): Promise<AdminWorkspaceDto> => {
    try {
      const response = await axiosClient.put(`/Admin/workspaces/${workspaceId}/quota`, {
        storageQuotaBytes,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.admin.updateWorkspaceQuotaFailed')),
      );
    }
  },
};

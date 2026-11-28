// src/services/resource.service.ts
// Resource Allocation (Admin) + Resource Request (Producer). DTO khớp PanelForge.Application/Features/Resources/Models.
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';
import { extractError } from './assignment.service';

export type ResourceType = 'Storage' | 'AiTokens' | 'AiImages';
export type ResourceRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type ResourceHealth = 'Ok' | 'NearLimit' | 'Exhausted';

/** quota 0 = không giới hạn (isUnlimited, percentUsed null). */
export interface UsageMeter {
  used: number;
  quota: number;
  isUnlimited: boolean;
  percentUsed: number | null;
}

export interface ResourcePolicy {
  defaultStorageQuotaBytes: number;
  defaultMonthlyTokenQuota: number;
  defaultMonthlyImageQuota: number;
  defaultAiEnabled: boolean;
  warningThresholdPercent: number;
  isConfigured: boolean;
  updatedAt: string | null;
}

export type UpdateResourcePolicy = Omit<ResourcePolicy, 'isConfigured' | 'updatedAt'>;

export interface StudioResource {
  workspaceId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  seriesCount: number;
  createdAt: string;
  storage: UsageMeter;
  aiEnabled: boolean;
  aiTokens: UsageMeter | null;
  aiImages: UsageMeter | null;
  aiNextResetAt: string;
  pendingRequests: number;
  health: ResourceHealth;
}

export interface ResourceOverview {
  totalStudios: number;
  totalStorageUsedBytes: number;
  totalTokensUsedThisMonth: number;
  totalImagesThisMonth: number;
  aiEnabledStudios: number;
  nearLimitStudios: number;
  exhaustedStudios: number;
  pendingRequests: number;
  warningThresholdPercent: number;
  studios: StudioResource[];
}

export interface UpdateStudioResources {
  storageQuotaBytes: number;
  monthlyTokenQuota: number;
  monthlyImageQuota: number;
  aiEnabled: boolean;
  reason: string;
}

export interface ResourceRequest {
  id: string;
  workspaceId: string;
  workspaceName: string;
  resourceType: ResourceType;
  currentLimit: number;
  requestedLimit: number;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: ResourceRequestStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface ResourceRequestFilter {
  status?: ResourceRequestStatus;
  resourceType?: ResourceType;
  search?: string;
}

const fail = (error: unknown, key: string): never => {
  throw new Error(extractError(error, translate(key)));
};

export const resourceService = {
  getPolicy: async (): Promise<ResourcePolicy> => {
    try {
      return (await axiosClient.get('/admin/resource-policy')).data;
    } catch (e) {
      return fail(e, 'errors.services.resource.loadFailed');
    }
  },

  updatePolicy: async (body: UpdateResourcePolicy): Promise<ResourcePolicy> => {
    try {
      return (await axiosClient.put('/admin/resource-policy', body)).data;
    } catch (e) {
      return fail(e, 'errors.services.resource.saveFailed');
    }
  },

  getOverview: async (): Promise<ResourceOverview> => {
    try {
      return (await axiosClient.get('/admin/resources')).data;
    } catch (e) {
      return fail(e, 'errors.services.resource.loadFailed');
    }
  },

  updateStudio: async (workspaceId: string, body: UpdateStudioResources): Promise<void> => {
    try {
      await axiosClient.put(`/admin/workspaces/${workspaceId}/resources`, body);
    } catch (e) {
      fail(e, 'errors.services.resource.saveFailed');
    }
  },

  getRequests: async (filter: ResourceRequestFilter = {}): Promise<ResourceRequest[]> => {
    try {
      return (await axiosClient.get('/admin/resource-requests', { params: filter })).data;
    } catch (e) {
      return fail(e, 'errors.services.resource.loadFailed');
    }
  },

  reviewRequest: async (id: string, approve: boolean, note?: string): Promise<void> => {
    try {
      await axiosClient.post(`/admin/resource-requests/${id}/${approve ? 'approve' : 'reject'}`, {
        note: note?.trim() || null,
      });
    } catch (e) {
      fail(e, 'errors.services.resource.saveFailed');
    }
  },

  /** Producer: yêu cầu của Studio mình. */
  getWorkspaceRequests: async (workspaceId: string): Promise<ResourceRequest[]> => {
    try {
      return (await axiosClient.get(`/workspaces/${workspaceId}/resource-requests`)).data;
    } catch (e) {
      return fail(e, 'errors.services.resource.loadFailed');
    }
  },

  /** Producer: gửi yêu cầu tăng tài nguyên. */
  submitRequest: async (
    workspaceId: string,
    body: { resourceType: ResourceType; requestedLimit: number; reason: string },
  ): Promise<void> => {
    try {
      await axiosClient.post(`/workspaces/${workspaceId}/resource-requests`, body);
    } catch (e) {
      fail(e, 'errors.services.resource.submitFailed');
    }
  },
};

export const GB = 1024 * 1024 * 1024;

export function formatBytes(bytes: number, locale: string): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, i);
  return `${n.toLocaleString(locale, { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`;
}

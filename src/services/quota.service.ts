// Hạn mức Studio (OPS-20..23): chính sách mặc định, yêu cầu tăng hạn mức, màn Tài nguyên của Admin.
import axiosClient from '../api/axiosClient';
import { getApiErrorMessage } from '@/lib/api-error';

export type QuotaResourceType = 'Storage' | 'AiTokens' | 'AiImages';
export type QuotaIncreaseRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface QuotaPolicyDto {
  storageQuotaBytes: number;
  monthlyTokenQuota: number;
  monthlyImageQuota: number;
  /** Studio mới có bật AI sẵn không. */
  aiEnabledByDefault: boolean;
  /** Ngưỡng "Gần hết" (%) ở màn Tài nguyên, 1..99. */
  warningThresholdPercent: number;
  /** true khi Admin chưa lưu chính sách: đang dùng cấu hình server. */
  isFromSettings: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface UpdateQuotaPolicyRequest {
  storageQuotaBytes: number;
  monthlyTokenQuota: number;
  monthlyImageQuota: number;
  aiEnabledByDefault: boolean;
  warningThresholdPercent: number;
}

export interface QuotaIncreaseRequestDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  resourceType: QuotaResourceType;
  currentQuota: number;
  requestedQuota: number;
  reason: string;
  status: QuotaIncreaseRequestStatus;
  requestedByUserId: string;
  requestedByName: string;
  createdAt: string;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  grantedQuota: number | null;
}

export interface SubmitQuotaIncreaseRequest {
  resourceType: QuotaResourceType;
  /** Mức mới muốn có (giá trị tuyệt đối). */
  requestedQuota: number;
  reason: string;
}

export type ResourceHealth = 'Ok' | 'NearLimit' | 'Exhausted';

/** quota 0 = không giới hạn (isUnlimited, percentUsed null). */
export interface UsageMeter {
  used: number;
  quota: number;
  isUnlimited: boolean;
  percentUsed: number | null;
}

/** Một Studio ở màn Tài nguyên. aiTokens/aiImages null = Studio chưa có cấu hình AI. */
export interface AdminWorkspaceResourceDto {
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
  /** Đầu tháng UTC kế tiếp, lúc bộ đếm AI về 0. */
  aiNextResetAt: string;
  pendingRequestCount: number;
  health: ResourceHealth;
}

export interface AdminResourceOverviewDto {
  totalStudios: number;
  totalStorageUsedBytes: number;
  totalTokensUsedThisMonth: number;
  totalImagesThisMonth: number;
  aiEnabledStudios: number;
  nearLimitStudios: number;
  exhaustedStudios: number;
  pendingRequests: number;
  warningThresholdPercent: number;
  studios: AdminWorkspaceResourceDto[];
}

/** null = giữ nguyên, 0 = không giới hạn. reason bắt buộc (ghi Nhật ký hệ thống). */
export interface UpdateWorkspaceResourcesRequest {
  storageQuotaBytes: number | null;
  monthlyTokenQuota: number | null;
  monthlyImageQuota: number | null;
  aiEnabled: boolean | null;
  reason: string;
}

export interface QuotaRequestFilter {
  status?: QuotaIncreaseRequestStatus;
  resourceType?: QuotaResourceType;
  search?: string;
}

/** OPS-22: báo cáo đối soát kho file. Không xoá file nào; applied = đã ghi dung lượng tính lại. */
export interface StorageReconcileWorkspaceDto {
  workspaceId: string;
  name: string;
  recordedBytes: number;
  /** Tổng file gốc còn được dùng (artwork, ảnh bìa, ảnh Bible). */
  computedBytes: number;
  orphanFiles: number;
  orphanBytes: number;
  /** Ảnh thu nhỏ và file xuất bản, không tính vào hạn mức. */
  derivedBytes: number;
  /** File DB còn trỏ tới nhưng kho không có. */
  missingFiles: number;
}

export interface StorageOrphanFileDto {
  key: string;
  sizeBytes: number;
  workspaceId: string | null;
  lastModifiedUtc: string;
}

/** Kết quả xoá file mồ côi: chỉ file cũ hơn minAgeDays của Studio đang hoạt động bị xoá. */
export interface DeleteOrphanFilesResultDto {
  deletedFiles: number;
  deletedBytes: number;
  skippedRecentFiles: number;
  skippedUnattributedFiles: number;
  skippedReferencedFiles: number;
  failedFiles: number;
  minAgeDays: number;
}

export interface StorageReconcileReportDto {
  scannedAt: string;
  applied: boolean;
  scannedFiles: number;
  scannedBytes: number;
  workspaces: StorageReconcileWorkspaceDto[];
  unattributedFiles: number;
  unattributedBytes: number;
  orphanSamples: StorageOrphanFileDto[];
  orphanSamplesTruncated: boolean;
}

const call = async <T>(request: () => Promise<{ data: T }>, fallbackKey: string): Promise<T> => {
  try {
    return (await request()).data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackKey));
  }
};

export const quotaService = {
  // Producer
  getWorkspaceRequests: (workspaceId: string) =>
    call<QuotaIncreaseRequestDto[]>(
      () => axiosClient.get(`/workspaces/${workspaceId}/quota-requests`),
      'errors.services.quota.loadRequestsFailed',
    ),
  submitRequest: (workspaceId: string, body: SubmitQuotaIncreaseRequest) =>
    call<QuotaIncreaseRequestDto>(
      () => axiosClient.post(`/workspaces/${workspaceId}/quota-requests`, body),
      'errors.services.quota.submitFailed',
    ),

  // Admin
  getPolicy: () =>
    call<QuotaPolicyDto>(
      () => axiosClient.get('/Admin/quota-policy'),
      'errors.services.quota.loadPolicyFailed',
    ),
  updatePolicy: (body: UpdateQuotaPolicyRequest) =>
    call<QuotaPolicyDto>(
      () => axiosClient.put('/Admin/quota-policy', body),
      'errors.services.quota.savePolicyFailed',
    ),
  getRequests: (filter: QuotaRequestFilter = {}) =>
    call<QuotaIncreaseRequestDto[]>(
      () => axiosClient.get('/Admin/quota-requests', { params: filter }),
      'errors.services.quota.loadRequestsFailed',
    ),
  approveRequest: (id: string, grantedQuota: number | null, note: string | null) =>
    call<QuotaIncreaseRequestDto>(
      () => axiosClient.post(`/Admin/quota-requests/${id}/approve`, { grantedQuota, note }),
      'errors.services.quota.reviewFailed',
    ),
  rejectRequest: (id: string, note: string) =>
    call<QuotaIncreaseRequestDto>(
      () => axiosClient.post(`/Admin/quota-requests/${id}/reject`, { note }),
      'errors.services.quota.reviewFailed',
    ),
  getResources: () =>
    call<AdminResourceOverviewDto>(
      () => axiosClient.get('/Admin/resources'),
      'errors.services.quota.loadResourcesFailed',
    ),
  updateResources: (workspaceId: string, body: UpdateWorkspaceResourcesRequest) =>
    call<AdminWorkspaceResourceDto>(
      () => axiosClient.put(`/Admin/workspaces/${workspaceId}/resources`, body),
      'errors.services.quota.saveResourcesFailed',
    ),
  reconcileStorage: (apply: boolean) =>
    call<StorageReconcileReportDto>(
      () => axiosClient.post('/Admin/storage/reconcile', null, { params: { apply } }),
      'errors.services.quota.reconcileFailed',
    ),
  deleteOrphanFiles: () =>
    call<DeleteOrphanFilesResultDto>(
      () => axiosClient.post('/Admin/storage/orphans/delete'),
      'errors.services.quota.deleteOrphansFailed',
    ),
};

export const GB = 1024 * 1024 * 1024;

export function formatBytes(bytes: number, locale: string): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, i);
  return `${n.toLocaleString(locale, { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`;
}

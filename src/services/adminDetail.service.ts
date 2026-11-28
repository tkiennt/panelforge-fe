// Trang chi tiết User / Studio và System Health của Admin (OPS-30..32). Field lấy đúng từ
// PanelForge.Application/Features/Admin/Models/AdminDetailDtos.cs; enum gửi dạng chuỗi.
import axiosClient from '../api/axiosClient';
import { getApiErrorMessage } from '@/lib/api-error';
import type { AuditLogDto } from './admin.service';
import type { AdminWorkspaceResourceDto, QuotaIncreaseRequestDto } from './quota.service';

export type WorkspaceRoleName =
  'Producer' | 'Writer' | 'Artist' | 'Letterer' | 'Editor' | 'Publisher' | 'Member';
export type WorkspaceMemberStatus = 'Pending' | 'Active' | 'Rejected';

export interface AdminUserSessionDto {
  sessionId: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface AdminUserMembershipDto {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRoleName;
  status: WorkspaceMemberStatus;
  isOwner: boolean;
  joinedAt: string;
}

export interface AdminUserWalletDto {
  balanceVnd: number;
  topUpTotalVnd: number;
  unlockedEditions: number;
  pendingTopUps: number;
}

export interface AdminUserDetailDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: string;
  canCreateStudio: boolean;
  isActive: boolean;
  isEmailConfirmed: boolean;
  isPendingInvitation: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string | null;
  lastActiveAt: string | null;
  activeSessions: AdminUserSessionDto[];
  memberships: AdminUserMembershipDto[];
  /** null = tài khoản chưa từng có Ví, nạp tiền hay mở khoá. */
  wallet: AdminUserWalletDto | null;
  aiUsageThisMonth: { tokens: number; calls: number; failedCalls: number };
  recentActivity: AuditLogDto[];
}

export interface AdminWorkspaceMemberDto {
  userId: string;
  fullName: string;
  email: string;
  role: WorkspaceRoleName;
  status: WorkspaceMemberStatus;
  userIsActive: boolean;
  joinedAt: string;
}

export interface AdminWorkspaceSeriesDto {
  id: string;
  title: string;
  isCompleted: boolean;
  chapterCount: number;
  publishedChapterCount: number;
  createdAt: string;
}

export interface AdminWorkspaceDetailDto {
  resources: AdminWorkspaceResourceDto;
  ownerId: string;
  aiProvider: string | null;
  sessionLifetimeMinutes: number | null;
  sessionIdleTimeoutMinutes: number | null;
  maxConcurrentSessions: number | null;
  members: AdminWorkspaceMemberDto[];
  series: AdminWorkspaceSeriesDto[];
  quotaRequests: QuotaIncreaseRequestDto[];
  aiLast30Days: { tokens: number; calls: number; failedCalls: number; failedWorkflowRuns: number };
  recentActivity: AuditLogDto[];
}

export type HealthStatus = 'Healthy' | 'Degraded' | 'Down';
export type DependencyKey = 'database' | 'storage' | 'ai';
export type DependencyReason = 'SLOW' | 'TIMEOUT' | 'UNREACHABLE' | 'SERVICE_KEY_MISSING';
export type SignalKey =
  | 'aiRunsStuck'
  | 'aiRunsFailed24h'
  | 'aiCallsFailed24h'
  | 'exportsStuck'
  | 'exportsFailed24h'
  | 'pendingTopUps'
  | 'pendingQuotaRequests';

export interface DependencyHealthDto {
  key: DependencyKey;
  status: HealthStatus;
  provider: string;
  latencyMs: number | null;
  reason: DependencyReason | null;
  queueDepth: number | null;
}

export interface OperationalSignalDto {
  key: SignalKey;
  count: number;
  warning: boolean;
  oldestAt: string | null;
}

export interface SystemHealthDto {
  status: HealthStatus;
  checkedAt: string;
  serverStartedAt: string;
  version: string | null;
  dependencies: DependencyHealthDto[];
  /** Rỗng khi không đọc được DB. */
  signals: OperationalSignalDto[];
}

const call = async <T>(request: () => Promise<{ data: T }>, fallbackKey: string): Promise<T> => {
  try {
    return (await request()).data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackKey));
  }
};

export const adminDetailService = {
  getUser: (id: string) =>
    call<AdminUserDetailDto>(
      () => axiosClient.get(`/Admin/users/${id}`),
      'errors.services.adminDetail.loadUserFailed',
    ),
  getWorkspace: (id: string) =>
    call<AdminWorkspaceDetailDto>(
      () => axiosClient.get(`/Admin/workspaces/${id}`),
      'errors.services.adminDetail.loadWorkspaceFailed',
    ),
  getSystemHealth: () =>
    call<SystemHealthDto>(
      () => axiosClient.get('/Admin/system-health'),
      'errors.services.adminDetail.loadHealthFailed',
    ),
};

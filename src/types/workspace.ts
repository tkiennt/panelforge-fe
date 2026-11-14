import { WorkspaceRole } from './auth';

export interface WorkspaceMemberPreviewDto {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
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
  currentUserRole?: WorkspaceRole | null;
  memberCount: number;
  pendingTasks?: number;
  pendingEditorReviews?: number;
  coverUrl?: string | null;
  description?: string | null;
  memberPreviews?: WorkspaceMemberPreviewDto[] | null;
  /** BE GetMyWorkspaces: số series, 3 series cập nhật gần nhất, lần hoạt động gần nhất. */
  seriesCount?: number;
  seriesPreviews?: WorkspaceSeriesPreviewDto[] | null;
  lastActivityAt?: string | null;
}

export interface WorkspaceSeriesPreviewDto {
  id: string;
  title: string;
  coverUrl?: string | null;
}

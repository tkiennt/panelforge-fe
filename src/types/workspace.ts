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
  /** ID của user sở hữu bản cache activeWorkspace; dùng để huỷ cache khi đổi tài khoản. */
  cachedForUserId?: string | null;
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

export function getStoredCurrentUserId(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' && parsed.id.trim() !== '' ? parsed.id : null;
  } catch {
    return null;
  }
}

export function clearCachedWorkspaceState(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('activeWorkspace');
    localStorage.removeItem('workspaceRole');
    localStorage.removeItem('activeProject');
  } catch {
    // ignore storage errors
  }
}

/**
 * Đọc activeWorkspace từ localStorage một cách an toàn:
 * - Nếu cache thuộc user khác với user đang đăng nhập (hoặc cache cũ không gắn user khi đã biết user hiện tại),
 *   xoá sạch cache và trả về null.
 */
export function readCachedWorkspace(expectedUserId?: string | null): WorkspaceDto | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('activeWorkspace');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') return null;

    const uid = expectedUserId !== undefined ? expectedUserId : getStoredCurrentUserId();
    if (uid) {
      if (!parsed.cachedForUserId || parsed.cachedForUserId !== uid) {
        clearCachedWorkspaceState();
        return null;
      }
    } else if (parsed.cachedForUserId) {
      clearCachedWorkspaceState();
      return null;
    }

    return parsed as WorkspaceDto;
  } catch {
    return null;
  }
}

export function writeCachedWorkspace(ws: WorkspaceDto, userId?: string | null): WorkspaceDto {
  const uid = userId !== undefined ? userId : getStoredCurrentUserId();
  const tagged: WorkspaceDto = {
    ...ws,
    cachedForUserId: uid ?? ws.cachedForUserId ?? null,
  };
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('activeWorkspace', JSON.stringify(tagged));
    } catch {
      // ignore storage errors
    }
  }
  return tagged;
}

import type { WorkspaceAssignmentDto } from '@/types/pipeline';

/** Link tải artwork của Backend sống 5 phút (BR-16); xin lại trước khi hết hạn chừng này mili giây. */
export const ARTWORK_LINK_SKEW_MS = 30_000;
/** Dùng khi Backend không trả `expiresAtUtc` hợp lệ: coi như link sống 4 phút. */
const FALLBACK_TTL_MS = 4 * 60_000;

/** Đổi `expiresAtUtc` của ArtworkAccessLinkDto sang mili giây; giá trị không đọc được thì suy ra từ `now`. */
export const parseLinkExpiry = (expiresAtUtc: string | null | undefined, now: number): number => {
  const t = expiresAtUtc ? Date.parse(expiresAtUtc) : NaN;
  return Number.isNaN(t) ? now + FALLBACK_TTL_MS : t;
};

/** True khi chưa có link, hoặc link đã hết hạn / sắp hết hạn và cần xin link mới. */
export const needsArtworkLink = (
  expiresAtMs: number | undefined,
  now: number,
  skewMs: number = ARTWORK_LINK_SKEW_MS,
): boolean => expiresAtMs === undefined || expiresAtMs - skewMs <= now;

/**
 * Việc `InProgress` của người đang đăng nhập dùng để tải ảnh lên một Page/Panel.
 * Backend chỉ cho người giữ việc `InProgress` ở đúng stage tải ảnh, nên `stageId` phải là
 * `pipelineStageId` (GUID) của việc này, không suy từ tên stage. Việc theo Panel được ưu tiên hơn việc theo Page.
 */
export const findUploadAssignment = (
  assignments: WorkspaceAssignmentDto[],
  target: { chapterId: string; pageId: string; panelId?: string | null },
): WorkspaceAssignmentDto | undefined => {
  const open = assignments.filter(
    (a) => a.status === 'InProgress' && a.chapterId === target.chapterId,
  );
  return (
    (target.panelId
      ? open.find((a) => a.entityType === 'Panel' && a.targetEntityId === target.panelId)
      : undefined) ??
    open.find((a) => a.entityType === 'Page' && a.targetEntityId === target.pageId)
  );
};

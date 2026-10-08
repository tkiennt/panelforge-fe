import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  ChangeRequestItemRequest,
  StageProgressDto,
  SubmissionDto,
} from '@/types';

/**
 * Luật hiển thị nút cho luồng cộng tác CF2/CF3. Đây chỉ là UX: Backend vẫn là nơi kiểm quyền và cổng thật
 * (BR-06, BR-12, BR-19), các hàm này khớp luật đó để không bật nút chắc chắn bị 4xx.
 */

/** Backend trả vai trò dạng PascalCase ("Artist"), Frontend giữ UPPERCASE ("ARTIST"): so sánh không phân biệt hoa thường. */
export const normalizeRole = (role?: string | null): string =>
  (role ?? '').toString().toUpperCase();

export const isReviewerRole = (role?: string | null): boolean => {
  const r = normalizeRole(role);
  return r === 'EDITOR' || r === 'PRODUCER';
};

const status = (value: unknown): string => String(value);

/** Việc của Artist trên Page/Panel cần artwork mới nộp được (cổng nộp của Backend). */
export const needsArtwork = (a: Pick<AssignmentDto, 'assignedRole' | 'entityType'>): boolean =>
  normalizeRole(a.assignedRole) === 'ARTIST' && status(a.entityType) !== 'Chapter';

/** Page mà việc này làm trên đó. Việc cấp Panel suy ra từ StageProgress (có sau khi Start); cấp Chapter thì không có. */
export const resolvePageId = (
  a: Pick<AssignmentDto, 'entityType' | 'targetEntityId'>,
  progress: Pick<StageProgressDto, 'panelId' | 'pageId'>[],
): string | null => {
  if (status(a.entityType) === 'Page') return a.targetEntityId;
  if (status(a.entityType) === 'Panel') {
    return progress.find((p) => p.panelId === a.targetEntityId)?.pageId ?? null;
  }
  return null;
};

/** Thời điểm lần nộp gần nhất bị từ chối; artwork phải mới hơn mốc này mới đủ điều kiện nộp lại (BR-01). */
export const lastRejectedAt = (
  submissions: Pick<SubmissionDto, 'status' | 'decidedAt'>[],
): string | null => {
  const rejected = submissions.filter((s) => status(s.status) === 'Rejected' && s.decidedAt);
  if (rejected.length === 0) return null;
  return (
    rejected
      .map((s) => s.decidedAt as string)
      .sort()
      .at(-1) ?? null
  );
};

/** Có artwork ở đúng stage cho Page (cả trang HOẶC tất cả Panel có ảnh riêng), và (nếu từng bị trả về) tạo sau lần từ chối gần nhất. */
export const hasCurrentArtwork = (
  artworks: Pick<AssetReferenceDto, 'pageId' | 'pipelineStageId' | 'createdAt' | 'panelId'>[],
  pageId: string | null,
  stageId: string,
  rejectedAt: string | null,
  panelIds?: string[],
): boolean => {
  if (pageId === null) return false;

  const validArtworks = artworks.filter(
    (art) =>
      art.pageId === pageId &&
      art.pipelineStageId === stageId &&
      (rejectedAt === null || new Date(art.createdAt).getTime() >= new Date(rejectedAt).getTime()),
  );

  // Điều kiện 1: Có ảnh cả trang (không có panelId hoặc panelId = null)
  const hasFullPageArtwork = validArtworks.some((art) => !art.panelId);
  if (hasFullPageArtwork) return true;

  // Điều kiện 2: Có danh sách Panel và TẤT CẢ các Panel đều có ảnh riêng
  if (panelIds && panelIds.length > 0) {
    return panelIds.every((pId) => validArtworks.some((art) => art.panelId === pId));
  }

  return false;
};

export interface WorkContext {
  userId?: string | null;
  workspaceRole?: string | null;
  changeRequests: Pick<ChangeRequestDto, 'status'>[];
  /** null = chưa biết (đang tải) hoặc không áp dụng */
  hasCurrentArtwork: boolean | null;
}

export interface WorkActions {
  isAssignee: boolean;
  isReviewer: boolean;
  canStart: boolean;
  canUploadArtwork: boolean;
  canSubmit: boolean;
  submitBlockedReason: string | null;
  canOpenReview: boolean;
  canDecide: boolean;
  approveBlockedReason: string | null;
}

/** Số yêu cầu sửa chưa đóng: nộp lại chỉ cần hết Open; duyệt cần hết cả Open lẫn Resolved (chưa xác minh). */
export const countUnclosed = (
  crs: Pick<ChangeRequestDto, 'status'>[],
  includeResolved: boolean,
): number =>
  crs.filter(
    (c) => status(c.status) === 'Open' || (includeResolved && status(c.status) === 'Resolved'),
  ).length;

export const getWorkActions = (a: AssignmentDto, ctx: WorkContext): WorkActions => {
  const isAssignee = !!ctx.userId && a.assigneeUserId === ctx.userId;
  const reviewer = isReviewerRole(ctx.workspaceRole);
  const st = status(a.status);

  const openCount = countUnclosed(ctx.changeRequests, false);
  const unclosedCount = countUnclosed(ctx.changeRequests, true);

  let submitBlockedReason: string | null = null;
  if (st === 'InProgress') {
    if (openCount > 0) {
      submitBlockedReason = `Còn ${openCount} yêu cầu sửa chưa xử lý, hãy sửa và bấm "Đã sửa" trước khi nộp lại.`;
    } else if (needsArtwork(a) && ctx.hasCurrentArtwork === false) {
      submitBlockedReason =
        'Chưa có artwork (hoặc chưa có bản mới sau lần bị trả về). Cần có ảnh cả trang hoặc tất cả các khung panel phải có ảnh riêng.';
    }
  }

  const underReview = st === 'UnderReview';

  // Người duyệt khác người nhận (không ai tự duyệt việc của mình, BR-06)
  const canReviewThis = reviewer && !isAssignee;

  return {
    isAssignee,
    isReviewer: reviewer,
    canStart: isAssignee && (st === 'Assigned' || st === 'ReworkRequired'),
    canUploadArtwork: isAssignee && st === 'InProgress' && needsArtwork(a),
    canSubmit: isAssignee && st === 'InProgress' && submitBlockedReason === null,
    submitBlockedReason: isAssignee ? submitBlockedReason : null,
    canOpenReview: canReviewThis && st === 'Submitted',
    canDecide: canReviewThis && underReview,
    approveBlockedReason:
      canReviewThis && underReview && unclosedCount > 0
        ? `Còn ${unclosedCount} yêu cầu sửa chưa đóng (Open, hoặc Resolved chưa xác minh), hãy xác minh trước khi duyệt.`
        : null,
  };
};

// ── Vùng của ChangeRequest: JSON { x, y, w, h } chuẩn hóa 0–1 (khớp ChangeRequest.ValidateRegion của Backend) ──

export interface RegionPercent {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Nhận phần trăm 0–100 (người dùng nhập), trả JSON chuẩn hóa 0–1; null nếu để trống hoặc không hợp lệ. */
export const buildRegionJson = (r: Partial<Record<keyof RegionPercent, string>>): string | null => {
  const parts = [r.x, r.y, r.w, r.h];
  if (parts.every((p) => p === undefined || p.trim() === '')) return null;
  const [x, y, w, h] = parts.map((p) => Number(p) / 100);
  const ok =
    [x, y, w, h].every((n) => Number.isFinite(n)) &&
    x >= 0 &&
    y >= 0 &&
    w > 0 &&
    h > 0 &&
    x + w <= 1.0000001 &&
    y + h <= 1.0000001;
  return ok ? JSON.stringify({ x, y, w, h }) : null;
};

/** true nếu để trống hoàn toàn hoặc nhập đủ và hợp lệ; false nếu nhập dở hoặc sai (để chặn gửi, tránh 400). */
export const isRegionInputValid = (r: Partial<Record<keyof RegionPercent, string>>): boolean => {
  const empty = [r.x, r.y, r.w, r.h].every((p) => p === undefined || p.trim() === '');
  return empty || buildRegionJson(r) !== null;
};

/** Một dòng yêu cầu sửa Editor đang soạn khi trả việc về; vùng nhập theo phần trăm (0–100). */
export interface DraftItem {
  key: number;
  description: string;
  x: string;
  y: string;
  w: string;
  h: string;
  dueDate: string;
}

export const emptyDraftItem = (key: number): DraftItem => ({
  key,
  description: '',
  x: '',
  y: '',
  w: '',
  h: '',
  dueDate: '',
});

/** Chuyển các dòng nháp thành yêu cầu gửi Backend: bỏ dòng trống, vùng nhập phần trăm đổi sang 0–1. */
export const buildChanges = (items: DraftItem[]): ChangeRequestItemRequest[] =>
  items
    .filter((i) => i.description.trim() !== '')
    .map((i) => ({
      description: i.description.trim(),
      regionJson: buildRegionJson(i) ?? undefined,
      dueDate: i.dueDate ? new Date(`${i.dueDate}T23:59:59`).toISOString() : undefined,
    }));

/** Mô tả vùng cho người đọc, vd "x 10%, y 20%, rộng 30%, cao 40%"; null nếu không có hoặc JSON hỏng. */
export const describeRegion = (regionJson?: string | null): string | null => {
  if (!regionJson) return null;
  try {
    const { x, y, w, h } = JSON.parse(regionJson) as RegionPercent;
    const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
    return `x ${pct(x)}, y ${pct(y)}, rộng ${pct(w)}, cao ${pct(h)}`;
  } catch {
    return null;
  }
};

/** Phân tích toạ độ vùng chuẩn hoá (0–1) để vẽ khung khoanh trên ảnh. */
export const parseRegionBox = (
  regionJson?: string | null,
): { x: number; y: number; w: number; h: number } | null => {
  if (!regionJson) return null;
  try {
    const raw = typeof regionJson === 'string' ? JSON.parse(regionJson) : regionJson;
    const rawX = typeof raw.x === 'number' ? raw.x : (raw.left ?? 0);
    const rawY = typeof raw.y === 'number' ? raw.y : (raw.top ?? 0);
    const rawW = typeof raw.w === 'number' ? raw.w : (raw.width ?? 0);
    const rawH = typeof raw.h === 'number' ? raw.h : (raw.height ?? 0);

    // Chuẩn hoá nếu toạ độ nhập dạng 0–100% thay vì 0–1
    const x = rawX > 1 ? rawX / 100 : rawX;
    const y = rawY > 1 ? rawY / 100 : rawY;
    const w = rawW > 1 ? rawW / 100 : rawW;
    const h = rawH > 1 ? rawH / 100 : rawH;

    if (w <= 0 || h <= 0) return null;

    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      w: Math.min(1, Math.max(0, w)),
      h: Math.min(1, Math.max(0, h)),
    };
  } catch {
    return null;
  }
};

/** Thông báo lỗi cho người dùng: ưu tiên message của Backend ({ error } hoặc { message }), rồi tới message của Error. */
export const errorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  } | null;
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
};

export const isOverdue = (dueDate?: string | null, now: Date = new Date()): boolean =>
  !!dueDate && new Date(dueDate).getTime() < now.getTime();

/** "vừa xong", "15 phút trước", "3 giờ trước", "2 ngày trước" cho danh sách thông báo. */
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

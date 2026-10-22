import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  ChangeRequestItemRequest,
  PanelDto,
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

export interface PanelArtworkCoverage {
  /** Số Panel có ảnh riêng hợp lệ. */
  covered: number;
  total: number;
  /** Có ảnh cả trang hợp lệ: khi đó trang đã đủ, không cần ảnh từng Panel. */
  hasFullPage: boolean;
  /** Trang đủ artwork theo luật BE (StageProgressRules.SubmissionBlockReasonAsync). */
  complete: boolean;
}

/**
 * Checklist "panel đã có ảnh N/M" theo đúng luật BE: chỉ tính ảnh đúng trang + stage và (nếu từng bị trả về)
 * có `createdAt` ≥ thời điểm quyết định của lần nộp Rejected gần nhất. Đếm mọi ảnh sẽ báo đủ trong khi server trả 409.
 */
export const panelArtworkCoverage = (
  artworks: Pick<AssetReferenceDto, 'pageId' | 'pipelineStageId' | 'createdAt' | 'panelId'>[],
  pageId: string | null,
  stageId: string,
  rejectedAt: string | null,
  panelIds: string[],
): PanelArtworkCoverage => {
  const valid =
    pageId === null
      ? []
      : artworks.filter(
          (art) =>
            art.pageId === pageId &&
            art.pipelineStageId === stageId &&
            (rejectedAt === null ||
              new Date(art.createdAt).getTime() >= new Date(rejectedAt).getTime()),
        );
  const hasFullPage = valid.some((art) => !art.panelId);
  const covered = panelIds.filter((id) => valid.some((art) => art.panelId === id)).length;
  const complete = hasFullPage || (panelIds.length > 0 && covered === panelIds.length);
  return { covered, total: panelIds.length, hasFullPage, complete };
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
    if (a.impactReviewReason) {
      submitBlockedReason = `Công việc cần kiểm tra ảnh hưởng: ${a.impactReviewReason}. Vui lòng chờ Editor hoặc Producer quyết định giữ kết quả hay yêu cầu làm lại trước khi nộp.`;
    } else if (openCount > 0) {
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

/**
 * Số việc phụ thuộc (dependsOnAssignmentIds / dependsOnAssignmentId) CHƯA Approved, tra trong `related`.
 * Việc phụ thuộc không có trong danh sách thì không đếm (không đoán); BE vẫn chặn bằng 409 khi bấm Bắt đầu.
 */
export const pendingDependencyCount = (
  a: Pick<AssignmentDto, 'dependsOnAssignmentIds' | 'dependsOnAssignmentId'>,
  related?: Pick<AssignmentDto, 'id' | 'status'>[],
): number => {
  if (!related?.length) return 0;
  const ids = new Set<string>([
    ...(a.dependsOnAssignmentIds ?? []),
    ...(a.dependsOnAssignmentId ? [a.dependsOnAssignmentId] : []),
  ]);
  let pending = 0;
  ids.forEach((id) => {
    const dep = related.find((r) => r.id === id);
    if (dep && status(dep.status) !== 'Approved') pending++;
  });
  return pending;
};

/**
 * Tiêu đề + nội dung thông báo khi POST .../start thất bại.
 * 409 `CHAPTER_READ_ONLY` = chương đã Approved/Published (KHÔNG phải xung đột phiên bản);
 * 409 khác là luật nghiệp vụ, hiện nguyên câu `error` của BE.
 */
export const describeStartError = (err: unknown): { title: string; message: string } => {
  const e = err as { code?: string; status?: number } | null;
  const message = errorMessage(err, 'Không thể bắt đầu công việc.');
  if (e?.code === 'CHAPTER_READ_ONLY') {
    return {
      title: 'Chương chỉ đọc',
      message: message || 'Chương đã được duyệt hoặc phát hành nên không thể thay đổi (BR-12).',
    };
  }
  return { title: 'Không thể bắt đầu', message };
};

/**
 * Thông báo lỗi cho người dùng: ưu tiên message của Backend ({ error } hoặc { message }), rồi tới lỗi validation dạng
 * problem+json (`errors`, `title`), cuối cùng là message của Error.
 */
export const errorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: {
      data?: {
        error?: string;
        message?: string;
        title?: string;
        errors?: Record<string, string[] | string>;
      };
    };
    message?: string;
  } | null;
  const data = e?.response?.data;
  const validation = data?.errors
    ? Object.values(data.errors)
        .flat()
        .filter((m): m is string => typeof m === 'string' && m.length > 0)
        .join('; ')
    : '';
  return data?.error || data?.message || validation || data?.title || e?.message || fallback;
};

/** Dữ liệu chương dùng để quy việc vào cảnh và sắp thứ tự trong "Công việc của tôi". */
export interface WorkOrderContext {
  stageOrder: Record<string, number>; // pipelineStageId → stageOrder
  pageNumber: Record<string, number>; // pageId → pageNumber
  panels: Pick<PanelDto, 'id' | 'pageId' | 'sceneId' | 'readingOrder'>[];
  sceneNumber: Record<string, number>; // sceneId → sceneNumber
}

export const UNASSIGNED_SCENE = 'UNASSIGNED';

export interface WorkScene {
  sceneId: string; // UNASSIGNED_SCENE = việc cấp chương hoặc chưa gắn cảnh
  pageId: string | null;
  /** Trang chứa panel của nhiều cảnh: việc hiện ở cảnh đầu tiên, không nhân bản. */
  multiScene: boolean;
}

/**
 * Cảnh nằm trên Panel, không phải Page: việc cấp Panel lấy cảnh của panel; việc cấp Page lấy cảnh nhỏ nhất
 * trong các panel của trang; việc cấp Chapter (hoặc chưa gắn cảnh) vào nhóm "Toàn chương".
 */
export const resolveWorkScene = (
  a: Pick<AssignmentDto, 'entityType' | 'targetEntityId'>,
  ctx: WorkOrderContext,
): WorkScene => {
  const known = (sceneId?: string | null): sceneId is string =>
    !!sceneId && ctx.sceneNumber[sceneId] !== undefined;
  const type = status(a.entityType);
  if (type === 'Panel') {
    const panel = ctx.panels.find((p) => p.id === a.targetEntityId);
    return {
      sceneId: known(panel?.sceneId) ? panel!.sceneId! : UNASSIGNED_SCENE,
      pageId: panel?.pageId ?? null,
      multiScene: false,
    };
  }
  if (type === 'Page') {
    const sceneIds = [
      ...new Set(
        ctx.panels
          .filter((p) => p.pageId === a.targetEntityId)
          .map((p) => p.sceneId)
          .filter(known),
      ),
    ].sort((x, y) => ctx.sceneNumber[x] - ctx.sceneNumber[y]);
    return {
      sceneId: sceneIds[0] ?? UNASSIGNED_SCENE,
      pageId: a.targetEntityId,
      multiScene: sceneIds.length > 1,
    };
  }
  return { sceneId: UNASSIGNED_SCENE, pageId: null, multiScene: false };
};

/** Thứ tự trong một nhóm: công đoạn 1 → 7, rồi số trang, rồi thứ tự đọc của panel. Thiếu dữ liệu thì xếp cuối. */
export const compareWorkOrder = (
  a: Pick<AssignmentDto, 'entityType' | 'targetEntityId' | 'pipelineStageId'>,
  b: Pick<AssignmentDto, 'entityType' | 'targetEntityId' | 'pipelineStageId'>,
  ctx: WorkOrderContext,
): number => {
  const MAX = Number.MAX_SAFE_INTEGER;
  const key = (x: typeof a) => {
    const type = status(x.entityType);
    const panel = type === 'Panel' ? ctx.panels.find((p) => p.id === x.targetEntityId) : undefined;
    const pageId = type === 'Page' ? x.targetEntityId : panel?.pageId;
    return [
      ctx.stageOrder[x.pipelineStageId] ?? MAX,
      pageId ? (ctx.pageNumber[pageId] ?? MAX) : -1,
      panel?.readingOrder ?? -1,
    ];
  };
  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
  return 0;
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

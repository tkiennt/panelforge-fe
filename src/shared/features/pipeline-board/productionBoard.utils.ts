import type { AssignmentDto } from '@/types';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PageDto } from '@/services/page.service';
import type { WorkspaceMemberDto } from '@/services/workspace.service';
import { isReviewerRole } from '@/shared/features/collaboration/collaborationRules';
import type { BoardCard } from './pipelineBoard.types';

/**
 * Logic thuần của màn "Quy trình sản xuất" (lưới công việc + bộ lọc).
 * Mọi số liệu tính trên TOÀN BỘ danh sách việc của chương (endpoint không phân trang),
 * không tính trên tập đã lọc.
 */

export type StatusKey =
  | 'Assigned'
  | 'InProgress'
  | 'Submitted'
  | 'UnderReview'
  | 'ReworkRequired'
  | 'Approved'
  | 'Blocked';

export type QuickFilter =
  'needs-me' | 'all' | 'in-progress' | 'review' | 'rework' | 'blocked' | 'done';
export type ViewMode = 'grid' | 'list' | 'kanban';
export type GroupBy = 'none' | 'status' | 'page' | 'assignee';

export const QUICK_FILTERS: QuickFilter[] = [
  'needs-me',
  'all',
  'in-progress',
  'review',
  'rework',
  'blocked',
  'done',
];
export const VIEW_MODES: ViewMode[] = ['grid', 'list', 'kanban'];

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  'needs-me': 'Cần tôi xử lý',
  all: 'Tất cả',
  'in-progress': 'Đang làm',
  review: 'Chờ xét duyệt',
  rework: 'Cần sửa',
  blocked: 'Bị chặn',
  done: 'Hoàn tất',
};

export type StageKind = 'script' | 'thumbnail' | 'ink' | 'pencil' | 'color' | 'letter' | 'other';

/** Loại công đoạn suy từ tên stage thật (Backend cho phép đặt tên tự do). */
export const stageKindOf = (stageName: string): StageKind => {
  const n = stageName.toLowerCase();
  if (/script|kịch bản|kich ban/.test(n)) return 'script';
  if (/thumb|bố cục|bo cuc|phân khung|layout/.test(n)) return 'thumbnail';
  if (/\bink|đi nét|di net|mực/.test(n)) return 'ink';
  if (/pencil|phác|phac|vẽ nét|ve net|sketch/.test(n)) return 'pencil';
  if (/colou?r|màu|mau/.test(n)) return 'color';
  if (/letter|chữ|thoại|typeset/.test(n)) return 'letter';
  return 'other';
};

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
export const formatDate = (iso?: string | null): string =>
  iso ? dateFmt.format(new Date(iso)) : '';

/** Thứ tự hiển thị: việc cần hành động trước, việc đã xong cuối cùng. */
export const STATUS_ORDER: StatusKey[] = [
  'ReworkRequired',
  'InProgress',
  'Assigned',
  'Submitted',
  'UnderReview',
  'Blocked',
  'Approved',
];

export const STATUS_LABELS: Record<StatusKey, string> = {
  Assigned: 'Chưa bắt đầu',
  InProgress: 'Đang làm',
  Submitted: 'Đã nộp',
  UnderReview: 'Đang duyệt',
  ReworkRequired: 'Cần sửa',
  Approved: 'Hoàn tất',
  Blocked: 'Bị chặn',
};

const STATUS_BY_LOWER: Record<string, StatusKey> = Object.fromEntries(
  STATUS_ORDER.map((s) => [s.toLowerCase(), s]),
) as Record<string, StatusKey>;

/** Backend trả enum dạng chuỗi; so sánh không phân biệt hoa thường như phần còn lại của FE. */
export const statusKey = (status: unknown): StatusKey | null =>
  STATUS_BY_LOWER[String(status ?? '').toLowerCase()] ?? null;

export const statusLabel = (status: unknown): string => {
  const key = statusKey(status);
  return key ? STATUS_LABELS[key] : String(status ?? '');
};

const QUICK_FILTER_STATUSES: Partial<Record<QuickFilter, StatusKey[]>> = {
  'in-progress': ['InProgress'],
  review: ['Submitted', 'UnderReview'],
  rework: ['ReworkRequired'],
  blocked: ['Blocked'],
  done: ['Approved'],
};

export interface UserContext {
  userId?: string | null;
  /** Vai trò trong workspace (giống workspaceRole mà Bàn làm việc dùng cho getWorkActions). */
  workspaceRole?: string | null;
}

/**
 * "Cần tôi xử lý" khớp đúng luật nút của getWorkActions:
 * - Người được giao: Chưa bắt đầu / Đang làm / Cần sửa (có thể Bắt đầu hoặc Nộp).
 * - Người duyệt (Editor/Producer) KHÔNG phải người được giao: Đã nộp / Đang duyệt (BR-06 cấm tự duyệt).
 */
export const needsMyAction = (card: BoardCard, ctx: UserContext): boolean => {
  if (!ctx.userId) return false;
  const st = statusKey(card.status);
  const isAssignee = card.assigneeUserId === ctx.userId;
  if (isAssignee) return st === 'Assigned' || st === 'InProgress' || st === 'ReworkRequired';
  return isReviewerRole(ctx.workspaceRole) && (st === 'Submitted' || st === 'UnderReview');
};

export const isCardOverdue = (card: BoardCard, now: number): boolean =>
  statusKey(card.status) !== 'Approved' && !!card.dueDate && new Date(card.dueDate).getTime() < now;

/** "Hoàn tất trễ" chỉ khi có đủ cả hạn và thời điểm hoàn tất. */
export const isCompletedLate = (card: BoardCard): boolean =>
  statusKey(card.status) === 'Approved' &&
  !!card.dueDate &&
  !!card.completedAt &&
  new Date(card.completedAt).getTime() > new Date(card.dueDate).getTime();

export const matchesQuickFilter = (
  card: BoardCard,
  filter: QuickFilter,
  ctx: UserContext,
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'needs-me') return needsMyAction(card, ctx);
  const st = statusKey(card.status);
  return !!st && (QUICK_FILTER_STATUSES[filter] ?? []).includes(st);
};

// ── Phạm vi (toàn chương / trang / khung) ──

export type ScopeKey = string; // 'chapter' | 'panel' | `page:${id}`

export const scopeKeyOf = (card: BoardCard): ScopeKey => {
  const t = String(card.entityType);
  if (t === 'Page') return `page:${card.targetEntityId}`;
  if (t === 'Panel') return 'panel';
  return 'chapter';
};

export interface ScopeOption {
  key: ScopeKey;
  label: string;
}

/** Chỉ liệt kê phạm vi thật sự có việc; thứ tự: Toàn chương → Trang tăng dần → Khung tranh. */
export const buildScopeOptions = (cards: BoardCard[]): ScopeOption[] => {
  const pages = new Map<string, { label: string; n: number }>();
  let hasChapter = false;
  let hasPanel = false;
  cards.forEach((c) => {
    const key = scopeKeyOf(c);
    if (key === 'chapter') hasChapter = true;
    else if (key === 'panel') hasPanel = true;
    else if (!pages.has(key)) {
      pages.set(key, { label: c.targetLabel, n: c.pageNumber ?? Number.MAX_SAFE_INTEGER });
    }
  });
  const pageOptions = [...pages.entries()]
    .sort((a, b) => a[1].n - b[1].n || a[1].label.localeCompare(b[1].label, 'vi'))
    .map(([key, v]) => ({ key, label: v.label }));
  return [
    ...(hasChapter ? [{ key: 'chapter', label: 'Toàn chương' }] : []),
    ...pageOptions,
    ...(hasPanel ? [{ key: 'panel', label: 'Khung tranh' }] : []),
  ];
};

// ── Bộ lọc chi tiết ──

export interface DetailFilters {
  search: string;
  assignee: string; // '' = mọi người
  stage: string; // '' = mọi công đoạn
  scope: ScopeKey | ''; // '' = mọi phạm vi
  overdueOnly: boolean;
}

export const EMPTY_DETAIL_FILTERS: DetailFilters = {
  search: '',
  assignee: '',
  stage: '',
  scope: '',
  overdueOnly: false,
};

export const hasActiveDetailFilters = (f: DetailFilters): boolean =>
  f.search.trim() !== '' || f.assignee !== '' || f.stage !== '' || f.scope !== '' || f.overdueOnly;

/** Bỏ dấu để gõ "ve net" vẫn khớp "Vẽ nét". */
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const matchesDetailFilters = (card: BoardCard, f: DetailFilters, now: number): boolean => {
  if (f.assignee && card.assigneeUserId !== f.assignee) return false;
  if (f.stage && card.pipelineStageId !== f.stage) return false;
  if (f.scope && scopeKeyOf(card) !== f.scope) return false;
  if (f.overdueOnly && !isCardOverdue(card, now)) return false;
  const q = normalizeText(f.search);
  if (q) {
    const haystack = normalizeText(
      [card.brief, card.referenceNotes, card.stageName, card.targetLabel, card.assigneeName]
        .filter(Boolean)
        .join(' '),
    );
    if (!haystack.includes(q)) return false;
  }
  return true;
};

export const sortCards = (cards: BoardCard[]): BoardCard[] => {
  const rank = (c: BoardCard) => {
    const st = statusKey(c.status);
    return st ? STATUS_ORDER.indexOf(st) : STATUS_ORDER.length;
  };
  const due = (c: BoardCard) =>
    c.dueDate ? new Date(c.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return [...cards].sort(
    (a, b) => rank(a) - rank(b) || due(a) - due(b) || a.stageOrder - b.stageOrder,
  );
};

// ── Chỉ số toàn chương ──

export interface ChapterMetrics {
  total: number;
  done: number;
  percent: number | null;
  inProgress: number;
  waitingReview: number;
  rework: number;
  overdue: number;
  blocked: number;
  /** Việc thuộc công đoạn đang tắt: KHÔNG được cộng vào "hoàn tất". */
  disabledStage: number;
}

export const computeMetrics = (cards: BoardCard[], now: number): ChapterMetrics => {
  const count = (pred: (c: BoardCard) => boolean) => cards.filter(pred).length;
  const is = (s: StatusKey) => (c: BoardCard) => statusKey(c.status) === s;
  const done = count(is('Approved'));
  return {
    total: cards.length,
    done,
    percent: cards.length > 0 ? Math.round((done / cards.length) * 100) : null,
    inProgress: count(is('InProgress')),
    waitingReview: count((c) => {
      const st = statusKey(c.status);
      return st === 'Submitted' || st === 'UnderReview';
    }),
    rework: count(is('ReworkRequired')),
    overdue: count((c) => isCardOverdue(c, now)),
    blocked: count(is('Blocked')),
    disabledStage: count((c) => c.isStageEnabled === false),
  };
};

export const countQuickFilters = (
  cards: BoardCard[],
  ctx: UserContext,
): Record<QuickFilter, number> =>
  Object.fromEntries(
    QUICK_FILTERS.map((f) => [f, cards.filter((c) => matchesQuickFilter(c, f, ctx)).length]),
  ) as Record<QuickFilter, number>;

// ── Nhóm công việc: mỗi việc thuộc ĐÚNG MỘT nhóm, không loại bỏ, không nhân đôi ──

export interface CardGroup {
  key: string;
  label: string;
  cards: BoardCard[];
}

export const groupCards = (cards: BoardCard[], groupBy: GroupBy): CardGroup[] => {
  if (groupBy === 'none') return [{ key: 'all', label: '', cards }];

  const groups = new Map<string, CardGroup & { order: number | string }>();
  const push = (key: string, label: string, order: number | string, card: BoardCard) => {
    const g = groups.get(key);
    if (g) g.cards.push(card);
    else groups.set(key, { key, label, order, cards: [card] });
  };

  cards.forEach((card) => {
    if (groupBy === 'status') {
      const st = statusKey(card.status);
      push(
        st ?? `other:${String(card.status)}`,
        st ? STATUS_LABELS[st] : String(card.status),
        st ? STATUS_ORDER.indexOf(st) : STATUS_ORDER.length,
        card,
      );
    } else if (groupBy === 'page') {
      const key = scopeKeyOf(card);
      if (key === 'chapter') push(key, 'Toàn chương', -1, card);
      else if (key === 'panel')
        push(key, 'Khung tranh (chưa xác định trang)', Number.MAX_SAFE_INTEGER, card);
      else push(key, card.targetLabel, card.pageNumber ?? Number.MAX_SAFE_INTEGER - 1, card);
    } else {
      const key = card.assigneeUserId || 'unassigned';
      push(key, card.assigneeName || 'Chưa gán', normalizeText(card.assigneeName || '~'), card);
    }
  });

  return [...groups.values()]
    .sort((a, b) =>
      typeof a.order === 'number' && typeof b.order === 'number'
        ? a.order - b.order
        : String(a.order).localeCompare(String(b.order), 'vi'),
    )
    .map(({ key, label, cards: groupCardsList }) => ({ key, label, cards: groupCardsList }));
};

// ── Lý do bị chặn: lấy từ việc phụ thuộc chưa hoàn tất có trong chương ──

export const blockedReason = (card: BoardCard, all: BoardCard[]): string | null => {
  if (statusKey(card.status) !== 'Blocked') return null;
  const deps = (card.dependsOnAssignmentIds ?? [])
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is BoardCard => !!c && statusKey(c.status) !== 'Approved');
  if (deps.length === 0) return 'Chờ công đoạn trước hoàn tất';
  const first = deps[0];
  const more = deps.length > 1 ? ` và ${deps.length - 1} việc khác` : '';
  return `Chờ ${first.stageName} · ${first.targetLabel}${more}`;
};

// ── Nhãn chương: tránh "Chương 1: Chương 1: …" khi title đã chứa tiền tố ──

export const formatChapterLabel = (chapterNumber: number, title?: string | null): string => {
  const clean = (title ?? '').replace(/^\s*chương\s*\d+\s*[:.\-–—]?\s*/i, '').trim();
  return clean ? `Chương ${chapterNumber}: ${clean}` : `Chương ${chapterNumber}`;
};

// ── Chuyển AssignmentDto → BoardCard (giữ nguyên mapping của Kanban cũ) ──

export const mapAssignmentsToCards = (
  assignments: AssignmentDto[],
  stages: PipelineStageDto[],
  pages: PageDto[],
  members: WorkspaceMemberDto[],
): BoardCard[] => {
  const stagesMap = new Map(stages.map((s) => [s.id, s]));
  const pagesMap = new Map(pages.map((p) => [p.id, p]));
  const membersMap = new Map(members.map((m) => [m.userId, m]));

  return assignments.map((a) => {
    const stage = stagesMap.get(a.pipelineStageId);
    const member = membersMap.get(a.assigneeUserId);

    let targetLabel = 'Toàn chương';
    let pageNumber: number | null = null;
    if (String(a.entityType) === 'Page') {
      const page = pagesMap.get(a.targetEntityId);
      targetLabel = page ? `Trang ${page.pageNumber}` : 'Trang bản thảo';
      pageNumber = page?.pageNumber ?? null;
    } else if (String(a.entityType) === 'Panel') {
      targetLabel = 'Khung tranh';
    }

    const memberName = member?.fullName || member?.email || 'Chưa gán';
    const initials =
      memberName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return {
      id: a.id,
      seriesId: a.seriesId,
      chapterId: a.chapterId,
      entityType: a.entityType,
      targetEntityId: a.targetEntityId,
      targetLabel,
      pageNumber,
      pipelineStageId: a.pipelineStageId,
      stageName: stage?.name || a.stageName || 'Công đoạn',
      stageOrder: stage?.stageOrder ?? a.stageOrder ?? 99,
      stageColor: stage?.colorCode || null,
      isStageEnabled: stage ? stage.isEnabled !== false : true,
      assigneeUserId: a.assigneeUserId,
      assigneeName: memberName,
      assigneeEmail: member?.email,
      assigneeAvatarInitials: initials,
      assignedRole: a.assignedRole,
      brief: a.brief || 'Không có tiêu đề',
      referenceNotes: a.referenceNotes,
      dueDate: a.dueDate,
      priority: a.priority,
      status: a.status,
      dependsOnAssignmentId: a.dependsOnAssignmentId,
      dependsOnAssignmentIds:
        a.dependsOnAssignmentIds && a.dependsOnAssignmentIds.length > 0
          ? a.dependsOnAssignmentIds
          : a.dependsOnAssignmentId
            ? [a.dependsOnAssignmentId]
            : [],
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      lastFeedbackComment: a.lastFeedbackComment,
      rawAssignment: a,
    };
  });
};

// ── Hành động chính trên thẻ: chỉ điều hướng/mở chi tiết, không đổi trạng thái ──

export type PrimaryAction =
  | { kind: 'work'; label: 'Tiếp tục' | 'Mở công việc' | 'Xem yêu cầu sửa' }
  | { kind: 'review'; label: 'Xét duyệt' }
  | { kind: 'details'; label: 'Xem chi tiết' };

export const primaryActionFor = (card: BoardCard, ctx: UserContext): PrimaryAction => {
  const st = statusKey(card.status);
  const isAssignee = !!ctx.userId && card.assigneeUserId === ctx.userId;
  if (isAssignee) {
    if (st === 'InProgress') return { kind: 'work', label: 'Tiếp tục' };
    if (st === 'Assigned') return { kind: 'work', label: 'Mở công việc' };
    if (st === 'ReworkRequired') return { kind: 'work', label: 'Xem yêu cầu sửa' };
  } else if (
    !!ctx.userId &&
    isReviewerRole(ctx.workspaceRole) &&
    (st === 'Submitted' || st === 'UnderReview')
  ) {
    return { kind: 'review', label: 'Xét duyệt' };
  }
  return { kind: 'details', label: 'Xem chi tiết' };
};

const actionBase =
  'relative z-10 inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink cursor-pointer';

/** Nút điều hướng tới Bàn làm việc dùng nền cam + chữ than (đạt AA); "Xem chi tiết" là nút phụ. */
export const actionButtonClass = (action: PrimaryAction): string =>
  action.kind === 'details'
    ? ` border border-landing-border bg-white text-landing-ink hover:bg-landing-paper`
    : ` bg-landing-orange text-landing-ink hover:bg-landing-orange-hover`;

// ── Đọc tham số URL (lọc nhanh / cách xem / nhóm); giá trị lạ quay về mặc định ──

export const GROUP_BYS: GroupBy[] = ['none', 'status', 'page', 'assignee'];

export const resolveQuickFilter = (
  raw: string | null,
  canUseNeedsMe: boolean,
  isProducer: boolean,
): QuickFilter => {
  const valid = QUICK_FILTERS.find((f) => f === raw);
  if (valid && (valid !== 'needs-me' || canUseNeedsMe)) return valid;
  return !isProducer && canUseNeedsMe ? 'needs-me' : 'all';
};

export const resolveViewMode = (raw: string | null): ViewMode =>
  VIEW_MODES.find((v) => v === raw) ?? 'grid';

export const resolveGroupBy = (raw: string | null): GroupBy =>
  GROUP_BYS.find((g) => g === raw) ?? 'none';

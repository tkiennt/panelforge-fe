import type {
  AssignmentDto,
  AssignmentStatus,
  StageTaskDto,
  TaskGridDto,
  WorkflowEntityType,
  WorkspaceRole,
} from '@/types';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PageDto } from '@/services/page.service';
import type { WorkspaceMemberDto } from '@/services/workspace.service';
import { isReviewerRole } from '@/shared/features/collaboration/collaborationRules';
import { getInitialLanguage, translate } from '@/lib/i18n';
import type { BoardCard, BoardLotCellItem } from './pipelineBoard.types';

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
export type ViewMode = 'matrix' | 'grid' | 'list' | 'kanban';
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
/** 'matrix' (Bảng trang) là cách xem mặc định: tiến độ từng trang qua các công đoạn. */
export const VIEW_MODES: ViewMode[] = ['matrix', 'grid', 'list', 'kanban'];

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  get 'needs-me'() {
    return translate('pipeline.productionBoard.quickFilters.needs-me');
  },
  get all() {
    return translate('pipeline.productionBoard.quickFilters.all');
  },
  get 'in-progress'() {
    return translate('pipeline.productionBoard.quickFilters.in-progress');
  },
  get review() {
    return translate('pipeline.productionBoard.quickFilters.review');
  },
  get rework() {
    return translate('pipeline.productionBoard.quickFilters.rework');
  },
  get blocked() {
    return translate('pipeline.productionBoard.quickFilters.blocked');
  },
  get done() {
    return translate('pipeline.productionBoard.quickFilters.done');
  },
};

export type StageKind = 'script' | 'ink' | 'pencil' | 'color' | 'letter' | 'other';

/** Loại công đoạn suy từ tên stage thật (Backend cho phép đặt tên tự do). */
export const stageKindOf = (stageName: string): StageKind => {
  const n = stageName.toLowerCase();
  if (/script|kịch bản|kich ban/.test(n)) return 'script';
  if (/\bink|đi nét|di net|mực/.test(n)) return 'ink';
  if (/pencil|phác|phac|vẽ nét|ve net|sketch|bố cục|bo cuc|phân khung|layout/.test(n))
    return 'pencil';
  if (/colou?r|màu|mau/.test(n)) return 'color';
  if (/letter|chữ|thoại|typeset/.test(n)) return 'letter';
  return 'other';
};

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '';
  const lang = getInitialLanguage();
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
};

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
  get Assigned() {
    return translate('pipeline.productionBoard.statusLabels.Assigned');
  },
  get InProgress() {
    return translate('pipeline.productionBoard.statusLabels.InProgress');
  },
  get Submitted() {
    return translate('pipeline.productionBoard.statusLabels.Submitted');
  },
  get UnderReview() {
    return translate('pipeline.productionBoard.statusLabels.UnderReview');
  },
  get ReworkRequired() {
    return translate('pipeline.productionBoard.statusLabels.ReworkRequired');
  },
  get Approved() {
    return translate('pipeline.productionBoard.statusLabels.Approved');
  },
  get Blocked() {
    return translate('pipeline.productionBoard.statusLabels.Blocked');
  },
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
  const isAssignee = card.assigneeUserId === ctx.userId;
  if (card.lotTasks && card.lotTasks.length > 0) {
    if (isAssignee) {
      return card.lotTasks.some(
        (t) =>
          t.status === 'Assigned' || t.status === 'InProgress' || t.status === 'ReworkRequired',
      );
    }
    return (
      isReviewerRole(ctx.workspaceRole) &&
      card.lotTasks.some((t) => t.status === 'Submitted' || t.status === 'UnderReview')
    );
  }
  const st = statusKey(card.status);
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
    if (c.isGridLot && c.lotTasks && c.lotTasks.length > 0) {
      c.lotTasks.forEach((cell) => {
        if (cell.status === 'Cancelled' || cell.status === 'Unassigned') return;
        if (!cell.pageId) {
          hasChapter = true;
          return;
        }
        const cellKey = `page:${cell.pageId}`;
        if (!pages.has(cellKey)) {
          pages.set(cellKey, {
            label: cell.targetLabel,
            n: cell.pageNumber ?? Number.MAX_SAFE_INTEGER,
          });
        }
      });
      return;
    }
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
    ...(hasChapter
      ? [{ key: 'chapter', label: translate('pipeline.productionBoard.scope.wholeChapter') }]
      : []),
    ...pageOptions,
    ...(hasPanel
      ? [{ key: 'panel', label: translate('pipeline.productionBoard.scope.panel') }]
      : []),
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
  if (f.scope) {
    const matchesLotCell =
      card.isGridLot &&
      card.lotTasks?.some(
        (cell) =>
          cell.status !== 'Cancelled' &&
          cell.status !== 'Unassigned' &&
          (cell.pageId ? `page:${cell.pageId}` : 'chapter') === f.scope,
      );
    if (!matchesLotCell && scopeKeyOf(card) !== f.scope) return false;
  }
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
      if (key === 'chapter')
        push(key, translate('pipeline.productionBoard.scope.wholeChapter'), -1, card);
      else if (key === 'panel')
        push(
          key,
          translate('pipeline.productionBoard.scope.panelUnassignedPage'),
          Number.MAX_SAFE_INTEGER,
          card,
        );
      else push(key, card.targetLabel, card.pageNumber ?? Number.MAX_SAFE_INTEGER - 1, card);
    } else {
      const key = card.assigneeUserId || 'unassigned';
      push(
        key,
        card.assigneeName || translate('pipeline.productionBoard.unassigned'),
        normalizeText(card.assigneeName || '~'),
        card,
      );
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
  if (deps.length === 0) return translate('pipeline.productionBoard.blockedWaitingPrevStage');
  const first = deps[0];
  const more =
    deps.length > 1
      ? translate('pipeline.productionBoard.blockedMoreTasks', { count: deps.length - 1 })
      : '';
  return translate('pipeline.productionBoard.blockedWaitingDetail', {
    stage: first.stageName,
    target: first.targetLabel,
    more,
  });
};

// ── Nhãn chương: tránh "Chương 1: Chương 1: …" khi title đã chứa tiền tố ──

export const formatChapterLabel = (chapterNumber: number, title?: string | null): string => {
  const clean = (title ?? '').replace(/^\s*(?:chương|chapter)\s*\d+\s*[:.\-–—]?\s*/i, '').trim();
  return clean
    ? translate('pipeline.productionBoard.chapterLabelWithTitle', {
        number: chapterNumber,
        title: clean,
      })
    : translate('pipeline.productionBoard.chapterLabel', { number: chapterNumber });
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

    let targetLabel = translate('pipeline.productionBoard.scope.wholeChapter');
    let pageNumber: number | null = null;
    if (String(a.entityType) === 'Page') {
      const page = pagesMap.get(a.targetEntityId);
      targetLabel = page
        ? translate('pipeline.productionBoard.scope.pageNumber', { number: page.pageNumber })
        : translate('pipeline.productionBoard.scope.draftPage');
      pageNumber = page?.pageNumber ?? null;
    } else if (String(a.entityType) === 'Panel') {
      targetLabel = translate('pipeline.productionBoard.scope.panel');
    }

    const memberName =
      member?.fullName || member?.email || translate('pipeline.productionBoard.unassigned');
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
      stageName: stage?.name || a.stageName || translate('pipeline.productionBoard.stageFallback'),
      stageOrder: stage?.stageOrder ?? a.stageOrder ?? 99,
      stageColor: stage?.colorCode || null,
      isStageEnabled: stage ? stage.isEnabled !== false : true,
      assigneeUserId: a.assigneeUserId,
      assigneeName: memberName,
      assigneeEmail: member?.email,
      assigneeAvatarInitials: initials,
      assignedRole: a.assignedRole,
      brief: a.brief || translate('pipeline.productionBoard.untitledBrief'),
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
      impactReviewReason: a.impactReviewReason ?? null,
      rawAssignment: a,
    };
  });
};

export const formatPageRangeLabel = (pageNumbers: number[]): string => {
  const nums = [...new Set(pageNumbers.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  if (nums.length === 0) return translate('pipeline.productionBoard.scope.draftPage');
  if (nums.length === 1)
    return translate('pipeline.productionBoard.scope.pageNumber', { number: nums[0] });

  const ranges: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const cur = nums[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = cur;
      prev = cur;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return translate('pipeline.productionBoard.scope.pageRange', { ranges: ranges.join(', ') });
};

const aggregateLotStatus = (cells: BoardLotCellItem[]): AssignmentStatus => {
  if (cells.some((c) => c.status === 'ReworkRequired')) return 'ReworkRequired';
  if (cells.some((c) => c.status === 'UnderReview')) return 'UnderReview';
  if (cells.some((c) => c.status === 'Submitted')) return 'Submitted';
  if (cells.some((c) => c.status === 'InProgress')) return 'InProgress';
  if (cells.length > 0 && cells.every((c) => c.status === 'Approved')) return 'Approved';
  if (cells.some((c) => c.status === 'Assigned' && c.isStartable)) return 'Assigned';
  return 'Blocked';
};

/**
 * Clean Cutover (Lát cắt 4 + LỖI 3):
 * - Mỗi lô cấp Trang (`lots` trong TaskGridDto) là một thẻ gom danh sách ô, tiêu đề rõ:
 *   "Pencil – Chloe Artist – Trang 1–2 (1/2)".
 * - Ô cấp Chương (Script / Review / Approved) vẫn là thẻ riêng.
 */
export const mapTaskGridToCards = (
  grid: TaskGridDto,
  stages: PipelineStageDto[],
  pages: PageDto[],
  members: WorkspaceMemberDto[],
  seriesId: string,
  decisionCommentsByTaskId?: Record<string, string>,
): BoardCard[] => {
  const gridStagesMap = new Map((grid.stages ?? []).map((s) => [s.id, s]));
  const stagesMap = new Map(stages.map((s) => [s.id, s]));
  const gridPagesMap = new Map((grid.pages ?? []).map((p) => [p.id, p.pageNumber]));
  const pagesMap = new Map(pages.map((p) => [p.id, p]));
  const lotsMap = new Map((grid.lots ?? []).map((l) => [l.id, l]));
  const membersMap = new Map(members.map((m) => [m.userId, m]));

  const nonCancelledTasks = (grid.tasks ?? []).filter((t) => t.status !== 'Cancelled');
  const assignedTasks = nonCancelledTasks.filter((t) => t.status !== 'Unassigned');

  const resolvePageNumber = (pageId: string | null | undefined): number | null => {
    if (!pageId) return null;
    return gridPagesMap.get(pageId) ?? pagesMap.get(pageId)?.pageNumber ?? null;
  };

  const areCellPrereqsApproved = (cell: StageTaskDto): boolean => {
    const gridStage = gridStagesMap.get(cell.pipelineStageId);
    const prereqStageIds = gridStage?.prerequisiteStageIds ?? [];
    if (prereqStageIds.length === 0) return true;
    for (const prereqStageId of prereqStageIds) {
      const matching = nonCancelledTasks.filter(
        (other) =>
          other.pipelineStageId === prereqStageId &&
          (cell.pageId ? other.pageId === cell.pageId || other.pageId == null : true),
      );
      if (matching.length === 0) return false;
      if (matching.some((m) => m.status !== 'Approved' || m.isInputOutdated)) return false;
    }
    return true;
  };

  const toCellItem = (t: StageTaskDto, fallbackAssigneeId?: string): BoardLotCellItem => {
    const pageNumber = resolvePageNumber(t.pageId);
    const targetLabel = t.pageId
      ? pageNumber != null
        ? translate('pipeline.productionBoard.scope.pageNumber', { number: pageNumber })
        : translate('pipeline.productionBoard.scope.draftPage')
      : translate('pipeline.productionBoard.scope.wholeChapter');
    return {
      id: t.id,
      pageId: t.pageId,
      pageNumber,
      targetLabel,
      status: t.status,
      assigneeUserId: t.assigneeUserId || fallbackAssigneeId || null,
      isStartable: t.isStartable,
      isInputOutdated: t.isInputOutdated,
      outdatedReason: t.outdatedReason ?? null,
      lastDecisionComment:
        t.lastDecisionComment?.trim() || decisionCommentsByTaskId?.[t.id] || null,
      reopenReason: t.reopenReason ?? null,
      prerequisitesApproved: areCellPrereqsApproved(t),
    };
  };

  const buildMemberInfo = (userId: string) => {
    const member = userId ? membersMap.get(userId) : undefined;
    const memberName =
      member?.fullName ||
      (member?.email ? member.email.split('@')[0] : '') ||
      translate('pipeline.productionBoard.unassigned');
    const initials =
      memberName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
    return { member, memberName, initials };
  };

  const cards: BoardCard[] = [];

  // 1. Ô cấp Chương (Script / Review / Approved): giữ nguyên mỗi ô là một thẻ riêng
  const chapterTasks = assignedTasks.filter((t) => !t.pageId);
  for (const t of chapterTasks) {
    const gridStage = gridStagesMap.get(t.pipelineStageId);
    const pipelineStage = stagesMap.get(t.pipelineStageId);
    const lot = t.lotId ? lotsMap.get(t.lotId) : undefined;
    const assigneeUserId = t.assigneeUserId || lot?.assigneeUserId || '';
    const { member, memberName, initials } = buildMemberInfo(assigneeUserId);

    const stageName =
      gridStage?.name || pipelineStage?.name || translate('pipeline.productionBoard.stageFallback');
    const stageOrder = gridStage?.stageOrder ?? pipelineStage?.stageOrder ?? 99;
    const isStageEnabled = gridStage
      ? gridStage.isEnabled !== false
      : pipelineStage
        ? pipelineStage.isEnabled !== false
        : true;
    const assignedRole = (lot?.assignedRole ||
      gridStage?.allowedRole ||
      pipelineStage?.allowedRole ||
      'Editor') as WorkspaceRole;

    const visualStatus: AssignmentStatus =
      t.status === 'Assigned' && !t.isStartable ? 'Blocked' : (t.status as AssignmentStatus);
    const cellItem = toCellItem(t, assigneeUserId);
    const wholeChapterLabel = translate('pipeline.productionBoard.scope.wholeChapter');

    cards.push({
      id: t.id,
      seriesId,
      chapterId: grid.chapterId,
      entityType: 'Chapter',
      targetEntityId: grid.chapterId,
      targetLabel: wholeChapterLabel,
      pageNumber: null,
      pipelineStageId: t.pipelineStageId,
      stageName,
      stageOrder,
      stageColor: pipelineStage?.colorCode || null,
      isStageEnabled,
      assigneeUserId,
      assigneeName: memberName,
      assigneeEmail: member?.email,
      assigneeAvatarInitials: initials,
      assignedRole,
      brief: `${stageName} – ${memberName} – ${wholeChapterLabel}`,
      referenceNotes: lot?.brief?.trim() || null,
      dueDate: lot?.dueDate ?? null,
      priority: 'Medium',
      status: visualStatus,
      dependsOnAssignmentId: null,
      dependsOnAssignmentIds: [],
      startedAt: t.startedAt ?? null,
      completedAt: null,
      lastFeedbackComment:
        t.status === 'ReworkRequired' ? (cellItem.lastDecisionComment ?? null) : null,
      impactReviewReason: t.isInputOutdated
        ? t.outdatedReason || translate('pipeline.productionBoard.inputOutdatedDefault')
        : null,
      isGridTask: true,
      isGridLot: false,
      lotId: t.lotId ?? null,
      lotApprovedCount: t.status === 'Approved' ? 1 : 0,
      lotTaskCount: 1,
      lotTasks: [cellItem],
      isStartable: t.isStartable,
    });
  }

  // 2. Các ô cấp Trang gom theo từng Lô (StageTaskLot)
  const pageTasks = assignedTasks.filter((t) => Boolean(t.pageId));
  const consumedTaskIds = new Set<string>();

  const buildLotCard = (
    lotId: string,
    rawCells: StageTaskDto[],
    stageId: string,
    fallbackAssigneeId: string,
    lotBrief?: string | null,
    lotDueDate?: string | null,
    lotAssignedRole?: string | null,
  ): BoardCard => {
    const gridStage = gridStagesMap.get(stageId);
    const pipelineStage = stagesMap.get(stageId);
    const assigneeUserId = fallbackAssigneeId || rawCells[0]?.assigneeUserId || '';
    const { member, memberName, initials } = buildMemberInfo(assigneeUserId);

    const stageName =
      gridStage?.name || pipelineStage?.name || translate('pipeline.productionBoard.stageFallback');
    const stageOrder = gridStage?.stageOrder ?? pipelineStage?.stageOrder ?? 99;
    const isStageEnabled = gridStage
      ? gridStage.isEnabled !== false
      : pipelineStage
        ? pipelineStage.isEnabled !== false
        : true;
    const assignedRole = (lotAssignedRole ||
      gridStage?.allowedRole ||
      pipelineStage?.allowedRole ||
      'Artist') as WorkspaceRole;

    const sortedCells = [...rawCells]
      .map((t) => toCellItem(t, assigneeUserId))
      .sort(
        (a, b) =>
          (a.pageNumber ?? Number.MAX_SAFE_INTEGER) - (b.pageNumber ?? Number.MAX_SAFE_INTEGER),
      );

    const approvedCount = sortedCells.filter((c) => c.status === 'Approved').length;
    const totalCount = sortedCells.length;
    const pageNumbers = sortedCells.map((c) => c.pageNumber).filter((n): n is number => n != null);
    const pageRangeLabel = formatPageRangeLabel(pageNumbers);
    const firstCell = sortedCells[0];
    const outdatedCell = sortedCells.find((c) => c.isInputOutdated);
    const reworkCell = sortedCells.find(
      (c) => c.status === 'ReworkRequired' && Boolean(c.lastDecisionComment),
    );
    const earliestStarted = rawCells
      .map((c) => c.startedAt)
      .filter((s): s is string => Boolean(s))
      .sort()[0];

    return {
      id: lotId,
      seriesId,
      chapterId: grid.chapterId,
      entityType: 'Page',
      targetEntityId: firstCell?.pageId || lotId,
      targetLabel: `${pageRangeLabel} (${approvedCount}/${totalCount})`,
      pageNumber: firstCell?.pageNumber ?? null,
      pipelineStageId: stageId,
      stageName,
      stageOrder,
      stageColor: pipelineStage?.colorCode || null,
      isStageEnabled,
      assigneeUserId,
      assigneeName: memberName,
      assigneeEmail: member?.email,
      assigneeAvatarInitials: initials,
      assignedRole,
      brief: `${stageName} – ${memberName} – ${pageRangeLabel} (${approvedCount}/${totalCount})`,
      referenceNotes: lotBrief?.trim() || null,
      dueDate: lotDueDate ?? null,
      priority: 'Medium',
      status: aggregateLotStatus(sortedCells),
      dependsOnAssignmentId: null,
      dependsOnAssignmentIds: [],
      startedAt: earliestStarted ?? null,
      completedAt: null,
      lastFeedbackComment: reworkCell?.lastDecisionComment ?? null,
      impactReviewReason: outdatedCell
        ? outdatedCell.outdatedReason || translate('pipeline.productionBoard.inputOutdatedDefault')
        : null,
      isGridTask: true,
      isGridLot: true,
      lotId,
      lotApprovedCount: approvedCount,
      lotTaskCount: totalCount,
      firstPageId: firstCell?.pageId ?? null,
      lotTasks: sortedCells,
      isStartable: sortedCells.some((c) => c.isStartable),
    };
  };

  for (const lot of grid.lots ?? []) {
    if (lot.status === 'Closed') continue;
    const cellsInLot = pageTasks.filter((t) => t.lotId === lot.id);
    if (cellsInLot.length === 0) continue;
    cellsInLot.forEach((t) => consumedTaskIds.add(t.id));
    cards.push(
      buildLotCard(
        lot.id,
        cellsInLot,
        lot.pipelineStageId,
        lot.assigneeUserId,
        lot.brief,
        lot.dueDate,
        String(lot.assignedRole || ''),
      ),
    );
  }

  // Phòng hộ: nếu có ô cấp Trang đã gán nhưng thiếu bản ghi trong grid.lots, gom theo lotId hoặc tạo thẻ đơn
  const orphanGroups = new Map<string, StageTaskDto[]>();
  for (const t of pageTasks) {
    if (consumedTaskIds.has(t.id)) continue;
    const key = t.lotId || t.id;
    const existing = orphanGroups.get(key);
    if (existing) existing.push(t);
    else orphanGroups.set(key, [t]);
  }
  for (const [groupKey, groupCells] of orphanGroups.entries()) {
    const first = groupCells[0];
    cards.push(
      buildLotCard(
        groupKey,
        groupCells,
        first.pipelineStageId,
        first.assigneeUserId || '',
        null,
        null,
        null,
      ),
    );
  }

  return cards;
};

// ── Hành động chính trên thẻ: chỉ điều hướng/mở chi tiết, không đổi trạng thái ──

export type PrimaryAction =
  | { kind: 'work'; label: string }
  | { kind: 'review'; label: string }
  | { kind: 'details'; label: string };

export const primaryActionFor = (card: BoardCard, ctx: UserContext): PrimaryAction => {
  const isAssignee = !!ctx.userId && card.assigneeUserId === ctx.userId;
  if (card.lotTasks && card.lotTasks.length > 0) {
    if (isAssignee) {
      if (card.lotTasks.some((t) => t.status === 'ReworkRequired'))
        return { kind: 'work', label: translate('pipeline.productionBoard.actions.viewRework') };
      if (card.lotTasks.some((t) => t.status === 'InProgress'))
        return { kind: 'work', label: translate('pipeline.productionBoard.actions.continue') };
      if (card.lotTasks.some((t) => t.status === 'Assigned'))
        return { kind: 'work', label: translate('pipeline.productionBoard.actions.openTask') };
    } else if (
      !!ctx.userId &&
      isReviewerRole(ctx.workspaceRole) &&
      card.lotTasks.some((t) => t.status === 'Submitted' || t.status === 'UnderReview')
    ) {
      return { kind: 'review', label: translate('pipeline.productionBoard.actions.review') };
    }
    return { kind: 'details', label: translate('pipeline.productionBoard.actions.viewDetails') };
  }

  const st = statusKey(card.status);
  if (isAssignee) {
    if (st === 'InProgress')
      return { kind: 'work', label: translate('pipeline.productionBoard.actions.continue') };
    if (st === 'Assigned')
      return { kind: 'work', label: translate('pipeline.productionBoard.actions.openTask') };
    if (st === 'ReworkRequired')
      return { kind: 'work', label: translate('pipeline.productionBoard.actions.viewRework') };
  } else if (
    !!ctx.userId &&
    isReviewerRole(ctx.workspaceRole) &&
    (st === 'Submitted' || st === 'UnderReview')
  ) {
    return { kind: 'review', label: translate('pipeline.productionBoard.actions.review') };
  }
  return { kind: 'details', label: translate('pipeline.productionBoard.actions.viewDetails') };
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
  VIEW_MODES.find((v) => v === raw) ?? 'matrix';

export const resolveGroupBy = (raw: string | null): GroupBy =>
  GROUP_BYS.find((g) => g === raw) ?? 'none';

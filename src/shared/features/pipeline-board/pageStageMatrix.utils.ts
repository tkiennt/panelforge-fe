import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PageDto } from '@/services/page.service';
import type { StageTaskDto } from '@/types';
import type { BoardCard } from './pipelineBoard.types';
import { scopeKeyOf, statusKey, type StatusKey } from './productionBoard.utils';

/**
 * "Bảng trang": ma trận Trang × Công đoạn (kiểu bảng shot × task của các production tracker hoạt hình).
 * Trang là đơn vị sản xuất của manga; mỗi ô gom các việc của một trang ở một công đoạn.
 */
export interface MatrixColumn {
  id: string;
  name: string;
  order: number;
}

export interface MatrixRow {
  key: string;
  label: string;
  /** stageId → việc của dòng này ở công đoạn đó */
  cells: Record<string, BoardCard[]>;
  /** stageId có ô Cancelled (làm mờ, không tính vào tổng công đoạn hoạt động) */
  cancelledStageIds?: string[];
  done: number;
  total: number;
}

/** Ô có nhiều việc thì hiện trạng thái cần chú ý nhất. */
const ATTENTION: StatusKey[] = [
  'ReworkRequired',
  'Blocked',
  'UnderReview',
  'Submitted',
  'InProgress',
  'Assigned',
  'Approved',
];

export const cellLead = (cards: BoardCard[]): BoardCard | null => {
  if (cards.length === 0) return null;
  const rank = (c: BoardCard) => {
    const i = ATTENTION.indexOf(statusKey(c.status) as StatusKey);
    return i < 0 ? ATTENTION.length : i;
  };
  return [...cards].sort((a, b) => rank(a) - rank(b))[0];
};

export const buildPageStageMatrix = (
  cards: BoardCard[],
  pages: PageDto[],
  stages: PipelineStageDto[],
  options: {
    includeEmptyPages: boolean;
    gridTasks?: StageTaskDto[];
    onlyScope?: string;
  },
): { columns: MatrixColumn[]; rows: MatrixRow[] } => {
  const disabledStageIds = new Set(stages.filter((s) => s.isEnabled === false).map((s) => s.id));
  const pagesMap = new Map(pages.map((p) => [p.id, p]));

  // Cột: chỉ công đoạn đang bật của pipeline theo thứ tự, cộng công đoạn cũ chưa bị tắt
  const columns = new Map<string, MatrixColumn>();
  stages
    .filter((s) => s.isEnabled !== false)
    .forEach((s) => columns.set(s.id, { id: s.id, name: s.name, order: s.stageOrder }));
  cards.forEach((c) => {
    if (
      c.isStageEnabled === false ||
      disabledStageIds.has(c.pipelineStageId) ||
      String(c.status) === 'Cancelled'
    ) {
      return;
    }
    if (!columns.has(c.pipelineStageId))
      columns.set(c.pipelineStageId, {
        id: c.pipelineStageId,
        name: c.stageName,
        order: c.stageOrder,
      });
  });
  const sortedColumns = [...columns.values()].sort((a, b) => a.order - b.order);

  // Dòng: toàn chương → các trang theo số trang → khung tranh
  const rows = new Map<
    string,
    { label: string; sort: number; cards: BoardCard[]; cancelledStages: Set<string> }
  >();
  const ensure = (key: string, label: string, sort: number) => {
    if (!rows.has(key)) rows.set(key, { label, sort, cards: [], cancelledStages: new Set() });
    return rows.get(key)!;
  };
  if (options.includeEmptyPages) {
    pages.forEach((p) => ensure(`page:${p.id}`, `Trang ${p.pageNumber}`, p.pageNumber));
  }

  cards.forEach((c) => {
    if (c.isStageEnabled === false || disabledStageIds.has(c.pipelineStageId)) return;
    if (String(c.status) === 'Cancelled') {
      const cKey = scopeKeyOf(c);
      if (!options.onlyScope || cKey === options.onlyScope) {
        const row =
          cKey === 'chapter'
            ? ensure(cKey, 'Toàn chương', -1)
            : cKey === 'panel'
              ? ensure(cKey, 'Khung tranh', Number.MAX_SAFE_INTEGER)
              : ensure(cKey, c.targetLabel, c.pageNumber ?? Number.MAX_SAFE_INTEGER - 1);
        row.cancelledStages.add(c.pipelineStageId);
      }
      return;
    }

    // Lô V3 gom nhiều trang: rải đủ mọi trang của lô vào ma trận (không chỉ trang đầu)
    if (c.isGridLot && c.lotTasks && c.lotTasks.length > 0) {
      c.lotTasks.forEach((cell) => {
        const cellKey = cell.pageId ? `page:${cell.pageId}` : 'chapter';
        if (options.onlyScope && cellKey !== options.onlyScope) return;
        const pageNum =
          cell.pageNumber ?? (cell.pageId ? (pagesMap.get(cell.pageId)?.pageNumber ?? null) : null);
        const label =
          cellKey === 'chapter'
            ? 'Toàn chương'
            : pageNum != null
              ? `Trang ${pageNum}`
              : cell.targetLabel;
        const sort = cellKey === 'chapter' ? -1 : (pageNum ?? Number.MAX_SAFE_INTEGER - 1);

        if (cell.status === 'Cancelled') {
          ensure(cellKey, label, sort).cancelledStages.add(c.pipelineStageId);
          return;
        }
        if (cell.status === 'Unassigned') return;

        const cellVisualStatus =
          cell.status === 'Assigned' && !cell.isStartable ? 'Blocked' : (cell.status as any);
        const cellSlice: BoardCard = {
          ...c,
          entityType: cell.pageId ? 'Page' : 'Chapter',
          targetEntityId: cell.pageId || c.chapterId,
          targetLabel: label,
          pageNumber: pageNum,
          status: cellVisualStatus,
          lastFeedbackComment:
            cell.status === 'ReworkRequired'
              ? (cell.lastDecisionComment ?? c.lastFeedbackComment ?? null)
              : null,
          impactReviewReason: cell.isInputOutdated
            ? cell.outdatedReason || 'Đầu vào từ công đoạn trước đã thay đổi'
            : null,
          isStartable: cell.isStartable,
        };
        ensure(cellKey, label, sort).cards.push(cellSlice);
      });
      return;
    }

    const key = scopeKeyOf(c);
    if (options.onlyScope && key !== options.onlyScope) return;
    const row =
      key === 'chapter'
        ? ensure(key, 'Toàn chương', -1)
        : key === 'panel'
          ? ensure(key, 'Khung tranh', Number.MAX_SAFE_INTEGER)
          : ensure(key, c.targetLabel, c.pageNumber ?? Number.MAX_SAFE_INTEGER - 1);
    row.cards.push(c);
  });

  // Ghi nhận các ô Cancelled từ lưới (trên công đoạn đang bật) để làm mờ trong ma trận
  (options.gridTasks ?? []).forEach((t) => {
    if (t.status !== 'Cancelled' || !columns.has(t.pipelineStageId)) return;
    const rowKey = t.pageId ? `page:${t.pageId}` : 'chapter';
    if (options.onlyScope && rowKey !== options.onlyScope) return;
    if (!rows.has(rowKey) && !options.includeEmptyPages) return;
    const page = t.pageId ? pagesMap.get(t.pageId) : undefined;
    const label =
      rowKey === 'chapter' ? 'Toàn chương' : page ? `Trang ${page.pageNumber}` : 'Trang';
    const sort = rowKey === 'chapter' ? -1 : (page?.pageNumber ?? Number.MAX_SAFE_INTEGER - 1);
    ensure(rowKey, label, sort).cancelledStages.add(t.pipelineStageId);
  });

  const sortedRows: MatrixRow[] = [...rows.entries()]
    .sort((a, b) => a[1].sort - b[1].sort || a[1].label.localeCompare(b[1].label, 'vi'))
    .map(([key, r]) => {
      const cells: Record<string, BoardCard[]> = {};
      r.cards.forEach((c) => (cells[c.pipelineStageId] ??= []).push(c));
      const cancelledStageIds = [...r.cancelledStages].filter((sid) => !(cells[sid]?.length > 0));
      return {
        key,
        label: r.label,
        cells,
        ...(cancelledStageIds.length > 0 ? { cancelledStageIds } : {}),
        done: r.cards.filter((c) => statusKey(c.status) === 'Approved').length,
        total: r.cards.length,
      };
    });

  return { columns: sortedColumns, rows: sortedRows };
};

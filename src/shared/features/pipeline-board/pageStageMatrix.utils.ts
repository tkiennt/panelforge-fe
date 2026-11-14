import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PageDto } from '@/services/page.service';
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
  options: { includeEmptyPages: boolean },
): { columns: MatrixColumn[]; rows: MatrixRow[] } => {
  // Cột: công đoạn đang bật của pipeline theo thứ tự, cộng công đoạn chỉ còn trong việc cũ
  const columns = new Map<string, MatrixColumn>();
  stages
    .filter((s) => s.isEnabled !== false)
    .forEach((s) => columns.set(s.id, { id: s.id, name: s.name, order: s.stageOrder }));
  cards.forEach((c) => {
    if (!columns.has(c.pipelineStageId))
      columns.set(c.pipelineStageId, {
        id: c.pipelineStageId,
        name: c.stageName,
        order: c.stageOrder,
      });
  });
  const sortedColumns = [...columns.values()].sort((a, b) => a.order - b.order);

  // Dòng: toàn chương → các trang theo số trang → khung tranh
  const rows = new Map<string, { label: string; sort: number; cards: BoardCard[] }>();
  const ensure = (key: string, label: string, sort: number) => {
    if (!rows.has(key)) rows.set(key, { label, sort, cards: [] });
    return rows.get(key)!;
  };
  if (options.includeEmptyPages) {
    pages.forEach((p) => ensure(`page:${p.id}`, `Trang ${p.pageNumber}`, p.pageNumber));
  }
  cards.forEach((c) => {
    const key = scopeKeyOf(c);
    const row =
      key === 'chapter'
        ? ensure(key, 'Toàn chương', -1)
        : key === 'panel'
          ? ensure(key, 'Khung tranh', Number.MAX_SAFE_INTEGER)
          : ensure(key, c.targetLabel, c.pageNumber ?? Number.MAX_SAFE_INTEGER - 1);
    row.cards.push(c);
  });

  const sortedRows: MatrixRow[] = [...rows.entries()]
    .sort((a, b) => a[1].sort - b[1].sort || a[1].label.localeCompare(b[1].label, 'vi'))
    .map(([key, r]) => {
      const cells: Record<string, BoardCard[]> = {};
      r.cards.forEach((c) => (cells[c.pipelineStageId] ??= []).push(c));
      return {
        key,
        label: r.label,
        cells,
        done: r.cards.filter((c) => statusKey(c.status) === 'Approved').length,
        total: r.cards.length,
      };
    });

  return { columns: sortedColumns, rows: sortedRows };
};

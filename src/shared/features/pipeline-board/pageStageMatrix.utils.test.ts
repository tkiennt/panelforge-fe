import { describe, it, expect } from 'vitest';
import { buildPageStageMatrix, cellLead } from './pageStageMatrix.utils';
import type { BoardCard } from './pipelineBoard.types';

const card = (over: Partial<BoardCard>): BoardCard =>
  ({
    id: 'c',
    entityType: 'Page',
    targetEntityId: 'p1',
    targetLabel: 'Trang 1',
    pageNumber: 1,
    pipelineStageId: 's1',
    stageName: 'Pencil',
    stageOrder: 2,
    status: 'Assigned',
    ...over,
  }) as BoardCard;

const stages = [
  { id: 's2', name: 'Ink', stageOrder: 3, isEnabled: true },
  { id: 's1', name: 'Pencil', stageOrder: 2, isEnabled: true },
  { id: 's0', name: 'Color', stageOrder: 4, isEnabled: false },
] as any;
const pages = [
  { id: 'p2', pageNumber: 2 },
  { id: 'p1', pageNumber: 1 },
] as any;

describe('buildPageStageMatrix', () => {
  it('orders enabled stages as columns and pages by number, chapter row first', () => {
    const { columns, rows } = buildPageStageMatrix(
      [
        card({ id: 'a' }),
        card({ id: 'b', entityType: 'Chapter', targetEntityId: 'ch', pageNumber: null }),
      ],
      pages,
      stages,
      { includeEmptyPages: true },
    );
    expect(columns.map((c) => c.name)).toEqual(['Pencil', 'Ink']);
    expect(rows.map((r) => r.label)).toEqual(['Toàn chương', 'Trang 1', 'Trang 2']);
    expect(rows[1].cells.s1.map((c) => c.id)).toEqual(['a']);
    expect(rows[2].total).toBe(0);
  });

  it('hides pages without tasks when asked (filters active) and keeps stages only found on tasks', () => {
    const { columns, rows } = buildPageStageMatrix(
      [card({ id: 'a', pipelineStageId: 'old', stageName: 'Thumbnail', stageOrder: 1 })],
      pages,
      stages,
      { includeEmptyPages: false },
    );
    expect(rows.map((r) => r.label)).toEqual(['Trang 1']);
    expect(columns[0].name).toBe('Thumbnail');
  });

  it('counts approved tasks per row', () => {
    const { rows } = buildPageStageMatrix(
      [
        card({ id: 'a', status: 'Approved' }),
        card({ id: 'b', pipelineStageId: 's2', status: 'InProgress' }),
      ],
      pages,
      stages,
      { includeEmptyPages: false },
    );
    expect(rows[0].done).toBe(1);
    expect(rows[0].total).toBe(2);
  });

  it('fans out multi-page V3 lot across ALL pages, hides disabled stages, and marks Cancelled cells', () => {
    const lotCard = card({
      id: 'lot-1',
      isGridTask: true,
      isGridLot: true,
      lotId: 'lot-1',
      pipelineStageId: 's1',
      stageName: 'Pencil',
      targetEntityId: 'p1',
      targetLabel: 'Trang 1–2',
      pageNumber: 1,
      lotTasks: [
        {
          id: 'cell-p1',
          pageId: 'p1',
          pageNumber: 1,
          targetLabel: 'Trang 1',
          status: 'Approved',
          isStartable: true,
          isInputOutdated: false,
          prerequisitesApproved: true,
        },
        {
          id: 'cell-p2',
          pageId: 'p2',
          pageNumber: 2,
          targetLabel: 'Trang 2',
          status: 'ReworkRequired',
          isStartable: true,
          isInputOutdated: false,
          lastDecisionComment: 'Cần sửa tỉ lệ nhân vật trang 2',
          prerequisitesApproved: true,
        },
      ],
    });
    const disabledCard = card({
      id: 'lot-color-disabled',
      isGridTask: true,
      isStageEnabled: false,
      pipelineStageId: 's0',
      stageName: 'Color',
      targetEntityId: 'p1',
    });

    const { columns, rows } = buildPageStageMatrix([lotCard, disabledCard], pages, stages, {
      includeEmptyPages: true,
      gridTasks: [
        {
          id: 'cell-cancelled-ink-p1',
          pipelineStageId: 's2',
          pageId: 'p1',
          status: 'Cancelled',
          isInputOutdated: false,
          isStartable: false,
          rowVersion: 1,
        },
      ],
    });

    // Không hiện cột Color đang tắt (isEnabled = false)
    expect(columns.map((c) => c.id)).toEqual(['s1', 's2']);
    // Hiện đủ cả Trang 1 và Trang 2 của lô
    expect(rows.map((r) => r.label)).toEqual(['Trang 1', 'Trang 2']);
    expect(rows[0].cells.s1[0]?.status).toBe('Approved');
    expect(rows[1].cells.s1[0]?.status).toBe('ReworkRequired');
    expect(rows[1].cells.s1[0]?.lastFeedbackComment).toBe('Cần sửa tỉ lệ nhân vật trang 2');
    // Ô Cancelled được ghi nhận riêng để làm mờ, không tính vào tổng tiến độ
    expect(rows[0].cancelledStageIds).toContain('s2');
    expect(rows[0].total).toBe(1);
    expect(rows[0].done).toBe(1);
  });
});

describe('cellLead', () => {
  it('shows the task that needs attention first', () => {
    expect(
      cellLead([
        card({ id: 'ok', status: 'Approved' }),
        card({ id: 'fix', status: 'ReworkRequired' }),
      ])?.id,
    ).toBe('fix');
    expect(cellLead([])).toBeNull();
  });
});

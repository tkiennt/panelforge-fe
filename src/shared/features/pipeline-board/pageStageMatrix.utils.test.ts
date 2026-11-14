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

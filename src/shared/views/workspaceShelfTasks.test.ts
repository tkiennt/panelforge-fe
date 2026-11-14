import { describe, it, expect } from 'vitest';
import { dueTone, sortByDue, type TodayTask } from './workspaceShelfTasks';

const task = (id: string, dueDate: string | null) =>
  ({ workspace: { id: 'w' }, assignment: { id, dueDate } }) as unknown as TodayTask;

describe('workspaceShelfTasks', () => {
  const now = new Date('2026-11-14T00:00:00Z').getTime();

  it('colours due dates: overdue, within 2 days, later, none', () => {
    expect(dueTone('2026-11-13T00:00:00Z', now)).toBe('overdue');
    expect(dueTone('2026-11-15T12:00:00Z', now)).toBe('soon');
    expect(dueTone('2026-11-20T00:00:00Z', now)).toBe('later');
    expect(dueTone(null, now)).toBe('none');
  });

  it('sorts nearest deadline first and tasks without a deadline last', () => {
    const sorted = sortByDue([
      task('none', null),
      task('late', '2026-12-01T00:00:00Z'),
      task('soon', '2026-11-15T00:00:00Z'),
    ]);
    expect(sorted.map((t) => t.assignment.id)).toEqual(['soon', 'late', 'none']);
  });
});

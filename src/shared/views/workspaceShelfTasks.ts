import type { WorkspaceDto } from '@/types';
import type { WorkspaceAssignmentDto } from '@/types/pipeline';

/** Một việc chưa xong của người dùng, kèm studio chứa nó (dải "Việc của bạn" ở /workspaces). */
export interface TodayTask {
  workspace: WorkspaceDto;
  assignment: WorkspaceAssignmentDto;
}

const DAY = 86400000;

/** Sắp theo hạn (gần nhất trước, chưa đặt hạn ở cuối). */
export const sortByDue = (tasks: TodayTask[]): TodayTask[] =>
  [...tasks].sort((a, b) => {
    const da = a.assignment.dueDate ? new Date(a.assignment.dueDate).getTime() : Infinity;
    const db = b.assignment.dueDate ? new Date(b.assignment.dueDate).getTime() : Infinity;
    return da - db;
  });

/** Màu hạn theo DESIGN_RULES §1.5: quá hạn = đỏ, còn ≤ 2 ngày = hổ phách, còn lại = trung tính. */
export const dueTone = (dueDate: string | null | undefined, now: number) => {
  if (!dueDate) return 'none' as const;
  const left = new Date(dueDate).getTime() - now;
  if (left < 0) return 'overdue' as const;
  if (left <= 2 * DAY) return 'soon' as const;
  return 'later' as const;
};

import type { StatBarDatum } from './StatBarChart';

/**
 * Xếp hạng giảm dần theo giá trị và giữ `limit` mục đầu; phần còn lại gộp thành một thanh "Khác"
 * để biểu đồ không phình theo số bộ truyện (không sinh thêm màu/thanh vô hạn).
 */
export function rankWithOther(
  items: StatBarDatum[],
  limit: number,
  otherLabel: string,
): StatBarDatum[] {
  const sorted = [...items].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, d) => sum + d.value, 0);
  return [...head, { key: '__other__', label: otherLabel, value: rest }];
}

/** True khi không có số liệu nào > 0 — lúc đó ẩn biểu đồ (một dải cột 0 không cho thêm thông tin). */
export const hasAnyValue = (items: StatBarDatum[]) => items.some((d) => d.value > 0);

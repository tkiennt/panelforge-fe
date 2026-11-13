// src/shared/features/script-versions/versionDiff.ts
/**
 * So sánh hai phiên bản kịch bản từng dòng kiểu GitHub (unified diff):
 * mỗi hàng được hiển thị thành một dòng chữ như trên trang kịch bản, rồi tìm dãy con chung dài nhất (LCS)
 * để đánh dấu dòng giữ nguyên / bị xoá / được thêm, kèm số dòng hai bên và gom thành các khối (hunk).
 */
import type { ScriptVersionRow } from '@/services/chapter.service';

/** Lựa chọn "bản đang viết" (chưa commit) và "bản trống" trong bộ chọn so sánh. */
export const WORKING_COPY = 'working';
export const EMPTY_BASE = 'empty';

/** Id dòng từ khoá hàng `line:{id}`; null với hàng Trang / Panel. */
export const rowLineId = (row: ScriptVersionRow) =>
  row.key.startsWith('line:') ? row.key.slice(5) : null;

export interface RowLabels {
  page: (n: number) => string;
  panel: (n: number) => string;
  caption: string;
  sfx: string;
  thought: string;
}

export const DEFAULT_ROW_LABELS: RowLabels = {
  page: (n) => `TRANG ${n}`,
  panel: (n) => `PANEL ${n}`,
  caption: 'DẪN TRUYỆN:',
  sfx: 'SFX:',
  thought: '(nghĩ)',
};

/** Một hàng kịch bản thành một dòng chữ (giống cách bàn viết hiển thị). */
export function renderRow(row: ScriptVersionRow, labels: RowLabels = DEFAULT_ROW_LABELS): string {
  const text = (row.text ?? '').trim();
  switch (row.type) {
    case 'page':
      return labels.page(row.page);
    case 'panel':
      return text ? `${labels.panel(row.panel)}  ${text}` : labels.panel(row.panel);
    case 'Dialogue':
      return `${(row.label ?? '').toUpperCase()}: ${text}`;
    case 'Thought':
      return `${(row.label ?? '').toUpperCase()} ${labels.thought}: ${text}`;
    case 'Narration':
      return `${labels.caption} ${text}`;
    case 'Sfx':
      return `${labels.sfx} ${text}`;
    default:
      return text;
  }
}

export type DiffKind = 'context' | 'add' | 'del';

export interface DiffLine {
  kind: DiffKind;
  /** Số dòng ở bản cũ (null với dòng thêm). */
  oldNo: number | null;
  /** Số dòng ở bản mới (null với dòng xoá). */
  newNo: number | null;
  text: string;
  rowType: string;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/** Giới hạn bảng LCS; vượt quá thì so theo khoá hàng (vẫn đúng, kém tối ưu hơn). */
const MAX_CELLS = 4_000_000;

/** Diff từng dòng giữa hai danh sách hàng. Dòng sửa hiện thành một dòng xoá + một dòng thêm như GitHub. */
export function diffRows(
  oldRows: ScriptVersionRow[],
  newRows: ScriptVersionRow[],
  labels: RowLabels = DEFAULT_ROW_LABELS,
): DiffLine[] {
  const a = oldRows.map((r) => renderRow(r, labels));
  const b = newRows.map((r) => renderRow(r, labels));
  const n = a.length;
  const m = b.length;

  if ((n + 1) * (m + 1) > MAX_CELLS) return diffByKey(oldRows, newRows, a, b);

  // lcs[i][j] = độ dài LCS của a[i..] và b[j..]
  const width = m + 1;
  const lcs = new Int32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const out: DiffLine[] = [];
  const del = (idx: number) =>
    out.push({
      kind: 'del',
      oldNo: idx + 1,
      newNo: null,
      text: a[idx],
      rowType: oldRows[idx].type,
    });
  const add = (idx: number) =>
    out.push({
      kind: 'add',
      oldNo: null,
      newNo: idx + 1,
      text: b[idx],
      rowType: newRows[idx].type,
    });

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({
        kind: 'context',
        oldNo: i + 1,
        newNo: j + 1,
        text: a[i],
        rowType: oldRows[i].type,
      });
      i++;
      j++;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      del(i++); // hoà thì in dòng xoá trước dòng thêm, như GitHub
    } else {
      add(j++);
    }
  }
  while (i < n) del(i++);
  while (j < m) add(j++);
  return out;
}

function diffByKey(
  oldRows: ScriptVersionRow[],
  newRows: ScriptVersionRow[],
  a: string[],
  b: string[],
): DiffLine[] {
  const newIndex = new Map(newRows.map((r, idx) => [r.key, idx]));
  const out: DiffLine[] = [];
  let j = 0;
  oldRows.forEach((r, i) => {
    const target = newIndex.get(r.key);
    if (target === undefined || target < j) {
      out.push({ kind: 'del', oldNo: i + 1, newNo: null, text: a[i], rowType: r.type });
      return;
    }
    for (; j < target; j++)
      out.push({ kind: 'add', oldNo: null, newNo: j + 1, text: b[j], rowType: newRows[j].type });
    if (a[i] === b[j]) {
      out.push({ kind: 'context', oldNo: i + 1, newNo: j + 1, text: a[i], rowType: r.type });
    } else {
      out.push({ kind: 'del', oldNo: i + 1, newNo: null, text: a[i], rowType: r.type });
      out.push({ kind: 'add', oldNo: null, newNo: j + 1, text: b[j], rowType: newRows[j].type });
    }
    j++;
  });
  for (; j < newRows.length; j++)
    out.push({ kind: 'add', oldNo: null, newNo: j + 1, text: b[j], rowType: newRows[j].type });
  return out;
}

/** Gom diff thành các khối thay đổi, giữ `context` dòng không đổi ở hai đầu mỗi khối (mặc định 3 như GitHub). */
export function toHunks(lines: DiffLine[], context = 3): DiffHunk[] {
  const changed = lines
    .map((l, idx) => (l.kind === 'context' ? -1 : idx))
    .filter((idx) => idx >= 0);
  if (changed.length === 0) return [];

  const ranges: [number, number][] = [];
  for (const idx of changed) {
    const start = Math.max(0, idx - context);
    const end = Math.min(lines.length - 1, idx + context);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }

  return ranges.map(([start, end]) => {
    const slice = lines.slice(start, end + 1);
    const firstOld = slice.find((l) => l.oldNo !== null)?.oldNo ?? 0;
    const firstNew = slice.find((l) => l.newNo !== null)?.newNo ?? 0;
    return {
      oldStart: firstOld,
      oldCount: slice.filter((l) => l.kind !== 'add').length,
      newStart: firstNew,
      newCount: slice.filter((l) => l.kind !== 'del').length,
      lines: slice,
    };
  });
}

/** Số dòng thêm / xoá, để hiện "+12 −3" như GitHub. */
export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  return {
    added: lines.filter((l) => l.kind === 'add').length,
    removed: lines.filter((l) => l.kind === 'del').length,
  };
}

/** Mã băm rút gọn 7 ký tự như git (#a1b2c3d). */
export const shortHash = (hash: string) => hash.slice(0, 7);

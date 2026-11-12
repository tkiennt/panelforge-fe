import type { ChangeRequestDto } from '@/types/pipeline';

export type CrStatus = 'Open' | 'Resolved' | 'Verified' | 'Rejected';

const CR_STATUS_BY_NUMBER: Record<number, CrStatus> = {
  1: 'Open',
  2: 'Resolved',
  3: 'Verified',
  4: 'Rejected',
};

export const crStatus = (s: ChangeRequestDto['status']): CrStatus =>
  typeof s === 'number' ? (CR_STATUS_BY_NUMBER[s] ?? 'Open') : (s as CrStatus);

export const isCrClosed = (c: ChangeRequestDto) => {
  const s = crStatus(c.status);
  return s === 'Verified' || s === 'Rejected';
};

export const CR_STATUS_BADGE: Record<CrStatus, string> = {
  Open: 'bg-rose-50 text-rose-800 border-rose-200',
  Resolved: 'bg-amber-50 text-amber-800 border-amber-200',
  Verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-stone-100 text-stone-600 border-stone-200',
};

/**
 * Phát hiện do AI nêu (khớp ConsistencyChecker.IsAiOrVisualFinding ở backend). Chỉ những phát hiện này mang màu tím;
 * phát hiện từ luật bằng code dùng màu cảnh báo.
 */
export const isAiFinding = (ruleCode: string) =>
  ruleCode === 'VISUAL_CHARACTER_DEVIATION' ||
  ruleCode === 'IMAGE_INCONSISTENCY' ||
  ruleCode.startsWith('AI_CONTINUITY');

/** Phát hiện nhất quán còn cần người xử lý (BR-21). */
export const OPEN_FINDING_STATUSES = ['Open', 'Confirmed', 'NeedsClarification'];

export const newDraftId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Nháp lưu theo từng lần nộp: nộp lại là bản khác, nháp của bản cũ không còn áp dụng.
const draftKey = (scope: string, assignmentId: string, submissionId: string | null) =>
  `pf.${scope}Drafts.${assignmentId}.${submissionId ?? 'none'}`;

export function readDrafts<T>(
  scope: string,
  assignmentId: string,
  submissionId: string | null,
): T[] {
  try {
    const raw = localStorage.getItem(draftKey(scope, assignmentId, submissionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeDrafts<T>(
  scope: string,
  assignmentId: string,
  submissionId: string | null,
  drafts: T[],
) {
  try {
    const key = draftKey(scope, assignmentId, submissionId);
    if (drafts.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(drafts));
  } catch {
    // localStorage bị chặn: nháp chỉ sống trong phiên, màn hình vẫn dùng được
  }
}

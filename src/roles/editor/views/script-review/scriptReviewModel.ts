import type { ChangeRequestDto, ChangeRequestItemRequest } from '@/types/pipeline';
import type { SceneScriptLineSummaryDto } from '@/services/scriptLine.service';

/**
 * Nhận xét nháp của phiên duyệt hiện tại. Mỗi nhận xét trở thành đúng một ChangeRequest khi Editor trả bài
 * (CF3 bước 7); chưa trả bài thì chưa có gì gửi tới Writer.
 */
export interface ReviewDraft {
  id: string;
  sceneId: string;
  /** null = nhận xét cả phân cảnh */
  scriptLineId: string | null;
  /** Nguyên văn tại lúc nhận xét, gửi kèm để yêu cầu sửa gắn đúng bản Editor đã đọc. */
  quotedText: string;
  text: string;
}

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

/** Khoá neo: dòng nếu có, không thì cả phân cảnh. */
export const anchorKey = (sceneId: string | null | undefined, lineId: string | null | undefined) =>
  lineId ? `line:${lineId}` : sceneId ? `scene:${sceneId}` : 'general';

export const lineText = (
  line: Pick<SceneScriptLineSummaryDto, 'dialogueText' | 'stageDirection'>,
) => [line.stageDirection, line.dialogueText].filter((x) => x && x.trim()).join(' — ');

export const draftsToChangeItems = (drafts: ReviewDraft[]): ChangeRequestItemRequest[] =>
  drafts.map((d) => ({
    description: d.text.trim(),
    sceneId: d.sceneId,
    scriptLineId: d.scriptLineId ?? undefined,
    quotedText: d.quotedText || undefined,
  }));

// Nháp lưu theo từng lần nộp: nộp lại là bản khác, nháp của bản cũ không còn áp dụng.
const draftKey = (assignmentId: string, submissionId: string | null) =>
  `pf.scriptReviewDrafts.${assignmentId}.${submissionId ?? 'none'}`;

export function readDrafts(assignmentId: string, submissionId: string | null): ReviewDraft[] {
  try {
    const raw = localStorage.getItem(draftKey(assignmentId, submissionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ReviewDraft[]) : [];
  } catch {
    return [];
  }
}

export function writeDrafts(
  assignmentId: string,
  submissionId: string | null,
  drafts: ReviewDraft[],
) {
  try {
    const key = draftKey(assignmentId, submissionId);
    if (drafts.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(drafts));
  } catch {
    // localStorage bị chặn: nháp chỉ sống trong phiên, màn hình vẫn dùng được
  }
}

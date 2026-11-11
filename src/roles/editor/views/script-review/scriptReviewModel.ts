import type { ChangeRequestItemRequest } from '@/types/pipeline';
import type { SceneScriptLineSummaryDto } from '@/services/scriptLine.service';

export { crStatus, isCrClosed, type CrStatus } from '../review-shared/reviewModel';

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

import type {
  SceneScriptLineSummaryDto,
  ScriptRevisionLineDto,
} from '@/services/scriptLine.service';

export type LineLike = Pick<
  ScriptRevisionLineDto,
  'lineOrder' | 'speakerCharacterId' | 'dialogueText' | 'stageDirection'
>;

export type LineDiffStatus = 'same' | 'changed' | 'added' | 'removed';

export interface LineDiffRow {
  key: string;
  /** Dòng ở revision đang chọn (bên trái). */
  revision: (LineLike & { id: string }) | null;
  /** Dòng ở bản hiện tại (bên phải). */
  current: (LineLike & { id: string }) | null;
  /** Theo chiều khôi phục: `added` = dòng sẽ được bật lại, `removed` = dòng hiện tại sẽ bị xoá mềm. */
  status: LineDiffStatus;
}

const norm = (v?: string | null) => (v ?? '').trim();

const sameContent = (a: LineLike, b: LineLike) =>
  norm(a.dialogueText) === norm(b.dialogueText) &&
  norm(a.stageDirection) === norm(b.stageDirection) &&
  (a.speakerCharacterId ?? null) === (b.speakerCharacterId ?? null) &&
  a.lineOrder === b.lineOrder;

/**
 * Đối chiếu revision với bản hiện tại theo `id` dòng (khôi phục giữ nguyên id dòng, BR-08).
 * Hàng sắp theo thứ tự dòng của revision, rồi tới các dòng chỉ có ở bản hiện tại.
 */
export function diffScriptLines(
  revisionLines: ScriptRevisionLineDto[],
  currentLines: SceneScriptLineSummaryDto[],
): LineDiffRow[] {
  const currentById = new Map(currentLines.map((l) => [l.id, l]));
  const seen = new Set<string>();
  const rows: LineDiffRow[] = [];

  for (const rl of [...revisionLines].sort((a, b) => a.lineOrder - b.lineOrder)) {
    const cur = currentById.get(rl.lineId) ?? null;
    if (cur) seen.add(cur.id);
    rows.push({
      key: rl.lineId,
      revision: { ...rl, id: rl.lineId },
      current: cur,
      status: cur ? (sameContent(rl, cur) ? 'same' : 'changed') : 'added',
    });
  }
  for (const cl of [...currentLines].sort((a, b) => a.lineOrder - b.lineOrder)) {
    if (seen.has(cl.id)) continue;
    rows.push({ key: cl.id, revision: null, current: cl, status: 'removed' });
  }
  return rows;
}

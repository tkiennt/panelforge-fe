import type {
  LineRewriteSuggestion,
  NextLineSuggestion,
  ScriptDraft,
} from '@/services/aiAgents.service';
import { SceneDetailDto, ScriptLineKind } from '@/services/scriptLine.service';
import type { JSONContent } from '@tiptap/core';
import { collectLines, linesToNodes, ServerLine, splitSpeakerLabel } from './scriptFlowAdapter';

export interface ScriptPaperRow {
  el: string;
  text: string;
}
export interface ScriptDiffRow extends ScriptPaperRow {
  status: 'same' | 'added' | 'removed';
}

const toRows = (lines: ServerLine[]): ScriptPaperRow[] =>
  linesToNodes(lines).map((n: JSONContent) => ({
    el: String(n.attrs?.el),
    text: (n.content ?? []).map((c) => c.text ?? '').join(''),
  }));

const KINDS: Record<string, ScriptLineKind> = {
  Action: ScriptLineKind.Action,
  Dialogue: ScriptLineKind.Dialogue,
  Thought: ScriptLineKind.Thought,
  Narration: ScriptLineKind.Narration,
  Sfx: ScriptLineKind.Sfx,
};

export function sceneRows(scene: SceneDetailDto): ScriptPaperRow[] {
  return toRows(collectLines([scene]));
}

/** Đề xuất Script thành các dòng trang giấy; bản nháp cũ có thể mang cả chỉ dẫn và thoại trong một dòng. */
export function draftRows(draft: ScriptDraft, nameById: Record<string, string>): ScriptPaperRow[] {
  const lines: ServerLine[] = [...draft.lines]
    .sort((a, b) => a.order - b.order)
    .flatMap((l) => {
      const base = { lineOrder: l.order, panelId: null, refs: null };
      const label = l.speakerLabel ?? (l.speakerId ? (nameById[l.speakerId] ?? null) : null);
      const out: ServerLine[] = [];
      if (l.stageDirection?.trim()) {
        out.push({
          ...base,
          id: `${l.lineId}-stage`,
          kind: (l.kind && KINDS[l.kind]) || ScriptLineKind.Action,
          speakerLabel: null,
          text: l.stageDirection.trim(),
        });
      }
      if (l.dialogue?.trim()) {
        out.push({
          ...base,
          id: l.lineId,
          kind: l.kind === 'Thought' ? ScriptLineKind.Thought : ScriptLineKind.Dialogue,
          speakerLabel: label,
          text: l.dialogue.trim(),
        });
      }
      return out;
    });
  return toRows(lines);
}

export function rewriteRows(scene: SceneDetailDto, s: LineRewriteSuggestion): ScriptPaperRow[] {
  return toRows(
    collectLines([scene]).map((l) =>
      l.id === s.sourceScriptLineId ? { ...l, text: s.suggestedText } : l,
    ),
  );
}

export function insertRows(scene: SceneDetailDto, s: NextLineSuggestion): ScriptPaperRow[] {
  const existing = collectLines([scene]);
  const inserted: ServerLine = {
    id: `insert-${s.runId}`,
    lineOrder: existing.length + 1,
    kind: (s.kind && KINDS[s.kind]) || ScriptLineKind.Action,
    speakerLabel: s.kind === 'Dialogue' ? (s.speaker ?? null) : null,
    text: s.text,
    panelId: null,
    refs: null,
  };
  const idx = s.afterLineId ? existing.findIndex((l) => l.id === s.afterLineId) : existing.length - 1;
  const pos = idx >= 0 ? idx + 1 : existing.length;
  const next = [...existing.slice(0, pos), inserted, ...existing.slice(pos)];
  return toRows(next);
}

/** Tên mục Bible sẽ được tạo nháp khi Accept. */
export function newBibleNames(draft: ScriptDraft): string[] {
  const names = draft.lines.flatMap((l) => [
    ...(!l.speakerId && l.speakerLabel ? [splitSpeakerLabel(l.speakerLabel).name] : []),
    ...(l.refs ?? []).flatMap((r) => (r.newName ? [r.newName] : [])),
  ]);
  return [...new Set(names)];
}

/** So sánh từng dòng (LCS); trong một cụm thay đổi, dòng bị bỏ đứng trước dòng thêm. */
export function diffScriptRows(before: ScriptPaperRow[], after: ScriptPaperRow[]): ScriptDiffRow[] {
  const key = (r: ScriptPaperRow) => `${r.el}|${r.text}`;
  const n = before.length;
  const m = after.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        key(before[i]) === key(after[j])
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: ScriptDiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && key(before[i]) === key(after[j])) {
      out.push({ ...before[i], status: 'same' });
      i++;
      j++;
    } else if (i < n && (j === m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push({ ...before[i++], status: 'removed' });
    } else {
      out.push({ ...after[j++], status: 'added' });
    }
  }
  return out;
}

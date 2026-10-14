import {
  AiRunDto,
  AiRunStatus,
  AiStepDto,
  AiSuggestionKind,
  AiWorkflowType,
  ScriptDraft,
  WorkerAgentName,
} from '@/services/aiAgents.service';

/** Bảy agent chuyên môn, mỗi agent hỗ trợ một hoặc hai role; Supervisor (Gemini) điều phối chúng và KHÔNG phải ProducerAgent. */
export const AGENTS: WorkerAgentName[] = [
  'Writer',
  'Continuity',
  'Storyboard',
  'Artist',
  'Letterer',
  'Editor',
  'Producer',
];

/** Tập agent của từng nhiệm vụ — khớp WorkflowRules.AgentsOf của Backend (dùng để hiển thị run đã lưu, không để cấp quyền). */
export const WORKFLOW_AGENTS: Record<AiWorkflowType, WorkerAgentName[]> = {
  FullScene: ['Writer', 'Continuity', 'Storyboard', 'Editor'],
  Script: ['Writer', 'Continuity'],
  Storyboard: ['Continuity', 'Storyboard', 'Editor'],
  Artist: ['Artist'],
  Letterer: ['Letterer'],
  Editor: ['Continuity', 'Editor'],
  Producer: ['Producer'],
};

export const WORKFLOW_META: Record<
  AiWorkflowType,
  { title: string; short: string; result: 'suggestion' | 'report' }
> = {
  FullScene: {
    title: 'Scene đầy đủ (script → storyboard → review)',
    short: 'Scene đầy đủ',
    result: 'suggestion',
  },
  Script: { title: 'Viết script', short: 'Script', result: 'suggestion' },
  Storyboard: { title: 'Storyboard từ script có sẵn', short: 'Storyboard', result: 'suggestion' },
  Artist: { title: 'Prompt ảnh cho panel', short: 'Prompt ảnh', result: 'suggestion' },
  Letterer: { title: 'Rút gọn thoại cho bubble', short: 'Thoại', result: 'suggestion' },
  Editor: { title: 'Review biên tập', short: 'Review', result: 'report' },
  Producer: { title: 'Báo cáo tiến độ', short: 'Tiến độ', result: 'report' },
};

/** Thứ tự hiển thị trong form chọn nhiệm vụ. */
export const WORKFLOW_ORDER: AiWorkflowType[] = [
  'FullScene',
  'Script',
  'Storyboard',
  'Artist',
  'Letterer',
  'Editor',
  'Producer',
];

/** Nhiệm vụ có Writer trong chuỗi: chỉ ở đây "ép Writer không sửa lỗi / Supervisor leo thang" (Mock) mới có nghĩa. */
export const hasWriterLoop = (t: AiWorkflowType) => t === 'FullScene' || t === 'Script';

export const KIND_META: Record<
  AiSuggestionKind,
  { title: string; applyLabel: string; applyNote: string }
> = {
  Script: {
    title: 'Script',
    applyLabel: 'Accept (áp dụng script)',
    applyNote: 'Thay các dòng script của Scene bằng bản AI; dòng cũ còn trong revision/baseline.',
  },
  Layout: {
    title: 'Layout (Page/Panel)',
    applyLabel: 'Accept (tạo Page/Panel)',
    applyNote: 'Tạo Page và Panel mới cho Scene chưa có Page; không ghi đè dữ liệu có sẵn.',
  },
  ImagePrompt: {
    title: 'Prompt ảnh',
    applyLabel: 'Accept (ghi revision prompt ảnh)',
    applyNote: 'Ghi một revision prompt ảnh append-only; không sinh ảnh, không sửa Bible/layout.',
  },
  Lettering: {
    title: 'Rút gọn thoại',
    applyLabel: 'Accept (áp dụng rút gọn thoại)',
    applyNote:
      'Tạo revision script mới với thoại rút gọn; thoại gốc còn trong revision cũ. Bubble trên canvas không bị đổi.',
  },
};

export const RUN_STATUS_LABEL: Record<AiRunStatus, string> = {
  Queued: 'Đang xếp hàng',
  Running: 'Đang chạy',
  WaitingForHuman: 'Dừng — chờ con người quyết định',
  Completed: 'Hoàn tất',
  Failed: 'Thất bại',
  Interrupted: 'Bị gián đoạn (AI service dừng)',
};

export interface LineInfo {
  order: number;
  text: string;
  speaker?: string | null;
}

/** Tra cứu dòng script theo lineId từ mọi lượt Writer (lượt cũ vẫn còn trong step để đối chiếu). */
export function collectLines(
  steps: AiStepDto[],
  nameById: Record<string, string>,
): Record<string, LineInfo> {
  const map: Record<string, LineInfo> = {};
  for (const s of steps) {
    if (s.agent !== 'Writer' || !s.output) continue;
    for (const l of (s.output as ScriptDraft).lines ?? []) {
      map[l.lineId] = {
        order: l.order,
        text: l.dialogue || l.stageDirection || '',
        speaker: l.speakerId ? nameById[l.speakerId] : null,
      };
    }
  }
  return map;
}

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

export const SEVERITY_STYLE: Record<string, string> = {
  Blocking: 'bg-red-50 text-red-700 border-red-300',
  Warning: 'bg-amber-50 text-amber-700 border-amber-300',
  Info: 'bg-sky-50 text-sky-700 border-sky-300',
};

export interface DiffSegment {
  text: string;
  kind: 'same' | 'removed';
}

/**
 * So sánh thoại gốc với bản rút gọn theo từ (LCS): từ chỉ có ở bản gốc đánh dấu 'removed'.
 * Chỉ để người duyệt nhìn nhanh phần bị lược; không thay thế việc đọc cả hai bản.
 */
export function wordDiff(original: string, suggested: string): DiffSegment[] {
  const strip = (w: string) => w.replace(/[….,!?;:"“”]/g, '').toLowerCase();
  const a = original.split(/\s+/).filter(Boolean);
  const b = suggested.split(/\s+/).filter(Boolean);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        strip(a[i]) === strip(b[j]) && strip(a[i]) !== ''
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out: DiffSegment[] = [];
  const push = (text: string, kind: DiffSegment['kind']) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += ` ${text}`;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (j < b.length && strip(a[i]) === strip(b[j]) && strip(a[i]) !== '') {
      push(a[i], 'same');
      i++;
      j++;
    } else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) {
      j++; // từ chỉ có ở bản đề xuất (vd dấu "…"): không đánh dấu ở bản gốc
    } else {
      push(a[i], 'removed');
      i++;
    }
  }
  return out;
}

/** Step báo cáo (Editor/Producer) cuối cùng thành công: để hiện báo cáo tham khảo nổi bật. */
export function lastReportStep(
  run: AiRunDto | null,
  agent: 'Editor' | 'Producer',
): AiStepDto | undefined {
  return [...(run?.steps ?? [])]
    .filter((s) => s.agent === agent && s.status === 'Succeeded' && s.output)
    .pop();
}

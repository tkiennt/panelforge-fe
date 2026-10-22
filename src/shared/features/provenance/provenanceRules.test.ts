import { describe, it, expect } from 'vitest';
import type { ProvenanceNode, ProvenanceReportResponse } from '@/services/aiAgents.service';
import {
  canRestorePage,
  canViewProvenanceReport,
  detail,
  eventTone,
  revisionOrigin,
  revisionsOf,
  shortHash,
  traceRevision,
} from './provenanceRules';

const node = (
  over: Partial<ProvenanceNode> & Pick<ProvenanceNode, 'nodeType' | 'id'>,
): ProvenanceNode => ({
  timestamp: '2026-10-17T03:00:00Z',
  summary: over.id,
  details: {},
  ...over,
});

/** Chuỗi BR-10: Run → Step → Suggestion → Decision → Revision v2 (AI) → Snapshot; v3 khôi phục từ v1 (người). */
const report: ProvenanceReportResponse = {
  chapterId: 'c1',
  sceneId: null,
  generatedAtUtc: '2026-10-17T04:00:00Z',
  stats: {
    totalRuns: 1,
    totalSteps: 1,
    totalSuggestions: 1,
    acceptedSuggestions: 1,
    rejectedSuggestions: 0,
    pendingSuggestions: 0,
    modifiedByHumanDecisions: 0,
    totalRevisions: 3,
    aiOriginatedRevisions: 1,
    manualRevisions: 2,
    totalSnapshots: 1,
    totalPromptTokens: 100,
    totalCompletionTokens: 50,
  },
  nodes: [
    node({ nodeType: 'Run', id: 'run', details: { requestedBy: 'Brian Writer' } }),
    node({
      nodeType: 'Step',
      id: 'step',
      details: { agent: 'Writer', model: 'gemini-2.5', promptRef: 'Prompts/writer.md@v3' },
    }),
    node({ nodeType: 'Suggestion', id: 'sug' }),
    node({
      nodeType: 'Decision',
      id: 'dec',
      details: { decidedBy: 'Emma Editor', modificationLevel: 'None' },
    }),
    node({
      nodeType: 'Revision',
      id: 'v1',
      timestamp: '2026-10-17T01:00:00Z',
      details: { origin: 'Human' },
    }),
    node({
      nodeType: 'Revision',
      id: 'v2',
      timestamp: '2026-10-17T02:00:00Z',
      details: { origin: 'AI' },
    }),
    node({
      nodeType: 'Revision',
      id: 'v3',
      timestamp: '2026-10-17T03:30:00Z',
      details: { origin: 'Human' },
    }),
    node({ nodeType: 'Snapshot', id: 'snap', summary: 'Bản duyệt #1' }),
  ],
  edges: [
    { fromId: 'run', toId: 'step', relationship: 'produced' },
    { fromId: 'step', toId: 'sug', relationship: 'produced' },
    { fromId: 'sug', toId: 'dec', relationship: 'decided' },
    { fromId: 'dec', toId: 'v2', relationship: 'created' },
    { fromId: 'sug', toId: 'v2', relationship: 'originatedFrom' },
    { fromId: 'v1', toId: 'v2', relationship: 'previousVersion' },
    { fromId: 'v2', toId: 'snap', relationship: 'includedIn' },
    { fromId: 'v1', toId: 'v3', relationship: 'restoredFrom' },
  ],
  timeline: [],
};

describe('canViewProvenanceReport (UC-19)', () => {
  it('Producer và Editor xem được, không phân biệt hoa thường', () => {
    expect(canViewProvenanceReport('Producer')).toBe(true);
    expect(canViewProvenanceReport('EDITOR')).toBe(true);
  });

  it('role khác và chưa rõ role thì ẩn tab (BE trả 403)', () => {
    for (const role of ['Writer', 'ARTIST', 'Publisher', 'Letterer', null, undefined])
      expect(canViewProvenanceReport(role)).toBe(false);
  });
});

describe('traceRevision (BR-10)', () => {
  it('truy revision AI về agent, model, prompt, người chạy, người duyệt và bản duyệt chứa nó', () => {
    const t = traceRevision(report, 'v2')!;

    expect(t.origin).toBe('AI');
    expect(t.suggestion?.id).toBe('sug');
    expect(t.step?.id).toBe('step');
    expect(t.run?.id).toBe('run');
    expect(t.decision?.id).toBe('dec');
    expect(detail(t.step, 'promptRef')).toBe('Prompts/writer.md@v3');
    expect(detail(t.decision, 'decidedBy')).toBe('Emma Editor');
    expect(t.snapshots.map((s) => s.summary)).toEqual(['Bản duyệt #1']);
  });

  it('revision khôi phục chỉ ra bản gốc, không có chuỗi AI', () => {
    const t = traceRevision(report, 'v3')!;

    expect(t.origin).toBe('Human');
    expect(t.restoredFrom?.id).toBe('v1');
    expect(t.suggestion).toBeUndefined();
    expect(t.snapshots).toEqual([]);
  });

  it('id không phải revision thì trả null', () => {
    expect(traceRevision(report, 'sug')).toBeNull();
    expect(traceRevision(report, 'missing')).toBeNull();
  });
});

describe('tiện ích hiển thị', () => {
  it('revisionsOf: chỉ revision, mới nhất trước', () => {
    expect(revisionsOf(report).map((r) => r.id)).toEqual(['v3', 'v2', 'v1']);
  });

  it('detail đọc được cả PascalCase lẫn camelCase', () => {
    const n = node({ nodeType: 'Step', id: 's', details: { PromptRef: 'P@v1', model: 'm' } });
    expect(detail(n, 'promptRef')).toBe('P@v1');
    expect(detail(n, 'Model')).toBe('m');
    expect(detail(undefined, 'x')).toBeUndefined();
  });

  it('revisionOrigin dựa vào sourceSuggestionId khi thiếu origin', () => {
    expect(
      revisionOrigin(
        node({ nodeType: 'Revision', id: 'r', details: { sourceSuggestionId: 'sug' } }),
      ),
    ).toBe('AI');
    expect(revisionOrigin(node({ nodeType: 'Revision', id: 'r', details: null }))).toBe('Human');
  });

  it('eventTone tách AI, người, lỗi, duyệt', () => {
    expect(eventTone('StepCompleted')).toBe('ai');
    expect(eventTone('DecisionMade')).toBe('human');
    expect(eventTone('RunFailed')).toBe('error');
    expect(eventTone('SnapshotCreated')).toBe('approval');
  });

  it('shortHash rút gọn chuỗi dài, giữ chuỗi ngắn', () => {
    expect(shortHash('abcdef0123456789', 6)).toBe('abcdef…');
    expect(shortHash('abc')).toBe('abc');
    expect(shortHash(null)).toBe('—');
  });
});

describe('canRestorePage (CF4 4.3, US-12)', () => {
  it('chỉ Producer và Artist khôi phục canvas trang', () => {
    expect(canRestorePage('Producer')).toBe(true);
    expect(canRestorePage('ARTIST')).toBe(true);
    expect(canRestorePage('Writer')).toBe(false);
    expect(canRestorePage('Editor')).toBe(false);
    expect(canRestorePage(null)).toBe(false);
  });
});

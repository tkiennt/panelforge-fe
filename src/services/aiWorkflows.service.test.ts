import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import {
  AiRunDto,
  AiStepDto,
  AiWorkflowType,
  aiAgentsService,
  workflowOf,
} from './aiAgents.service';
import {
  AGENTS,
  WORKFLOW_AGENTS,
  WORKFLOW_META,
  hasWriterLoop,
  lastReportStep,
  wordDiff,
} from '@/shared/features/ai-agents/aiViewUtils';

vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);

const step = (over: Partial<AiStepDto>): AiStepDto => ({
  id: crypto.randomUUID(),
  stepIndex: 1,
  agent: 'Writer',
  round: 0,
  status: 'Succeeded',
  provider: 'Mock',
  model: 'mock-fixture-v1',
  promptVersion: 'x@1',
  promptRef: 'ref',
  startedAtUtc: '',
  completedAtUtc: '',
  durationMs: 10,
  repairAttempts: 0,
  ...over,
});

const run = (over: Partial<AiRunDto>): AiRunDto => ({
  id: 'r1',
  seriesId: 's1',
  chapterId: 'c1',
  sceneId: 'sc1',
  requestedByUserId: 'u1',
  status: 'Running',
  provider: 'Mock',
  model: 'mock-fixture-v1',
  brief: 'b',
  readingDirection: 'RightToLeft',
  revisionRounds: 0,
  maxRevisionRounds: 2,
  baseChapterVersion: 0,
  bibleRevisionIds: [],
  createdAt: '',
  lastActivityAtUtc: '',
  steps: [],
  suggestions: [],
  ...over,
});

describe('API nhiệm vụ AI (workflow)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('runWorkflow: POST route tổng quát kèm workflowType; FE không gửi role hay danh sách agent', async () => {
    post.mockResolvedValue({
      data: { runId: 'r1', status: 'Queued', provider: 'Mock', model: 'm' },
    });

    await aiAgentsService.runWorkflow('s1', {
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'b',
      readingDirection: 'RightToLeft',
      chapterVersion: 3,
      baseScriptRevisionId: 'rev1',
      workflowType: 'Artist',
    });

    expect(post).toHaveBeenCalledWith(
      '/series/s1/ai/workflows/run',
      expect.objectContaining({ workflowType: 'Artist', chapterVersion: 3 }),
    );
    const body = post.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(body)).not.toEqual(
      expect.arrayContaining(['role', 'agents', 'allowedAgents']),
    );
  });

  it('Producer: sceneId null được gửi nguyên (báo cáo cấp Chapter)', async () => {
    post.mockResolvedValue({ data: {} });

    await aiAgentsService.runWorkflow('s1', {
      chapterId: 'c1',
      sceneId: null,
      brief: 'b',
      readingDirection: 'RightToLeft',
      chapterVersion: 0,
      workflowType: 'Producer',
    });

    expect(post).toHaveBeenCalledWith(
      '/series/s1/ai/workflows/run',
      expect.objectContaining({ sceneId: null, workflowType: 'Producer' }),
    );
  });

  it('403 ROLE/ASSIGNMENT và 409 thiếu điều kiện giữ nguyên code, status và thông điệp tiếng Việt', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { code: 'FORBIDDEN', error: 'Chapter đã giao việc cho người khác.' },
      },
    });
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: 'CONFLICT', error: 'Scene chưa có layout đã Accept.' },
      },
    });
    const req = {
      chapterId: 'c',
      sceneId: 's',
      brief: 'b',
      readingDirection: 'RightToLeft' as const,
      chapterVersion: 0,
    };

    const forbidden = await aiAgentsService.runWorkflow('s1', req).catch((e) => e);
    const conflict = await aiAgentsService.runWorkflow('s1', req).catch((e) => e);

    expect([forbidden.status, forbidden.code]).toEqual([403, 'FORBIDDEN']);
    expect(forbidden.message).toContain('giao việc');
    expect([conflict.status, conflict.code]).toEqual([409, 'CONFLICT']);
    expect(conflict.message).toContain('layout');
  });

  it('availability: GET đúng route, có/không sceneId', async () => {
    get.mockResolvedValue({ data: { workflows: [] } });

    await aiAgentsService.getWorkflowAvailability('s1', 'c1', 'sc1');
    await aiAgentsService.getWorkflowAvailability('s1', 'c1');

    expect(get).toHaveBeenNthCalledWith(1, '/series/s1/ai/workflows/availability', {
      params: { chapterId: 'c1', sceneId: 'sc1' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/series/s1/ai/workflows/availability', {
      params: { chapterId: 'c1' },
    });
  });
});

describe('meta nhiệm vụ', () => {
  it('có đủ 7 agent chuyên môn; Supervisor không nằm trong danh sách và không phải Producer', () => {
    expect(AGENTS).toEqual([
      'Writer',
      'Continuity',
      'Storyboard',
      'Artist',
      'Letterer',
      'Editor',
      'Producer',
    ]);
    expect(AGENTS).not.toContain('Supervisor');
  });

  it('mỗi nhiệm vụ chỉ có tập agent riêng (không nhiệm vụ nào ép đủ 7 agent)', () => {
    const types = Object.keys(WORKFLOW_AGENTS) as AiWorkflowType[];
    expect(types).toHaveLength(7);
    for (const t of types) expect(WORKFLOW_AGENTS[t].length).toBeLessThan(7);
    expect(WORKFLOW_AGENTS.Artist).toEqual(['Artist']);
    expect(WORKFLOW_AGENTS.Producer).toEqual(['Producer']);
    expect(WORKFLOW_AGENTS.Script).toEqual(['Writer', 'Continuity']);
    expect(WORKFLOW_AGENTS.Storyboard).not.toContain('Writer');
  });

  it('Editor/Producer là báo cáo tham khảo; còn lại là đề xuất áp dụng được', () => {
    expect(WORKFLOW_META.Editor.result).toBe('report');
    expect(WORKFLOW_META.Producer.result).toBe('report');
    for (const t of ['FullScene', 'Script', 'Storyboard', 'Artist', 'Letterer'] as const)
      expect(WORKFLOW_META[t].result).toBe('suggestion');
  });

  it('chỉ nhiệm vụ có Writer mới có vòng sửa', () => {
    expect(hasWriterLoop('FullScene')).toBe(true);
    expect(hasWriterLoop('Script')).toBe(true);
    for (const t of ['Storyboard', 'Artist', 'Letterer', 'Editor', 'Producer'] as const)
      expect(hasWriterLoop(t)).toBe(false);
  });

  it('run cũ không có workflowType được hiểu là FullScene', () => {
    expect(workflowOf(run({}))).toBe('FullScene');
    expect(workflowOf(null)).toBe('FullScene');
    expect(workflowOf(run({ workflowType: 'Producer' }))).toBe('Producer');
  });
});

describe('so sánh thoại và báo cáo', () => {
  it('wordDiff đánh dấu từ bị lược ở bản gốc; không đánh dấu dấu "…" thêm vào', () => {
    const segs = wordDiff('Bà ơi hay để cháu thử cạy ổ khóa này', 'Bà ơi hay để cháu thử…');

    expect(segs[0]).toEqual({ text: 'Bà ơi hay để cháu thử', kind: 'same' });
    expect(segs[1]).toEqual({ text: 'cạy ổ khóa này', kind: 'removed' });
  });

  it('wordDiff: hai bản giống nhau → không có đoạn bị lược', () => {
    expect(wordDiff('Xin chào An', 'Xin chào An').every((s) => s.kind === 'same')).toBe(true);
    expect(wordDiff('', 'x')).toEqual([]);
  });

  it('lastReportStep trả báo cáo thành công mới nhất của đúng agent', () => {
    const r = run({
      steps: [
        step({ stepIndex: 1, agent: 'Producer', output: { headline: 'cũ' } }),
        step({ stepIndex: 2, agent: 'Producer', output: { headline: 'mới' } }),
        step({ stepIndex: 3, agent: 'Producer', status: 'Failed', output: null }),
        step({ stepIndex: 4, agent: 'Editor', output: { verdict: 'Approve' } }),
      ],
    });

    expect((lastReportStep(r, 'Producer')?.output as { headline: string }).headline).toBe('mới');
    expect(lastReportStep(r, 'Editor')?.stepIndex).toBe(4);
    expect(lastReportStep(null, 'Editor')).toBeUndefined();
  });
});

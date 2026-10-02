import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import {
  AiApiError,
  AiRunDto,
  AiStepDto,
  aiAgentsService,
  isActiveRun,
  latestScriptRevisionId,
  previousWriterStep,
} from './aiAgents.service';
import { agentNodeStates, collectLines } from '../components/ai/aiViewUtils';

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
  promptVersion: 'writer@1',
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

const blockingReport = { findings: [{ severity: 'Blocking' }] };

describe('aiAgentsService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('chạy workflow: POST đúng route + body, trả runId', async () => {
    post.mockResolvedValue({
      data: { runId: 'r1', status: 'Queued', provider: 'Mock', model: 'm' },
    });

    const res = await aiAgentsService.runDemoWorkflow('s1', {
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'b',
      readingDirection: 'RightToLeft',
      chapterVersion: 2,
      baseScriptRevisionId: null,
    });

    expect(res.runId).toBe('r1');
    expect(post).toHaveBeenCalledWith(
      '/series/s1/ai/workflows/demo/run',
      expect.objectContaining({ chapterVersion: 2, baseScriptRevisionId: null }),
    );
  });

  it('AI tắt: giữ mã AI_UNAVAILABLE và status 503 để UI hiện banner "làm thủ công"', async () => {
    post.mockRejectedValue({
      response: { status: 503, data: { code: 'AI_UNAVAILABLE', error: 'AI service đang tắt.' } },
    });

    const err = await aiAgentsService
      .runDemoWorkflow('s1', {
        chapterId: 'c',
        sceneId: 's',
        brief: 'b',
        readingDirection: 'RightToLeft',
        chapterVersion: 0,
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(AiApiError);
    expect(err.code).toBe('AI_UNAVAILABLE');
    expect(err.status).toBe(503);
    expect(err.message).toBe('AI service đang tắt.');
  });

  it('Accept gửi chapterVersion; version cũ → lỗi 409 CONFLICT giữ nguyên để UI tải lại (BR-11)', async () => {
    post.mockRejectedValue({
      response: { status: 409, data: { code: 'CONFLICT', error: 'Version cũ' } },
    });

    const err = await aiAgentsService
      .review('s1', 'sg1', 'accept', { chapterVersion: 0 })
      .catch((e) => e);

    expect(post).toHaveBeenCalledWith('/series/s1/ai/suggestions/sg1/accept', {
      chapterVersion: 0,
    });
    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('reject / request-changes dùng đúng route và gửi reason', async () => {
    post.mockResolvedValue({ data: { status: 'Rejected' } });

    await aiAgentsService.review('s1', 'sg1', 'reject', { reason: 'x', chapterVersion: 1 });
    await aiAgentsService.review('s1', 'sg2', 'request-changes', { reason: 'y' });

    expect(post).toHaveBeenNthCalledWith(1, '/series/s1/ai/suggestions/sg1/reject', {
      reason: 'x',
      chapterVersion: 1,
    });
    expect(post).toHaveBeenNthCalledWith(2, '/series/s1/ai/suggestions/sg2/request-changes', {
      reason: 'y',
    });
  });

  it('lấy run, suggestions (có filter) và revisions của Scene', async () => {
    get.mockResolvedValue({ data: [] });

    await aiAgentsService.getRun('s1', 'r1');
    await aiAgentsService.getSuggestions('s1', { status: 'Pending', runId: 'r1' });
    await aiAgentsService.getSceneRevisions('s1', 'sc1');

    expect(get).toHaveBeenNthCalledWith(1, '/series/s1/ai/runs/r1');
    expect(get).toHaveBeenNthCalledWith(2, '/series/s1/ai/suggestions', {
      params: { status: 'Pending', runId: 'r1' },
    });
    expect(get).toHaveBeenNthCalledWith(3, '/series/s1/ai/scenes/sc1/revisions');
  });
});

describe('helper hiển thị Multi-Agent', () => {
  it('baseScriptRevisionId = revision Script có version lớn nhất; chưa có thì null', () => {
    const rev = (id: string, kind: 'Script' | 'Layout', v: number) =>
      ({ id, kind, versionNumber: v }) as never;

    expect(latestScriptRevisionId([])).toBeNull();
    expect(latestScriptRevisionId([rev('l1', 'Layout', 5)])).toBeNull();
    expect(
      latestScriptRevisionId([rev('a', 'Script', 1), rev('b', 'Script', 3), rev('c', 'Script', 2)]),
    ).toBe('b');
  });

  it('isActiveRun chỉ đúng với Queued/Running (dừng polling khi kết thúc)', () => {
    expect(isActiveRun('Queued')).toBe(true);
    expect(isActiveRun('Running')).toBe(true);
    for (const s of ['Completed', 'WaitingForHuman', 'Failed', 'Interrupted'] as const)
      expect(isActiveRun(s)).toBe(false);
    expect(isActiveRun(undefined)).toBe(false);
  });

  it('thanh pipeline: Continuity còn finding chặn → agent kế tiếp là Writer (vòng sửa)', () => {
    const r = run({
      steps: [
        step({ stepIndex: 1, agent: 'Writer' }),
        step({ stepIndex: 2, agent: 'Continuity', output: blockingReport }),
      ],
    });

    const s = agentNodeStates(r);

    expect(s.Writer).toBe('running');
    expect(s.Continuity).toBe('done');
    expect(s.Storyboard).toBe('idle');
  });

  it('thanh pipeline: Continuity sạch → Storyboard chạy; WaitingForHuman → Storyboard/Editor "skipped"', () => {
    const clean = run({
      steps: [
        step({ agent: 'Writer' }),
        step({ stepIndex: 2, agent: 'Continuity', output: { findings: [] } }),
      ],
    });
    expect(agentNodeStates(clean).Storyboard).toBe('running');

    const waiting = run({
      status: 'WaitingForHuman',
      revisionRounds: 2,
      steps: [step({ agent: 'Continuity', output: blockingReport })],
    });
    const s = agentNodeStates(waiting);
    expect(s.Storyboard).toBe('skipped');
    expect(s.Editor).toBe('skipped');
  });

  it('Supervisor điều phối: quyết định chọn agent nào thì agent đó "đang chạy"', () => {
    const decision = (action: string) => ({
      schemaVersion: 1,
      runId: 'r1',
      round: 0,
      action,
      reason: 'lý do',
      instruction: null,
      allowedActions: [action],
      guardrailOverridden: false,
    });
    const r = run({
      steps: [
        step({ stepIndex: 1, agent: 'Supervisor', output: decision('Writer') }),
        step({ stepIndex: 2, agent: 'Writer' }),
        step({ stepIndex: 3, agent: 'Supervisor', output: decision('Continuity') }),
      ],
    });

    const s = agentNodeStates(r);

    expect(s.Supervisor).toBe('done');
    expect(s.Writer).toBe('done');
    expect(s.Continuity).toBe('running');
    expect(s.Storyboard).toBe('idle');
  });

  it('Supervisor điều phối: vừa xong một agent → Supervisor "đang quyết định" bước kế tiếp', () => {
    const r = run({
      steps: [
        step({
          stepIndex: 1,
          agent: 'Supervisor',
          output: { action: 'Writer', allowedActions: ['Writer'] },
        }),
        step({ stepIndex: 2, agent: 'Writer' }),
      ],
    });

    const s = agentNodeStates(r);

    expect(s.Supervisor).toBe('running');
    expect(s.Continuity).toBe('idle');
  });

  it('Supervisor chọn StopForHuman: Storyboard/Editor "không chạy"', () => {
    const r = run({
      status: 'WaitingForHuman',
      revisionRounds: 2,
      steps: [
        step({ stepIndex: 1, agent: 'Writer' }),
        step({ stepIndex: 2, agent: 'Continuity', output: blockingReport }),
        step({ stepIndex: 3, agent: 'Supervisor', output: { action: 'StopForHuman' } }),
      ],
    });

    const s = agentNodeStates(r);

    expect(s.Supervisor).toBe('done');
    expect(s.Storyboard).toBe('skipped');
    expect(s.Editor).toBe('skipped');
  });

  it('thanh pipeline: step lỗi đánh dấu agent "failed"', () => {
    const r = run({ status: 'Failed', steps: [step({ agent: 'Writer', status: 'Failed' })] });

    expect(agentNodeStates(r).Writer).toBe('failed');
  });

  it('previousWriterStep trả lượt Writer liền trước để UI đánh dấu dòng "đã sửa"', () => {
    const w0 = step({ stepIndex: 1, agent: 'Writer', output: { lines: [] } });
    const w1 = step({ stepIndex: 3, agent: 'Writer', round: 1, output: { lines: [] } });
    const c = step({ stepIndex: 2, agent: 'Continuity', output: {} });

    expect(previousWriterStep([w0, c, w1], w1)?.id).toBe(w0.id);
    expect(previousWriterStep([w0, c, w1], w0)).toBeUndefined();
  });

  it('collectLines gom dòng của mọi lượt Writer và gắn tên nhân vật', () => {
    const w = step({
      agent: 'Writer',
      output: {
        lines: [
          { lineId: 'L-1', order: 2, speakerId: 'an', dialogue: 'Xin chào', stageDirection: null },
        ],
      },
    });

    const map = collectLines([w], { an: 'An' });

    expect(map['L-1']).toEqual({ order: 2, text: 'Xin chào', speaker: 'An' });
  });
});

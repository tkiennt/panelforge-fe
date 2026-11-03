import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import {
  AiApiError,
  AiStepDto,
  aiAgentsService,
  isActiveRun,
  latestScriptRevisionId,
  previousWriterStep,
} from './aiAgents.service';
import { collectLines } from '@/shared/features/ai-agents/aiViewUtils';

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

describe('aiAgentsService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('chạy workflow: POST đúng route + body, trả runId', async () => {
    post.mockResolvedValue({
      data: { runId: 'r1', status: 'Queued', provider: 'Mock', model: 'm' },
    });

    const res = await aiAgentsService.runWorkflow('s1', {
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'b',
      readingDirection: 'RightToLeft',
      chapterVersion: 2,
      baseScriptRevisionId: null,
      workflowType: 'Script',
    });

    expect(res.runId).toBe('r1');
    expect(post).toHaveBeenCalledWith(
      '/series/s1/ai/workflows/run',
      expect.objectContaining({
        chapterVersion: 2,
        baseScriptRevisionId: null,
        workflowType: 'Script',
      }),
    );
  });

  it('AI tắt: giữ mã AI_UNAVAILABLE và status 503 để UI hiện banner "làm thủ công"', async () => {
    post.mockRejectedValue({
      response: { status: 503, data: { code: 'AI_UNAVAILABLE', error: 'AI service đang tắt.' } },
    });

    const err = await aiAgentsService
      .runWorkflow('s1', {
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

describe('helper hiển thị Trợ lý AI', () => {
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

  it('chạy Copilot: POST /series/{id}/ai/copilot đúng task và lineId', async () => {
    post.mockResolvedValue({
      data: {
        id: 'sug-1',
        runId: 'r-copilot',
        stepId: 'step-1',
        sceneId: 'sc1',
        kind: 'LineRewrite',
        status: 'Pending',
        summary: 'Viết lại thoại',
        payload: {
          schemaVersion: 1,
          runId: 'r-copilot',
          sceneId: 'sc1',
          task: 'writer.rewrite',
          sourceScriptLineId: 'line-1',
          originalText: 'Dòng cũ',
          suggestedText: 'Dòng mới',
          reason: 'Tự nhiên hơn',
          maxChars: null,
        },
        payloadHash: 'hash',
        baseChapterVersion: 1,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-01T10:00:00Z',
        decisions: [],
      },
    });

    const res = await aiAgentsService.runCopilot('s1', {
      task: 'writer.rewrite',
      lineId: 'line-1',
      instruction: 'giọng thân mật',
    });

    expect(post).toHaveBeenCalledWith('/series/s1/ai/copilot', {
      task: 'writer.rewrite',
      lineId: 'line-1',
      instruction: 'giọng thân mật',
    });
    expect(res.id).toBe('sug-1');
    expect(res.kind).toBe('LineRewrite');
  });

  it('Copilot bị lỗi: ném AiApiError chứa status và code', async () => {
    post.mockRejectedValue({
      response: {
        status: 429,
        data: { code: 'AI_QUOTA_EXCEEDED', error: 'Vượt hạn mức' },
      },
    });

    const err = await aiAgentsService
      .runCopilot('s1', {
        task: 'letterer.shorten',
        lineId: 'line-1',
        maxChars: 40,
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(AiApiError);
    expect(err.status).toBe(429);
    expect(err.code).toBe('AI_QUOTA_EXCEEDED');
    expect(err.message).toBe('Vượt hạn mức');
  });

  it('chạy Publisher Copilot: POST /series/{id}/ai/copilot/publisher-metadata trả SeriesMetadata suggestion', async () => {
    post.mockResolvedValue({
      data: {
        id: 'sug-pm',
        runId: 'r-pm',
        stepId: 'step-pm',
        sceneId: '00000000-0000-0000-0000-000000000000',
        kind: 'SeriesMetadata',
        status: 'Pending',
        summary: 'Gợi ý metadata',
        payload: {
          schemaVersion: 1,
          runId: 'r-pm',
          seriesId: 's1',
          originalGenre: 'Action',
          metadata: {
            logline: 'Một câu chuyện hay',
            synopsis: 'Tóm tắt chi tiết',
            genre: 'Action, Shonen',
            teaser: 'Đón xem ngay',
            ageRating: '16+',
          },
          reason: 'Hợp xu hướng',
        },
        payloadHash: 'hash-pm',
        baseChapterVersion: 1,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-01T10:00:00Z',
        decisions: [],
      },
    });

    const res = await aiAgentsService.runPublisherMetadata('s1', {
      chapterId: 'c1',
      instruction: 'hấp dẫn hơn',
    });

    expect(post).toHaveBeenCalledWith('/series/s1/ai/copilot/publisher-metadata', {
      chapterId: 'c1',
      instruction: 'hấp dẫn hơn',
    });
    expect(res.id).toBe('sug-pm');
    expect(res.kind).toBe('SeriesMetadata');
  });

  it('chạy Artist Thumbnail: POST /series/{id}/ai/thumbnail trả Thumbnail suggestion', async () => {
    post.mockResolvedValue({
      data: {
        id: 'sug-tn',
        runId: 'r-tn',
        stepId: 'step-tn',
        sceneId: 'sc1',
        kind: 'Thumbnail',
        status: 'Pending',
        summary: 'Ảnh thumbnail',
        payload: {
          schemaVersion: 1,
          runId: 'r-tn',
          panelId: 'p1',
          pageId: 'page1',
          stageId: 'stage1',
          assetId: 'asset1',
          sha256: 'sha-tn',
          imagePromptRevisionId: 'ip-rev-1',
          prompt: 'A manga character',
          provider: 'Gemini',
          model: 'gemini-2.5-flash-image',
          referenceEntryIds: [],
        },
        payloadHash: 'hash-tn',
        baseChapterVersion: 1,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-01T10:00:00Z',
        decisions: [],
      },
    });

    const res = await aiAgentsService.runThumbnail('s1', {
      panelId: 'p1',
      instruction: 'góc cận',
    });

    expect(post).toHaveBeenCalledWith(
      '/series/s1/ai/thumbnail',
      {
        panelId: 'p1',
        instruction: 'góc cận',
      },
      expect.objectContaining({ timeout: 120000 }),
    );
    expect(res.id).toBe('sug-tn');
    expect(res.kind).toBe('Thumbnail');
  });
});

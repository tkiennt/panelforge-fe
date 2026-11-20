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
    expect(err.message).toContain('Trợ lý AI đang bận');
    expect(err.message).not.toContain('AI service đang tắt');
  });

  it.each([
    ['AI_UNAVAILABLE', 503, 'Provider giới hạn tần suất/quota (HTTP 429).', 'Trợ lý AI đang bận'],
    [
      'AI_INVALID_OUTPUT',
      422,
      'AI trả kết quả không hợp lệ: text rỗng.',
      'AI chưa tạo được kết quả hợp lệ',
    ],
    [
      'AI_INVALID_OUTPUT',
      422,
      'AI chưa rút gọn được xuống 30 ký tự. Hãy thử lại.',
      'AI chưa rút gọn được xuống 30 ký tự',
    ],
  ])('Copilot %s (%i): hiện câu dễ hiểu', async (code, status, error, expected) => {
    post.mockRejectedValue({ response: { status, data: { code, error } } });

    const err = await aiAgentsService
      .runCopilot('s1', { task: 'letterer.shorten', pageId: 'p', elementId: 'e', maxChars: 30 })
      .catch((e) => e);

    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
    expect(err.message).toContain(expected);
    expect(err.message).not.toContain('Provider');
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
    expect(err.message).toBe('Version cũ');
  });

  it('403 từ filter phân quyền (chỉ có message, không có code): gán code FORBIDDEN và giữ nguyên message Backend', async () => {
    post.mockRejectedValue({
      response: {
        status: 403,
        data: { message: 'Bạn không có quyền thực hiện thao tác này trong Series.' },
      },
    });

    const err = await aiAgentsService
      .review('s1', 'sg1', 'accept', { chapterVersion: 1 })
      .catch((e) => e);

    expect(err).toBeInstanceOf(AiApiError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Bạn không có quyền thực hiện thao tác này trong Series.');
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

  it('chạy Copilot bóng thoại (letterer.shorten): nhận pageId, elementId, maxChars, revisionOfSuggestionId tùy chọn không cần lineId', async () => {
    post.mockResolvedValue({
      data: {
        id: 'sug-bubble',
        runId: 'r-bubble',
        stepId: 'st-bubble',
        sceneId: 'sc1',
        kind: 'Lettering',
        status: 'Pending',
        summary: 'Rút gọn thoại còn 18/25 ký tự',
        payload: {
          pageId: 'page-1',
          elementId: 'el-1',
          elementVersion: 2,
          originalText: 'Chúng ta không thể bỏ mặc họ lúc này được đâu!',
          suggestedText: 'Không thể bỏ họ!',
          reason: 'Ngắn gọn vừa bóng thoại',
          maxChars: 25,
        },
        payloadHash: 'hash-b',
        baseChapterVersion: 3,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-18T10:00:00Z',
        decisions: [],
      },
    });

    const res = await aiAgentsService.runCopilot('s1', {
      task: 'letterer.shorten',
      pageId: 'page-1',
      elementId: 'el-1',
      maxChars: 25,
      revisionOfSuggestionId: 'sug-old',
    });

    expect(post).toHaveBeenCalledWith('/series/s1/ai/copilot', {
      task: 'letterer.shorten',
      pageId: 'page-1',
      elementId: 'el-1',
      maxChars: 25,
      revisionOfSuggestionId: 'sug-old',
    });
    expect(res.kind).toBe('Lettering');
  });

  it('runBibleStubDraft: POST /series/{seriesId}/ai/bible/entries/{entryId}/stub-draft và giữ nguyên message lỗi 409', async () => {
    post.mockResolvedValueOnce({
      data: {
        id: 'sug-stub',
        runId: 'r-stub',
        stepId: 'st-stub',
        sceneId: 'sc1',
        kind: 'BibleStub',
        status: 'Pending',
        summary: 'Hồ sơ nháp cho Akira',
        payload: {
          entryId: 'ent-1',
          name: 'Akira',
          draft: {
            description: 'Kiếm sĩ áo choàng đen.',
            subtitle: 'Kiếm sĩ',
            citations: [
              { claim: 'Mặc áo choàng đen', lineId: 'l1', quote: 'Akira khoác áo choàng đen' },
            ],
          },
          reason: 'Tổng hợp từ 1 dòng thoại',
        },
        payloadHash: 'hash-st',
        baseChapterVersion: 1,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-18T10:00:00Z',
        decisions: [],
      },
    });

    const ok = await aiAgentsService.runBibleStubDraft('s1', 'ent-1', 'tập trung ngoại hình');
    expect(post).toHaveBeenCalledWith('/series/s1/ai/bible/entries/ent-1/stub-draft', {
      instruction: 'tập trung ngoại hình',
    });
    expect(ok.kind).toBe('BibleStub');

    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          code: 'CONFLICT',
          error: 'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
        },
      },
    });
    const err = await aiAgentsService.runBibleStubDraft('s1', 'ent-2').catch((e) => e);
    expect(err).toBeInstanceOf(AiApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe(
      'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
    );
  });

  it('runImpactSuggestion: POST /chapters/{chapterId}/ai/impact/{taskId} không gửi body và giữ nguyên lỗi 403/409', async () => {
    post.mockResolvedValueOnce({
      data: {
        id: 'sug-imp',
        runId: 'r-imp',
        stepId: 'st-imp',
        sceneId: '00000000-0000-0000-0000-000000000000',
        kind: 'ImpactRipple',
        status: 'Pending',
        summary: 'Gợi ý Keep cho Ink, trang 1',
        payload: {
          taskId: 'task-1',
          decision: 'Keep',
          reason: 'Chỉ sửa dấu câu, không đổi bố cục tranh.',
          changes: [{ type: 'Dialogue', label: 'Akira', before: 'Đi thôi', after: 'Đi thôi!' }],
        },
        payloadHash: 'hash-imp',
        baseChapterVersion: 2,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-18T10:00:00Z',
        decisions: [],
      },
    });

    const ok = await aiAgentsService.runImpactSuggestion('chap-1', 'task-1');
    expect(post).toHaveBeenCalledWith('/chapters/chap-1/ai/impact/task-1');
    expect(ok.kind).toBe('ImpactRipple');

    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: 'CONFLICT', error: 'Ô này không mang cờ ảnh hưởng do sửa kịch bản.' },
      },
    });
    const err = await aiAgentsService.runImpactSuggestion('chap-1', 'task-2').catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.message).toBe('Ô này không mang cờ ảnh hưởng do sửa kịch bản.');
  });

  it('review accept không cần truyền chapterVersion cho các đề xuất ngoài kịch bản (Lettering/BibleStub/ImpactRipple)', async () => {
    post.mockResolvedValueOnce({ data: { status: 'Accepted' } });
    await aiAgentsService.review('s1', 'sg-letter', 'accept');
    expect(post).toHaveBeenCalledWith('/series/s1/ai/suggestions/sg-letter/accept', {});
  });
});

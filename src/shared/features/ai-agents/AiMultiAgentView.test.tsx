import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AiRunDto,
  AiSuggestionDto,
  AiWorkflowAvailability,
  AiWorkflowAvailabilityResponse,
  AiWorkflowType,
  aiAgentsService,
} from '@/services/aiAgents.service';
import { chapterService } from '@/services/chapter.service';
import { bibleService } from '@/services/bible.service';
import { AiMultiAgentView } from './AiMultiAgentView';

vi.mock('@/services/aiAgents.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/aiAgents.service')>();
  return {
    ...actual,
    aiAgentsService: {
      getWorkflowAvailability: vi.fn(),
      runWorkflow: vi.fn(),
      runDemoWorkflow: vi.fn(),
      getRun: vi.fn(),
      getSceneRevisions: vi.fn(),
      getScenesByChapter: vi.fn(),
      getSuggestions: vi.fn(),
      review: vi.fn(),
    },
  };
});
vi.mock('@/services/chapter.service', () => ({
  chapterService: { getChaptersBySeries: vi.fn(), getChapterById: vi.fn() },
}));
vi.mock('@/services/bible.service', () => ({
  bibleService: { getSeriesBible: vi.fn() },
}));

const svc = vi.mocked(aiAgentsService);

const wf = (
  type: AiWorkflowType,
  over: Partial<AiWorkflowAvailability> = {},
): AiWorkflowAvailability => ({
  workflowType: type,
  title: `Tiêu đề ${type}`,
  description: `Mô tả ${type}`,
  agents: ['Writer'],
  requiredRoles: ['Writer'],
  resultKinds: ['Script'],
  canRun: true,
  missing: [],
  ...over,
});

const availability = (
  role: AiWorkflowAvailabilityResponse['yourRole'] = 'Writer',
): AiWorkflowAvailabilityResponse => ({
  yourRole: role,
  chapterId: 'c1',
  sceneId: 'sc1',
  workflows: [
    wf('FullScene', { agents: ['Writer', 'Continuity', 'Storyboard', 'Editor'] }),
    wf('Script', { agents: ['Writer', 'Continuity'] }),
    wf('Storyboard', {
      agents: ['Continuity', 'Storyboard', 'Editor'],
      resultKinds: ['Layout'],
      canRun: false,
      missing: [
        {
          code: 'NO_SCRIPT',
          kind: 'Context',
          message: 'Scene chưa có script. Chạy workflow Script và Accept trước.',
        },
      ],
    }),
    wf('Artist', {
      agents: ['Artist'],
      requiredRoles: ['Artist'],
      resultKinds: ['ImagePrompt'],
      canRun: false,
      missing: [
        {
          code: 'ROLE_NOT_ALLOWED',
          kind: 'Permission',
          message: 'Vai trò Writer không được chạy nhiệm vụ này (cần: Artist).',
        },
        {
          code: 'NO_LAYOUT',
          kind: 'Context',
          message: 'Scene chưa có layout đã Accept. Chạy Storyboard và Accept layout trước.',
        },
      ],
    }),
    wf('Letterer', {
      agents: ['Letterer'],
      requiredRoles: ['Letterer'],
      resultKinds: ['Lettering'],
      canRun: false,
      missing: [
        {
          code: 'ROLE_NOT_ALLOWED',
          kind: 'Permission',
          message: 'Vai trò Writer không được chạy nhiệm vụ này (cần: Letterer).',
        },
      ],
    }),
    wf('Editor', {
      agents: ['Continuity', 'Editor'],
      requiredRoles: ['Producer', 'Editor'],
      resultKinds: ['Report'],
      canRun: false,
      missing: [
        {
          code: 'ROLE_NOT_ALLOWED',
          kind: 'Permission',
          message: 'Vai trò Writer không được chạy nhiệm vụ này (cần: Producer/Editor).',
        },
      ],
    }),
    wf('Producer', {
      agents: ['Producer'],
      requiredRoles: ['Producer'],
      resultKinds: ['Report'],
      canRun: role === 'Producer',
    }),
  ],
});

const decision = (action: string) => ({
  schemaVersion: 1,
  runId: 'r1',
  round: 0,
  action,
  reason: `chọn ${action}`,
  instruction: null,
  allowedActions: [action],
  guardrailOverridden: false,
});

const baseRun = (over: Partial<AiRunDto>): AiRunDto => ({
  id: 'run-1234567890',
  seriesId: 's1',
  chapterId: 'c1',
  sceneId: 'sc1',
  requestedByUserId: 'u1',
  status: 'Completed',
  provider: 'Mock',
  model: 'mock-fixture-v1',
  brief: 'Brief của run',
  readingDirection: 'RightToLeft',
  revisionRounds: 0,
  maxRevisionRounds: 2,
  baseChapterVersion: 2,
  bibleRevisionIds: [],
  createdAt: '2026-10-02T00:00:00Z',
  lastActivityAtUtc: '2026-10-02T00:00:00Z',
  steps: [],
  suggestions: [],
  workflowType: 'Script',
  ...over,
});

const stepOf = (stepIndex: number, agent: string, output: unknown) => ({
  id: `st-${stepIndex}`,
  stepIndex,
  agent,
  round: 0,
  status: 'Succeeded',
  provider: 'Mock',
  model: 'mock-fixture-v1',
  promptVersion: `${agent.toLowerCase()}@1`,
  promptRef: `Prompts/${agent.toLowerCase()}.md@v1#sha256:abc`,
  output,
  startedAtUtc: '',
  completedAtUtc: '',
  durationMs: 5,
  repairAttempts: 0,
});

function renderView() {
  const toast = vi.fn();
  render(
    <MemoryRouter initialEntries={['/series/s1']}>
      <Routes>
        <Route path='/series/:seriesId' element={<AiMultiAgentView onShowToast={toast} />} />
      </Routes>
    </MemoryRouter>,
  );
  return toast;
}

const taskOption = (type: string) =>
  document.querySelector(`[data-workflow="${type}"]`) as HTMLElement;
const pick = (type: string) => fireEvent.click(within(taskOption(type)).getByRole('radio'));
const runButton = () => screen.getByRole('button', { name: /^Chạy:/ });

describe('AiMultiAgentView — chọn nhiệm vụ theo quyền và context', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [{ id: 'c1', chapterNumber: 3, title: 'Tiếng mưa', scenesCount: 1 }],
    } as never);
    vi.mocked(chapterService.getChapterById).mockResolvedValue({ versionVector: 2 } as never);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      entries: [{ id: 'an-id', name: 'An' }],
    } as never);
    svc.getScenesByChapter.mockResolvedValue([
      { id: 'sc1', chapterId: 'c1', sceneNumber: 1, heading: 'Tiệm đồng hồ' },
    ]);
    svc.getSceneRevisions.mockResolvedValue([]);
    svc.getWorkflowAvailability.mockResolvedValue(availability('Writer'));
  });

  it('liệt kê đủ 7 nhiệm vụ, kèm agent, role cần có và loại kết quả (đề xuất / báo cáo)', async () => {
    renderView();

    await waitFor(() => expect(taskOption('Producer')).toBeTruthy());
    const types = [...document.querySelectorAll('[data-workflow]')].map((n) =>
      n.getAttribute('data-workflow'),
    );
    expect(types).toEqual([
      'FullScene',
      'Script',
      'Storyboard',
      'Artist',
      'Letterer',
      'Editor',
      'Producer',
    ]);
    await waitFor(() => expect(taskOption('Artist').getAttribute('data-can-run')).toBe('false'));
    expect(taskOption('Script').getAttribute('data-can-run')).toBe('true');
    expect(within(taskOption('Editor')).getByText('Báo cáo')).toBeInTheDocument();
    expect(within(taskOption('Artist')).getByText('Đề xuất')).toBeInTheDocument();
    expect(screen.getByText(/Vai trò của bạn trong Workspace:/)).toHaveTextContent('Writer');
  });

  it('nhiệm vụ chưa chạy được: nêu rõ điều kiện còn thiếu (quyền / dữ liệu) và khoá nút Chạy', async () => {
    renderView();
    await waitFor(() => expect(taskOption('Artist').getAttribute('data-can-run')).toBe('false'));

    pick('Artist');

    const box = await screen.findByTestId('missing-conditions');
    expect(box).toHaveTextContent('Chưa thể chạy');
    expect(box).toHaveTextContent('Vai trò Writer không được chạy nhiệm vụ này');
    expect(box).toHaveTextContent('Scene chưa có layout đã Accept');
    expect(within(box).getByText('Quyền')).toBeInTheDocument();
    expect(within(box).getByText('Thiếu dữ liệu')).toBeInTheDocument();
    expect(runButton()).toBeDisabled();
  });

  it('nhiệm vụ chạy được: gửi workflowType + phiên bản nguồn, KHÔNG gửi role hay danh sách agent', async () => {
    svc.runWorkflow.mockResolvedValue({
      runId: 'run-1234567890',
      status: 'Queued',
      provider: 'Mock',
      model: 'm',
    });
    svc.getRun.mockResolvedValue(baseRun({ status: 'Completed' }));
    renderView();
    await waitFor(() => expect(taskOption('Script').getAttribute('data-can-run')).toBe('true'));

    pick('Script');
    await waitFor(() => expect(runButton()).toBeEnabled());
    fireEvent.click(runButton());

    await waitFor(() => expect(svc.runWorkflow).toHaveBeenCalledTimes(1));
    const [seriesId, body] = svc.runWorkflow.mock.calls[0];
    expect(seriesId).toBe('s1');
    expect(body).toMatchObject({
      workflowType: 'Script',
      chapterId: 'c1',
      sceneId: 'sc1',
      chapterVersion: 2,
      baseScriptRevisionId: null,
    });
    expect(Object.keys(body)).not.toEqual(expect.arrayContaining(['role', 'agents']));
  });

  it('báo cáo tiến độ tính trên cả Chapter: ẩn chọn Scene và gửi sceneId null', async () => {
    svc.getWorkflowAvailability.mockResolvedValue(availability('Producer'));
    svc.runWorkflow.mockResolvedValue({
      runId: 'run-1234567890',
      status: 'Queued',
      provider: 'Mock',
      model: 'm',
    });
    svc.getRun.mockResolvedValue(baseRun({ workflowType: 'Producer', sceneId: null }));
    renderView();
    await waitFor(() => expect(taskOption('Producer').getAttribute('data-can-run')).toBe('true'));
    expect(screen.getByText('Scene', { selector: 'label' })).toBeInTheDocument();

    pick('Producer');

    expect(screen.queryByText('Scene', { selector: 'label' })).not.toBeInTheDocument();
    expect(screen.getByText(/cả Chapter/)).toBeInTheDocument();
    await waitFor(() => expect(runButton()).toBeEnabled());
    fireEvent.click(runButton());
    await waitFor(() => expect(svc.runWorkflow).toHaveBeenCalled());
    expect(svc.runWorkflow.mock.calls[0][1]).toMatchObject({
      workflowType: 'Producer',
      sceneId: null,
      baseScriptRevisionId: null,
    });
  });

  it('Backend từ chối (403/409): hiện thông báo lý do và tải lại điều kiện chạy', async () => {
    const { AiApiError } = await import('@/services/aiAgents.service');
    svc.runWorkflow.mockRejectedValue(
      new AiApiError('Chapter đã giao việc vai trò Writer cho thành viên khác.', 'FORBIDDEN', 403),
    );
    const toast = renderView();
    await waitFor(() => expect(taskOption('Script').getAttribute('data-can-run')).toBe('true'));
    pick('Script');
    await waitFor(() => expect(runButton()).toBeEnabled());
    const before = svc.getWorkflowAvailability.mock.calls.length;

    fireEvent.click(runButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        'Không đủ quyền / điều kiện',
        expect.stringContaining('giao việc'),
      ),
    );
    await waitFor(() =>
      expect(svc.getWorkflowAvailability.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('không tải được availability: cảnh báo nhưng vẫn cho thử chạy (Backend kiểm lại)', async () => {
    const { AiApiError } = await import('@/services/aiAgents.service');
    svc.getWorkflowAvailability.mockRejectedValue(new AiApiError('lỗi mạng', 'X', 500));
    renderView();

    expect(await screen.findByText(/Không tải được điều kiện chạy/)).toBeInTheDocument();
    await waitFor(() => expect(runButton()).toBeEnabled());
  });
});

describe('AiMultiAgentView — hiển thị kết quả theo loại', () => {
  const startRun = async (run: AiRunDto, type: AiWorkflowType = 'Script') => {
    svc.runWorkflow.mockResolvedValue({
      runId: run.id,
      status: 'Queued',
      provider: 'Mock',
      model: 'm',
    });
    svc.getRun.mockResolvedValue(run);
    const toast = renderView();
    await waitFor(() => expect(taskOption(type).getAttribute('data-can-run')).toBe('true'));
    pick(type);
    await waitFor(() => expect(runButton()).toBeEnabled());
    fireEvent.click(runButton());
    await screen.findByText(/Brief của run/);
    return toast;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [{ id: 'c1', chapterNumber: 3, title: 'Tiếng mưa', scenesCount: 1 }],
    } as never);
    vi.mocked(chapterService.getChapterById).mockResolvedValue({ versionVector: 2 } as never);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({ entries: [] } as never);
    svc.getScenesByChapter.mockResolvedValue([{ id: 'sc1', chapterId: 'c1', sceneNumber: 1 }]);
    svc.getSceneRevisions.mockResolvedValue([]);
    svc.getWorkflowAvailability.mockResolvedValue(availability('Producer'));
  });

  it('báo cáo tiến độ: hiện nổi bật, ghi rõ tham khảo, KHÔNG có nút Accept/Reject', async () => {
    const run = baseRun({
      workflowType: 'Producer',
      sceneId: null,
      steps: [
        stepOf(1, 'Supervisor', decision('Producer')),
        stepOf(2, 'Producer', {
          schemaVersion: 1,
          runId: 'r',
          headline: 'Chưa đủ dữ liệu để đánh giá đầy đủ',
          summary: 'Thiếu dữ liệu assignment.',
          risks: [],
          recommendations: [],
          dataGaps: ['Chapter chưa có assignment nào.'],
          facts: [{ key: 'F1', text: 'Chương 3: InProduction' }],
        }),
        stepOf(3, 'Supervisor', decision('Finish')),
      ] as never,
    });
    await startRun(run, 'Producer');

    const section = await screen.findByTestId('report-section');
    expect(section).toHaveTextContent('Báo cáo tiến độ');
    expect(section).toHaveTextContent('tham khảo — không có Accept/Reject');
    expect(section).toHaveTextContent('Chapter chưa có assignment nào.');
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Đề xuất của AI')).not.toBeInTheDocument();
  });

  it('đề xuất rút gọn thoại: người không đúng vai trò không thấy nút; không có Accept', async () => {
    const sg: AiSuggestionDto = {
      id: 'sg1',
      runId: 'run-1234567890',
      stepId: 'st-2',
      sceneId: 'sc1',
      kind: 'Lettering',
      status: 'Pending',
      summary: 'Rút gọn 1 dòng',
      payload: {
        suggestions: [
          {
            sourceScriptLineId: 'l1',
            originalText: 'a b c d',
            suggestedText: 'a b',
            reason: 'gọn',
            maxChars: 10,
            limitSource: 'panel-estimate',
            withinEstimatedLimit: true,
          },
        ],
      },
      payloadHash: 'h1234567890',
      baseChapterVersion: 2,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '',
      decisions: [],
      decisionRoles: ['Producer', 'Writer', 'Letterer', 'Editor'],
      canDecide: false,
    };
    svc.getWorkflowAvailability.mockResolvedValue({
      ...availability('Writer'),
      workflows: availability('Writer').workflows.map((w) =>
        w.workflowType === 'Letterer' ? { ...w, canRun: true, missing: [] } : w,
      ),
    });
    await startRun(
      baseRun({
        workflowType: 'Letterer',
        suggestions: [sg],
        steps: [
          stepOf(1, 'Supervisor', decision('Letterer')),
          stepOf(2, 'Letterer', { suggestions: [], summary: 's' }),
          stepOf(3, 'Supervisor', decision('Finish')),
        ] as never,
      }),
      'Letterer',
    );

    expect(await screen.findByText('Đề xuất của AI')).toBeInTheDocument();
    expect(screen.getByTestId('no-decision-rights')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });

  it('đề xuất prompt ảnh: đúng vai trò → Accept gửi chapterVersion mới nhất rồi tải lại run', async () => {
    const sg: AiSuggestionDto = {
      id: 'sg-art',
      runId: 'run-1234567890',
      stepId: 'st-2',
      sceneId: 'sc1',
      kind: 'ImagePrompt',
      status: 'Pending',
      summary: 'Prompt 1 panel',
      payload: { panels: [] },
      payloadHash: 'h1234567890',
      baseChapterVersion: 2,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '',
      decisions: [],
      decisionRoles: ['Producer', 'Artist', 'Editor'],
      canDecide: true,
    };
    svc.review.mockResolvedValue({
      suggestionId: 'sg-art',
      status: 'Accepted',
      decisionId: 'd',
      chapterVersion: 3,
    });
    svc.getWorkflowAvailability.mockResolvedValue({
      ...availability('Artist'),
      workflows: availability('Artist').workflows.map((w) =>
        w.workflowType === 'Artist' ? { ...w, canRun: true, missing: [] } : w,
      ),
    });
    await startRun(baseRun({ workflowType: 'Artist', suggestions: [sg], steps: [] }), 'Artist');
    vi.mocked(chapterService.getChapterById).mockResolvedValue({ versionVector: 5 } as never);

    fireEvent.click(
      await screen.findByRole('button', { name: /Accept \(ghi revision prompt ảnh\)/ }),
    );

    await waitFor(() =>
      expect(svc.review).toHaveBeenCalledWith('s1', 'sg-art', 'accept', {
        reason: undefined,
        chapterVersion: 5,
      }),
    );
    await waitFor(() => expect(svc.getRun.mock.calls.length).toBeGreaterThan(1));
  });

  it('409 khi Accept: báo xung đột phiên bản và tải lại, không giả vờ thành công', async () => {
    const { AiApiError } = await import('@/services/aiAgents.service');
    const sg: AiSuggestionDto = {
      id: 'sg-1',
      runId: 'run-1234567890',
      stepId: 'st-1',
      sceneId: 'sc1',
      kind: 'Script',
      status: 'Pending',
      summary: 's',
      payload: { lines: [] },
      payloadHash: 'h1234567890',
      baseChapterVersion: 2,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '',
      decisions: [],
      decisionRoles: ['Producer', 'Writer', 'Editor'],
      canDecide: true,
    };
    svc.review.mockRejectedValue(new AiApiError('Version cũ', 'CONFLICT', 409));
    svc.getWorkflowAvailability.mockResolvedValue(availability('Writer'));
    const toast = await startRun(baseRun({ suggestions: [sg] }), 'Script');

    fireEvent.click(await screen.findByRole('button', { name: /Accept \(áp dụng script\)/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('Xung đột phiên bản (409)', 'Version cũ'),
    );
  });

  it('run cũ (BE chưa có workflowType, đề xuất chưa có canDecide) vẫn đọc và hiển thị được', async () => {
    const legacySuggestion = {
      id: 'sg-old',
      runId: 'run-1234567890',
      stepId: 'st-1',
      sceneId: 'sc1',
      kind: 'Script',
      status: 'Pending',
      summary: 'Script cũ',
      payload: { lines: [{}, {}, {}] },
      payloadHash: 'h1234567890',
      baseChapterVersion: 0,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '',
      decisions: [],
    } as AiSuggestionDto;
    const legacyRun = baseRun({
      suggestions: [legacySuggestion],
      steps: [
        {
          ...stepOf(1, 'Writer', {
            schemaVersion: 1,
            runId: 'r',
            sceneId: 's',
            round: 0,
            lines: [{ lineId: 'l1', order: 1, dialogue: 'Xin chào' }],
            bibleRevisionIds: [],
          }),
        },
        {
          ...stepOf(2, 'Continuity', {
            schemaVersion: 1,
            runId: 'r',
            round: 0,
            findings: [],
            summary: 'Sạch',
          }),
        },
      ] as never,
    });
    delete (legacyRun as Partial<AiRunDto>).workflowType;
    await startRun(legacyRun, 'FullScene');

    expect(
      await screen.findByText('Scene đầy đủ (script → storyboard → review)', {
        selector: 'span.rounded',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Từng bước (2): 2 agent chuyên môn + 0 quyết định điều phối'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept \(áp dụng script\)/ })).toBeEnabled();
  });

  it('run dừng chờ người ở workflow không có Writer: nêu lý do của Supervisor, không nói về "lượt sửa"', async () => {
    const run = baseRun({
      workflowType: 'Storyboard',
      status: 'WaitingForHuman',
      steps: [
        stepOf(1, 'Supervisor', decision('Continuity')),
        stepOf(2, 'Supervisor', { ...decision('StopForHuman'), reason: 'Không có Writer để sửa' }),
      ] as never,
    });
    svc.getWorkflowAvailability.mockResolvedValue({
      ...availability('Writer'),
      workflows: availability('Writer').workflows.map((w) =>
        w.workflowType === 'Storyboard' ? { ...w, canRun: true, missing: [] } : w,
      ),
    });
    await startRun(run, 'Storyboard');

    const banner = await screen.findByText(/Dừng chờ con người/);
    expect(banner.parentElement).toHaveTextContent('Không có Writer để sửa');
    expect(banner.parentElement).not.toHaveTextContent('lượt sửa');
  });
});

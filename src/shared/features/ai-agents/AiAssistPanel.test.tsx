import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import {
  AiApiError,
  AiRunDto,
  AiStepDto,
  AiSuggestionDto,
  AiWorkflowAvailability,
  aiAgentsService,
} from '@/services/aiAgents.service';
import { aiStreamService } from '@/services/aiStream.service';
import { toAiReadingDirection } from './aiViewUtils';
import { AiAssistPanel, BRIEF_MAX_LENGTH, POLL_INTERVAL_MS } from './AiAssistPanel';

const avail = (over: Partial<AiWorkflowAvailability> = {}): AiWorkflowAvailability => ({
  workflowType: 'Script',
  title: 'Viết script',
  description: '',
  agents: ['Writer', 'Continuity'],
  requiredRoles: ['Writer'],
  resultKinds: ['Script'],
  canRun: true,
  missing: [],
  ...over,
});

const step = (over: Partial<AiStepDto>): AiStepDto => ({
  id: crypto.randomUUID(),
  stepIndex: 1,
  agent: 'Writer',
  round: 0,
  status: 'Succeeded',
  provider: 'Mock',
  model: 'mock-model',
  promptVersion: 'writer@1',
  promptRef: 'ref',
  startedAtUtc: '',
  completedAtUtc: '',
  durationMs: 10,
  repairAttempts: 0,
  promptTokens: 11,
  completionTokens: 22,
  ...over,
});

const suggestion = (over: Partial<AiSuggestionDto> = {}): AiSuggestionDto => ({
  id: 'sg1',
  runId: 'r1',
  stepId: 'st1',
  sceneId: 'sc1',
  kind: 'Script',
  status: 'Pending',
  summary: 'Bản nháp 1 dòng',
  payload: { lines: [{}] },
  payloadHash: 'abcdef1234567890',
  baseChapterVersion: 3,
  bibleRevisionIds: [],
  hasBlockingFindings: false,
  createdAt: '',
  decisions: [],
  canDecide: true,
  canAccept: true,
  ...over,
});

const writerStep = step({
  stepIndex: 1,
  agent: 'Writer',
  output: {
    lines: [{ lineId: 'L1', order: 1, speakerId: 'an', dialogue: 'Xin chào cả nhà' }],
  },
});

const continuityStep = step({
  stepIndex: 2,
  agent: 'Continuity',
  output: {
    summary: 'Có 1 mâu thuẫn',
    findings: [
      {
        findingId: 'F1',
        severity: 'Blocking',
        category: 'Character',
        description: 'An không thể có mặt ở đây',
        scriptLineIds: ['L1'],
        evidence: [{ bibleEntryId: 'an', bibleRevisionId: 'rev12345678', quote: 'An bị giam' }],
      },
    ],
  },
});

const run = (over: Partial<AiRunDto> = {}): AiRunDto => ({
  id: 'r1',
  seriesId: 's1',
  chapterId: 'c1',
  sceneId: 'sc1',
  requestedByUserId: 'u1',
  status: 'Completed',
  provider: 'Mock',
  model: 'mock-model',
  brief: 'b',
  readingDirection: 'RightToLeft',
  revisionRounds: 0,
  maxRevisionRounds: 2,
  baseChapterVersion: 3,
  bibleRevisionIds: [],
  createdAt: '',
  lastActivityAtUtc: '',
  steps: [writerStep, continuityStep],
  suggestions: [suggestion()],
  workflowType: 'Script',
  ...over,
});

const onReload = vi.fn();
const onClose = vi.fn();

const renderPanel = (over: Partial<React.ComponentProps<typeof AiAssistPanel>> = {}) =>
  render(
    <AiAssistPanel
      seriesId='s1'
      chapterId='c1'
      sceneId='sc1'
      workflowType='Script'
      suggestionKind='Script'
      title='Trợ lý AI · Viết nháp script'
      briefLabel='Brief'
      briefPlaceholder='Nhập brief'
      runLabel='Viết nháp'
      readingDirection='RightToLeft'
      chapterVersion={3}
      nameById={{ an: 'An' }}
      onClose={onClose}
      onReload={onReload}
      {...over}
    />,
  );

const typeBrief = (text = 'Cảnh mở đầu') =>
  fireEvent.change(screen.getByLabelText('Brief'), { target: { value: text } });

describe('AiAssistPanel (Writer · Script)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    onReload.mockReset();
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'getWorkflowAvailability').mockResolvedValue({
      chapterId: 'c1',
      sceneId: 'sc1',
      workflows: [avail({ workflowType: 'FullScene' }), avail()],
    });
    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([
      { id: 'rev-old', kind: 'Script', versionNumber: 1 },
      { id: 'rev-new', kind: 'Script', versionNumber: 2 },
      { id: 'lay', kind: 'Layout', versionNumber: 9 },
    ] as never);
  });
  afterEach(() => vi.useRealTimers());

  it('đóng được bằng nút X và phím Esc; panel render ở cấp <body> để không bị header che', async () => {
    onClose.mockReset();
    renderPanel();

    const panel = await screen.findByTestId('ai-assist-panel');
    expect(panel.parentElement).toBe(document.body);

    fireEvent.click(screen.getByLabelText('Đóng Trợ lý AI'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('canRun = false: khoá nút và hiện lý do thiếu điều kiện', async () => {
    vi.mocked(aiAgentsService.getWorkflowAvailability).mockResolvedValue({
      chapterId: 'c1',
      workflows: [
        avail({
          canRun: false,
          missing: [
            { code: 'NO_ASSIGNMENT', kind: 'Permission', message: 'Bạn chưa được giao Script' },
          ],
        }),
      ],
    });
    renderPanel();

    expect(await screen.findByText('Bạn chưa được giao Script')).toBeInTheDocument();
    typeBrief();
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
  });

  it('chạy với brief, chapterVersion, readingDirection và revision Script mới nhất; polling mỗi 2 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r1', status: 'Queued', provider: 'Mock', model: 'm' });
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValueOnce(run({ status: 'Running', steps: [], suggestions: [] }))
      .mockResolvedValue(run());
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeDisabled());
    await screen.findByLabelText('Brief');
    typeBrief('Cảnh mở đầu');
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(1));
    expect(runWorkflow).toHaveBeenCalledWith('s1', {
      workflowType: 'Script',
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'Cảnh mở đầu',
      readingDirection: 'RightToLeft',
      chapterVersion: 3,
      baseScriptRevisionId: 'rev-new',
    });
    expect(await screen.findByText(/đang viết/i)).toBeInTheDocument();
    expect(getRun).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });

    expect(getRun).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Hoàn tất')).toBeInTheDocument();
    // hết Running thì không poll nữa
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });
    expect(getRun).toHaveBeenCalledTimes(2);
  });

  it('cập nhật lượt chạy qua SignalR StepRecorded và RunStatusChanged mà không dùng TokenChunk', async () => {
    expect('onTokenChunk' in aiStreamService).toBe(false);

    const joinRun = vi.spyOn(aiStreamService, 'joinRun').mockResolvedValue(undefined);
    const leaveRun = vi.spyOn(aiStreamService, 'leaveRun').mockResolvedValue(undefined);
    let stepListener: ((e: any) => void | Promise<void>) | undefined;
    let statusListener: ((e: any) => void | Promise<void>) | undefined;
    const unsubStep = vi.fn();
    const unsubStatus = vi.fn();

    vi.spyOn(aiStreamService, 'onStepRecorded').mockImplementation((cb) => {
      stepListener = cb;
      return unsubStep;
    });
    vi.spyOn(aiStreamService, 'onRunStatusChanged').mockImplementation((cb) => {
      statusListener = cb;
      return unsubStatus;
    });

    sessionStorage.setItem('ai-run:sc1:Script', 'r1');
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValueOnce(run({ id: 'r1', status: 'Running', steps: [], suggestions: [] }))
      .mockResolvedValueOnce(
        run({ id: 'r1', status: 'Running', steps: [writerStep], suggestions: [] }),
      )
      .mockResolvedValue(run({ id: 'r1', status: 'Completed' }));

    renderPanel();

    await waitFor(() => expect(joinRun).toHaveBeenCalledWith('r1'));
    expect(screen.queryByTestId('ai-live-stream')).not.toBeInTheDocument();

    await act(async () => {
      await stepListener?.({
        runId: 'R1',
        stepIndex: 1,
        agent: 'Writer',
        round: 0,
        succeeded: true,
        runStatus: 'Running',
      });
    });

    expect(await screen.findByTestId('ai-draft')).toBeInTheDocument();

    await act(async () => {
      await statusListener?.({
        runId: 'R1',
        status: 'Completed',
      });
    });

    expect(await screen.findByText('Hoàn tất')).toBeInTheDocument();
    expect(getRun).toHaveBeenCalledTimes(3);
    expect(leaveRun).toHaveBeenCalledWith('r1');
    expect(unsubStep).toHaveBeenCalledTimes(1);
    expect(unsubStatus).toHaveBeenCalledTimes(1);
  });

  it('baseScriptRevisionId = null khi Scene chưa có revision Script', async () => {
    vi.mocked(aiAgentsService.getSceneRevisions).mockResolvedValue([]);
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r1', status: 'Completed', provider: 'Mock', model: 'm' });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalled());
    expect(runWorkflow.mock.calls[0][1].baseScriptRevisionId).toBeNull();
  });

  it('hiện bản nháp, lỗi nhất quán kèm bằng chứng; Accept bị khoá khi còn lỗi chặn', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({
        status: 'WaitingForHuman',
        suggestions: [suggestion({ hasBlockingFindings: true })],
      }),
    );
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(
      await screen.findByText('AI đã dừng: còn lỗi nhất quán cần bạn xử lý'),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('ai-draft')).getByText(/Xin chào cả nhà/)).toBeInTheDocument();
    expect(screen.getByText('An không thể có mặt ở đây')).toBeInTheDocument();
    expect(screen.getByText(/An bị giam/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.queryByText(/Supervisor|Multi-Agent|demo/i)).not.toBeInTheDocument();
  });

  it('Accept gửi chapterVersion hiện tại rồi tải lại script + versionVector', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    const review = vi.spyOn(aiAgentsService, 'review').mockResolvedValue({
      suggestionId: 'sg1',
      status: 'Accepted',
      decisionId: 'd1',
      chapterVersion: 4,
    });
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    fireEvent.click(await screen.findByRole('button', { name: /Accept/ }));

    await waitFor(() =>
      expect(review).toHaveBeenCalledWith('s1', 'sg1', 'accept', {
        reason: undefined,
        chapterVersion: 3,
      }),
    );
    await waitFor(() => expect(onReload).toHaveBeenCalledWith('Script'));
  });

  it('Accept đề xuất LineRewrite truyền kind LineRewrite vào onReload và phát sự kiện đồng bộ working copy', async () => {
    const lrSuggestion = suggestion({
      id: 'sg-lr-1',
      kind: 'LineRewrite',
      payload: {
        schemaVersion: 1,
        runId: 'r1',
        sceneId: 'sc1',
        task: 'writer.rewrite',
        sourceScriptLineId: 'l1',
        originalText: 'Cũ',
        suggestedText: 'Mới',
        reason: 'Gọn hơn',
      },
    });
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([lrSuggestion]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({ suggestions: [lrSuggestion], workflowType: 'Copilot' }),
    );
    vi.spyOn(aiAgentsService, 'review').mockResolvedValue({
      suggestionId: 'sg-lr-1',
      status: 'Accepted',
      decisionId: 'd-lr',
      chapterVersion: 4,
    });
    const eventSpy = vi.fn();
    window.addEventListener('panelforge:script-working-copy-changed', eventSpy);

    try {
      renderPanel({ workflowType: 'Copilot', suggestionKind: 'LineRewrite' });
      fireEvent.click(await screen.findByRole('button', { name: /Accept/ }));

      await waitFor(() => expect(onReload).toHaveBeenCalledWith('LineRewrite'));
      expect(eventSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('panelforge:script-working-copy-changed', eventSpy);
    }
  });

  it('canDecide = false (hoặc thiếu): không có nút Accept/Reject/Yêu cầu sửa', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    const noFlag = suggestion();
    delete noFlag.canDecide;
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run({ suggestions: [noFlag] }));
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await screen.findByTestId('ai-suggestions');
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yêu cầu sửa' })).not.toBeInTheDocument();
  });

  it('canDecide = true nhưng canAccept = false (hoặc thiếu): ẩn Accept, giữ Reject và Yêu cầu sửa', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({ suggestions: [suggestion({ canDecide: true, canAccept: false })] }),
    );
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await screen.findByTestId('ai-suggestions');
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa' })).toBeEnabled();
  });

  it('Yêu cầu sửa bắt buộc có lý do và gửi reason', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    const review = vi.spyOn(aiAgentsService, 'review').mockResolvedValue({
      suggestionId: 'sg1',
      status: 'ChangesRequested',
      decisionId: 'd1',
      chapterVersion: 3,
    });
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu sửa' }));
    const confirm = screen.getByRole('button', { name: /Xác nhận Yêu cầu sửa/ });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Lý do yêu cầu sửa/), {
      target: { value: 'Sai giọng nhân vật' },
    });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(review).toHaveBeenCalledWith('s1', 'sg1', 'request-changes', {
        reason: 'Sai giọng nhân vật',
        chapterVersion: 3,
      }),
    );
    expect(onReload).not.toHaveBeenCalled();
  });

  it('ChangesRequested: hiện nút "Chạy lại theo góp ý", truyền revisionOfSuggestionId và dùng reason khi brief trống', async () => {
    const changesSuggestion = suggestion({
      id: 'sg-cr',
      status: 'ChangesRequested',
      createdAt: '2026-10-12T10:00:00Z',
      decisions: [
        {
          id: 'd-old',
          decision: 'ChangesRequested',
          reason: 'Góp ý cũ',
          decidedByUserId: 'u1',
          createdAt: '2026-10-12T09:00:00Z',
        } as never,
        {
          id: 'd-latest',
          decision: 'ChangesRequested',
          reason: 'Sửa lại nhịp thoại cảnh này',
          decidedByUserId: 'u1',
          createdAt: '2026-10-12T10:05:00Z',
        } as never,
      ],
    });
    sessionStorage.setItem('ai-run:sc1:Script', 'r1');
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValue(run({ id: 'r1', suggestions: [changesSuggestion] }));
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r2', status: 'Completed', provider: 'Mock', model: 'm' });

    renderPanel();

    const rerunBtn = await screen.findByRole('button', { name: 'Chạy lại theo góp ý' });
    expect(rerunBtn).toBeEnabled();

    // Khi brief trống -> dùng reason của quyết định ChangesRequested gần nhất
    fireEvent.click(rerunBtn);
    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(1));
    expect(runWorkflow).toHaveBeenLastCalledWith('s1', {
      workflowType: 'Script',
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'Sửa lại nhịp thoại cảnh này',
      readingDirection: 'RightToLeft',
      chapterVersion: 3,
      baseScriptRevisionId: 'rev-new',
      revisionOfSuggestionId: 'sg-cr',
    });

    // Khi có nhập brief -> ưu tiên dùng brief đang nhập
    getRun.mockResolvedValue(run({ id: 'r2', suggestions: [changesSuggestion] }));
    typeBrief('Brief viết mới');
    fireEvent.click(await screen.findByRole('button', { name: 'Chạy lại theo góp ý' }));
    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(2));
    expect(runWorkflow).toHaveBeenLastCalledWith('s1', {
      workflowType: 'Script',
      chapterId: 'c1',
      sceneId: 'sc1',
      brief: 'Brief viết mới',
      readingDirection: 'RightToLeft',
      chapterVersion: 3,
      baseScriptRevisionId: 'rev-new',
      revisionOfSuggestionId: 'sg-cr',
    });
  });

  it('503 AI_UNAVAILABLE: khoá nút AI, báo vẫn soạn tay được', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockRejectedValue(
      new AiApiError('AI service đang tắt.', 'AI_UNAVAILABLE', 503),
    );
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(await screen.findByText(/vẫn có thể soạn tay/)).toBeInTheDocument();
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
  });

  it('429 AI_QUOTA_EXCEEDED: báo hết hạn mức, không khoá hẳn', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockRejectedValue(
      new AiApiError('quota', 'AI_QUOTA_EXCEEDED', 429),
    );
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(await screen.findByText(/hết hạn mức/)).toBeInTheDocument();
    expect(screen.getByTestId('ai-run-btn')).toBeEnabled();
  });

  it('409 CONFLICT: hiển thị đúng câu lỗi của Backend, tải lại dữ liệu, KHÔNG tự gửi lại', async () => {
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockRejectedValue(
        new AiApiError(
          'Kịch bản đang đóng băng (Frozen), không thể chạy workflow Script.',
          'CONFLICT',
          409,
        ),
      );
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(
      await screen.findByText('Kịch bản đang đóng băng (Frozen), không thể chạy workflow Script.'),
    ).toBeInTheDocument();
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(runWorkflow).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-run-btn')).toBeEnabled();
  });

  it('Accept bị chặn 403 / 409: hiển thị đúng thông báo từ Backend', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([suggestion()]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    const review = vi
      .spyOn(aiAgentsService, 'review')
      .mockRejectedValueOnce(
        new AiApiError(
          'Chỉ Writer mới được áp dụng đề xuất Script; bạn có thể từ chối hoặc yêu cầu sửa.',
          'FORBIDDEN',
          403,
        ),
      )
      .mockRejectedValueOnce(
        new AiApiError(
          'Scene có dòng đã gắn Panel, không thể thay cả script bằng đề xuất AI.',
          'CONFLICT',
          409,
        ),
      );

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Accept/ }));

    expect(
      await screen.findByText(
        'Chỉ Writer mới được áp dụng đề xuất Script; bạn có thể từ chối hoặc yêu cầu sửa.',
      ),
    ).toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Accept/ }));
    expect(
      await screen.findByText(
        'Scene có dòng đã gắn Panel, không thể thay cả script bằng đề xuất AI.',
      ),
    ).toBeInTheDocument();
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(review).toHaveBeenCalledTimes(2);
  });

  it('Reject bị chặn 403 khi ngoài phạm vi được giao (canDecide = true, canAccept = false): hiện đúng message Backend, giữ đề xuất Pending và không tự gửi lại', async () => {
    const outOfScopeSug = suggestion({ canDecide: true, canAccept: false, status: 'Pending' });
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([outOfScopeSug]);
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValue(run({ suggestions: [outOfScopeSug] }));
    const runWorkflow = vi.spyOn(aiAgentsService, 'runWorkflow');
    const review = vi
      .spyOn(aiAgentsService, 'review')
      .mockRejectedValueOnce(
        new AiApiError(
          'Chapter đã giao việc cho Writer khác; bạn không thể từ chối đề xuất này.',
          'FORBIDDEN',
          403,
        ),
      )
      .mockRejectedValueOnce({
        message: 'Request failed with status code 403',
        response: {
          status: 403,
          data: {
            code: 'FORBIDDEN',
            error: 'Bạn không thuộc phạm vi phân công của chương này.',
          },
        },
      });

    renderPanel();

    expect(await screen.findByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(getRun).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận Reject/ }));

    expect(await screen.findByTestId('ai-error')).toHaveTextContent(
      'Chapter đã giao việc cho Writer khác; bạn không thể từ chối đề xuất này.',
    );
    expect(screen.getByText('Chờ quyết định')).toBeInTheDocument();
    expect(screen.getByTestId('ai-pending-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(review).toHaveBeenCalledTimes(1);
    expect(getRun).toHaveBeenCalledTimes(1);
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận Reject/ }));

    expect(await screen.findByTestId('ai-error')).toHaveTextContent(
      'Bạn không thuộc phạm vi phân công của chương này.',
    );
    expect(screen.getByText('Chờ quyết định')).toBeInTheDocument();
    expect(review).toHaveBeenCalledTimes(2);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('Yêu cầu sửa bị chặn 403 khi ngoài phạm vi được giao: hiện đúng message Backend, giữ đề xuất Pending và không tự gửi lại', async () => {
    const outOfScopeSug = suggestion({ canDecide: true, canAccept: false, status: 'Pending' });
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([outOfScopeSug]);
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValue(run({ suggestions: [outOfScopeSug] }));
    const runWorkflow = vi.spyOn(aiAgentsService, 'runWorkflow');
    const review = vi
      .spyOn(aiAgentsService, 'review')
      .mockRejectedValueOnce(
        new AiApiError(
          'Bạn chỉ được yêu cầu sửa đề xuất trong phạm vi công việc được giao.',
          'FORBIDDEN',
          403,
        ),
      )
      .mockRejectedValueOnce(new AiApiError('   ', 'FORBIDDEN', 403));

    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu sửa' }));
    fireEvent.change(screen.getByPlaceholderText(/Lý do yêu cầu sửa/), {
      target: { value: 'Đổi nhịp thoại cảnh mở đầu' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận Yêu cầu sửa/ }));

    expect(await screen.findByTestId('ai-error')).toHaveTextContent(
      'Bạn chỉ được yêu cầu sửa đề xuất trong phạm vi công việc được giao.',
    );
    expect(screen.getByText('Chờ quyết định')).toBeInTheDocument();
    expect(screen.getByTestId('ai-pending-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-rerun-changes-btn')).not.toBeInTheDocument();
    expect(review).toHaveBeenCalledTimes(1);
    expect(getRun).toHaveBeenCalledTimes(1);
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu sửa' }));
    fireEvent.change(screen.getByPlaceholderText(/Lý do yêu cầu sửa/), {
      target: { value: 'Thử lại lần nữa' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận Yêu cầu sửa/ }));

    expect(await screen.findByTestId('ai-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.',
    );
    expect(screen.getByText('Chờ quyết định')).toBeInTheDocument();
    expect(review).toHaveBeenCalledTimes(2);
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('availability trả SCRIPT_FROZEN và SCENE_LINES_LINKED: khoá nút chạy và hiện lý do', async () => {
    vi.mocked(aiAgentsService.getWorkflowAvailability).mockResolvedValue({
      chapterId: 'c1',
      sceneId: 'sc1',
      workflows: [
        avail({
          canRun: false,
          missing: [
            {
              code: 'SCRIPT_FROZEN',
              kind: 'State',
              message: 'Kịch bản của chương đã đóng băng.',
            },
            {
              code: 'SCENE_LINES_LINKED',
              kind: 'State',
              message:
                'Scene có dòng đã gắn Panel; thay cả script bằng AI sẽ làm mất liên kết này.',
            },
          ],
        }),
      ],
    });

    renderPanel();
    expect(await screen.findByText('Kịch bản của chương đã đóng băng.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Scene có dòng đã gắn Panel; thay cả script bằng AI sẽ làm mất liên kết này.',
      ),
    ).toBeInTheDocument();
    typeBrief();
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
  });

  it('brief tối đa 4000 ký tự và bắt buộc không rỗng', async () => {
    renderPanel();
    const box = await screen.findByLabelText('Brief');

    expect(box).toHaveAttribute('maxlength', '4000');
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
    typeBrief('   ');
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
  });

  it('chi tiết kỹ thuật (provider, token) ẩn mặc định, mở được khi cần', async () => {
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await screen.findByText('Chi tiết kỹ thuật');
    expect(screen.queryByTestId('ai-tech-details')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Chi tiết kỹ thuật'));

    expect(screen.getByTestId('ai-tech-details')).toHaveTextContent('token 11/22');
  });
});

describe('AiAssistPanel · mở lại panel thấy lại lượt chạy / đề xuất chưa duyệt', () => {
  const KEY = 'ai-run:sc1:Script';

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    onReload.mockReset();
    vi.spyOn(aiAgentsService, 'getWorkflowAvailability').mockResolvedValue({
      chapterId: 'c1',
      sceneId: 'sc1',
      workflows: [avail()],
    });
    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('(1) có đề xuất Pending của đúng Scene + kind: lấy cái mới nhất, hiện bản nháp, đối chiếu Bible và thẻ đề xuất', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([
      suggestion({ id: 'old', runId: 'r-old', createdAt: '2026-10-12T08:00:00Z' }),
      suggestion({ id: 'new', runId: 'r-new', createdAt: '2026-10-12T09:00:00Z' }),
      suggestion({
        id: 'other-scene',
        runId: 'r-x',
        sceneId: 'sc2',
        createdAt: '2026-10-12T10:00:00Z',
      }),
      suggestion({
        id: 'other-kind',
        runId: 'r-y',
        kind: 'Layout',
        createdAt: '2026-10-12T11:00:00Z',
      }),
    ]);
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValue(run({ id: 'r-new', suggestions: [suggestion({ id: 'new' })] }));

    renderPanel();

    expect(await screen.findByTestId('ai-draft')).toBeInTheDocument();
    expect(aiAgentsService.getSuggestions).toHaveBeenCalledWith('s1', { status: 'Pending' });
    expect(getRun).toHaveBeenCalledTimes(1);
    expect(getRun).toHaveBeenCalledWith('s1', 'r-new');
    expect(screen.getByTestId('ai-continuity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa' })).toBeInTheDocument();
  });

  it('(1) thẻ đề xuất khôi phục vẫn theo canDecide: false thì không có nút quyết định', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([suggestion({ runId: 'r1' })]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({ suggestions: [suggestion({ canDecide: false })] }),
    );

    renderPanel();

    await screen.findByTestId('ai-suggestions');
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });

  it('(1) không có đề xuất Pending: không gọi GET run, không có banner', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([suggestion({ sceneId: 'sc2' })]);
    const getRun = vi.spyOn(aiAgentsService, 'getRun');

    renderPanel();

    await waitFor(() => expect(aiAgentsService.getSuggestions).toHaveBeenCalled());
    await screen.findByLabelText('Brief');
    expect(getRun).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ai-pending-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-draft')).not.toBeInTheDocument();
  });

  it('(3) có đề xuất chưa duyệt: hiện banner phía trên ô brief và KHÔNG khoá nút chạy', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([suggestion()]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());

    renderPanel();

    const banner = await screen.findByTestId('ai-pending-banner');
    expect(banner).toHaveTextContent('Có đề xuất chưa duyệt');
    const brief = screen.getByLabelText('Brief');
    expect(banner.compareDocumentPosition(brief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
  });

  it('(2) POST run xong lưu runId theo sceneId + workflowType', async () => {
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Queued',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await screen.findByTestId('ai-draft');
    // run còn đề xuất Pending → giữ khoá
    expect(sessionStorage.getItem(KEY)).toBe('r1');
  });

  it('(2) mở panel có khoá + run còn Running: GET run rồi polling tiếp tới khi kết thúc', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem(KEY, 'r1');
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    const getRun = vi
      .spyOn(aiAgentsService, 'getRun')
      .mockResolvedValueOnce(run({ status: 'Running', steps: [], suggestions: [] }))
      .mockResolvedValue(run());

    renderPanel();

    expect(await screen.findByText(/đang viết/i)).toBeInTheDocument();
    expect(getRun).toHaveBeenCalledWith('s1', 'r1');
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(await screen.findByText('Hoàn tất')).toBeInTheDocument();
    expect(screen.getByTestId('ai-draft')).toBeInTheDocument();
  });

  it('(2) run kết thúc mà không còn đề xuất Pending: xoá khoá', async () => {
    sessionStorage.setItem(KEY, 'r1');
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({
        status: 'Failed',
        errorMessage: 'hỏng',
        suggestions: [suggestion({ status: 'Accepted' })],
      }),
    );

    renderPanel();

    await screen.findByTestId('ai-status');
    await waitFor(() => expect(sessionStorage.getItem(KEY)).toBeNull());
  });

  it('(2) run còn đề xuất Pending: giữ khoá', async () => {
    sessionStorage.setItem(KEY, 'r1');
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());

    renderPanel();

    await screen.findByTestId('ai-suggestions');
    expect(sessionStorage.getItem(KEY)).toBe('r1');
  });

  it('(4) GET run 404 / 403 cho runId đã lưu: xoá khoá, không báo lỗi', async () => {
    for (const status of [404, 403]) {
      sessionStorage.setItem(KEY, 'gone');
      vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
      vi.spyOn(aiAgentsService, 'getRun').mockRejectedValue(
        new AiApiError('không có', status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', status),
      );

      const { unmount } = renderPanel();

      await waitFor(() => expect(sessionStorage.getItem(KEY)).toBeNull());
      await screen.findByLabelText('Brief');
      expect(screen.queryByTestId('ai-error')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('sessionStorage bị chặn (ném lỗi): panel vẫn chạy bình thường', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r1',
      status: 'Completed',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());
    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief();
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(await screen.findByTestId('ai-draft')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-error')).not.toBeInTheDocument();
  });
});

describe('AiAssistPanel (Storyboard & Layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(aiAgentsService, 'getWorkflowAvailability').mockResolvedValue({
      chapterId: 'c1',
      yourRole: 'Writer',
      workflows: [
        {
          workflowType: 'Storyboard',
          title: 'Storyboard từ script có sẵn',
          description: 'Phân khung script',
          agents: ['Storyboard', 'Editor'],
          requiredRoles: ['Producer', 'Writer', 'Artist'],
          resultKinds: ['Layout'],
          canRun: true,
          missing: [],
        },
      ],
    });
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
  });

  it('hiển thị cảnh báo và khoá Accept khi hasPanels = true trong workflow Storyboard', async () => {
    const layoutPayload = {
      schemaVersion: 1,
      runId: 'r-storyboard-1',
      sceneId: 'sc1',
      readingDirection: 'RightToLeft' as const,
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              readingOrder: 1,
              bbox: {
                x: 0.05,
                y: 0.05,
                w: 0.9,
                h: 0.3,
                coordinateSpace: 'PageNormalized' as const,
              },
              sourceScriptLineIds: ['line-1'],
            },
          ],
        },
      ],
    };

    const layoutSuggestion = suggestion({
      id: 'sug-layout-1',
      kind: 'Layout',
      summary: '1 trang · 1 panel',
      payload: layoutPayload,
      canDecide: true,
    });

    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([layoutSuggestion]);
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({
        id: 'r-storyboard-1',
        workflowType: 'Storyboard',
        brief: 'Phân khung cảnh 1',
        steps: [
          step({
            stepIndex: 1,
            agent: 'Storyboard',
            output: layoutPayload,
          }),
        ],
        suggestions: [layoutSuggestion],
      }),
    );

    render(
      <AiAssistPanel
        seriesId='s1'
        chapterId='c1'
        sceneId='sc1'
        workflowType='Storyboard'
        suggestionKind='Layout'
        title='Trợ lý AI · Phân khung Storyboard'
        briefLabel='Brief'
        briefPlaceholder='Nhập brief'
        runLabel='Phân khung'
        readingDirection='RightToLeft'
        chapterVersion={3}
        nameById={{ an: 'An' }}
        hasPanels={true}
        onClose={onClose}
        onReload={onReload}
      />,
    );

    expect(await screen.findByTestId('ai-storyboard-has-panels-banner')).toBeInTheDocument();
    expect(screen.getByText('Phân cảnh này đã có khung tranh')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /Accept \(tạo Page\/Panel\)/ });
    expect(acceptBtn).toBeDisabled();
    expect(screen.getByText(/Scene đã có Panel; không thể áp dụng layout AI/)).toBeInTheDocument();

    expect(screen.getByTestId('ai-storyboard')).toBeInTheDocument();
  });

  it('chuẩn hoá đúng readingDirection theo enum Backend (RightToLeft=0, LeftToRight=1, Vertical=2) và gửi đúng khi chạy workflow', async () => {
    expect(toAiReadingDirection(0)).toBe('RightToLeft');
    expect(toAiReadingDirection('0')).toBe('RightToLeft');
    expect(toAiReadingDirection('RightToLeft')).toBe('RightToLeft');
    expect(toAiReadingDirection(1)).toBe('LeftToRight');
    expect(toAiReadingDirection('1')).toBe('LeftToRight');
    expect(toAiReadingDirection('LeftToRight')).toBe('LeftToRight');
    expect(toAiReadingDirection(2)).toBe('Vertical');
    expect(toAiReadingDirection('2')).toBe('Vertical');
    expect(toAiReadingDirection('Vertical')).toBe('Vertical');
    expect(toAiReadingDirection(null)).toBe('LeftToRight');
    expect(toAiReadingDirection(undefined)).toBe('LeftToRight');
    expect(toAiReadingDirection('Unknown')).toBe('LeftToRight');
    expect(toAiReadingDirection(99)).toBe('LeftToRight');

    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([]);
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r-vert', status: 'Completed', provider: 'Mock', model: 'm' });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(
      run({ id: 'r-vert', workflowType: 'Storyboard', suggestions: [] }),
    );

    const first = render(
      <AiAssistPanel
        seriesId='s1'
        chapterId='c1'
        sceneId='sc1'
        workflowType='Storyboard'
        suggestionKind='Layout'
        title='Trợ lý AI · Phân khung Storyboard'
        briefLabel='Brief'
        briefPlaceholder='Nhập brief'
        runLabel='Phân khung'
        readingDirection='Vertical'
        chapterVersion={3}
        nameById={{ an: 'An' }}
        onClose={onClose}
        onReload={onReload}
      />,
    );

    await screen.findByLabelText('Brief');
    typeBrief('Phân khung cuộn dọc Webtoon');
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(1));
    expect(runWorkflow).toHaveBeenNthCalledWith(
      1,
      's1',
      expect.objectContaining({
        workflowType: 'Storyboard',
        readingDirection: 'Vertical',
      }),
    );

    first.unmount();

    render(
      <AiAssistPanel
        seriesId='s1'
        chapterId='c1'
        sceneId='sc1'
        workflowType='Storyboard'
        suggestionKind='Layout'
        title='Trợ lý AI · Phân khung Storyboard'
        briefLabel='Brief'
        briefPlaceholder='Nhập brief'
        runLabel='Phân khung'
        readingDirection={2}
        chapterVersion={3}
        nameById={{ an: 'An' }}
        onClose={onClose}
        onReload={onReload}
      />,
    );

    await screen.findByLabelText('Brief');
    typeBrief('Phân khung từ enum số 2');
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(2));
    expect(runWorkflow).toHaveBeenNthCalledWith(
      2,
      's1',
      expect.objectContaining({
        workflowType: 'Storyboard',
        readingDirection: 'Vertical',
      }),
    );
  });
});

describe('AiAssistPanel · nâng cấp Script Writer (nhóm 1 & 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    onReload.mockReset();
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([]);
    vi.spyOn(aiAgentsService, 'getWorkflowAvailability').mockResolvedValue({
      chapterId: 'c1',
      sceneId: 'sc1',
      workflows: [avail()],
    });
    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it('hiện đúng phân cảnh, nút mở danh sách phân cảnh, khối AI sẽ dựa trên và cảnh báo thay N dòng', async () => {
    const onOpenScenes = vi.fn();
    const onOpenNarrative = vi.fn();
    const onOpenBible = vi.fn();

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 2 · Giao lộ mưa',
        sceneSummary: 'An chạm mặt Kiên dưới ánh đèn neon',
        onOpenScenes,
        hasStoryArc: true,
        hasChapterOutline: false,
        chapterOutline: '',
        bibleEntryCount: 0,
        sceneLineCount: 6,
        linkedPanelLineCount: 0,
        bibleCharacters: [{ id: 'an', name: 'An' }],
        onOpenNarrative,
        onOpenBible,
      },
    });

    const sceneHeader = await screen.findByTestId('ai-script-scene-header');
    expect(sceneHeader).toHaveTextContent('Đang viết cho: Cảnh 2 · Giao lộ mưa');
    expect(sceneHeader).toHaveTextContent('An chạm mặt Kiên dưới ánh đèn neon');

    fireEvent.click(screen.getByTestId('ai-open-scenes-btn'));
    expect(onOpenScenes).toHaveBeenCalledTimes(1);

    const ctx = screen.getByTestId('ai-script-context');
    expect(ctx).toHaveTextContent('Story arc Series');
    expect(ctx).toHaveTextContent('Đã có');
    expect(ctx).toHaveTextContent('Đề cương chương');
    expect(ctx).toHaveTextContent('Thiếu');
    expect(ctx).toHaveTextContent('6 dòng');

    fireEvent.click(within(ctx).getByRole('button', { name: 'Mở Đề cương' }));
    expect(onOpenNarrative).toHaveBeenCalledWith('outline');

    fireEvent.click(within(ctx).getByRole('button', { name: 'Mở Bible' }));
    expect(onOpenBible).toHaveBeenCalledTimes(1);

    const replaceWarning = screen.getByTestId('ai-script-replace-warning');
    expect(replaceWarning).toHaveTextContent('Accept sẽ thay 6 dòng hiện tại');
    expect(screen.queryByTestId('ai-script-linked-panels-warning')).not.toBeInTheDocument();
  });

  it('có dòng đã gắn Panel (linkedPanelLineCount > 0): báo rõ không thể Accept và tắt nút Viết nháp', async () => {
    const runWorkflow = vi.spyOn(aiAgentsService, 'runWorkflow');

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 3 · Kho hàng',
        sceneLineCount: 5,
        linkedPanelLineCount: 2,
      },
    });

    const linkedBanner = await screen.findByTestId('ai-script-linked-panels-warning');
    expect(linkedBanner).toHaveTextContent('2 dòng đã gắn Panel');
    expect(linkedBanner).toHaveTextContent('không thể Accept');
    expect(screen.queryByTestId('ai-script-replace-warning')).not.toBeInTheDocument();

    typeBrief('Viết lại cảnh kho hàng');
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('ai-run-btn'));
    expect(runWorkflow).not.toHaveBeenCalled();
  });

  it('ghép các trường tuỳ chọn + brief tự do đúng nhãn khi gửi đi và tôn trọng giới hạn BRIEF_MAX_LENGTH', async () => {
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r1', status: 'Completed', provider: 'Mock', model: 'm' });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run());

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 1 · Mở màn',
        bibleCharacters: [
          { id: 'an', name: 'An' },
          { id: 'kien', name: 'Kiên' },
        ],
      },
    });

    await screen.findByLabelText('Brief');
    fireEvent.click(screen.getByTestId('ai-script-options-toggle'));

    fireEvent.change(screen.getByLabelText('Mục tiêu phân cảnh'), {
      target: { value: 'Hé lộ manh mối mật mã' },
    });
    fireEvent.change(screen.getByLabelText('Giọng điệu'), {
      target: { value: 'Căng thẳng' },
    });
    fireEvent.change(screen.getByLabelText('Độ dài mong muốn'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByLabelText('An'));
    fireEvent.click(screen.getByLabelText('Kiên'));
    fireEvent.change(screen.getByLabelText('Điều bắt buộc có'), {
      target: { value: 'Tiếng còi tàu vang lên' },
    });
    fireEvent.change(screen.getByLabelText('Điều cần tránh'), {
      target: { value: 'Không lộ danh tính kẻ phản bội' },
    });
    typeBrief('Cảnh kết thúc bằng cú nhìn nghi ngờ');

    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalledTimes(1));
    const sentBrief = runWorkflow.mock.calls[0][1].brief;
    expect(sentBrief).toContain('Mục tiêu phân cảnh: Hé lộ manh mối mật mã');
    expect(sentBrief).toContain('Giọng điệu: Căng thẳng');
    expect(sentBrief).toContain('Độ dài mong muốn: Ngắn (4–6 dòng)');
    expect(sentBrief).toContain('Nhân vật xuất hiện (từ Bible): An, Kiên');
    expect(sentBrief).toContain('Điều bắt buộc có: Tiếng còi tàu vang lên');
    expect(sentBrief).toContain('Điều cần tránh: Không lộ danh tính kẻ phản bội');
    expect(sentBrief).toContain('Ghi chú thêm: Cảnh kết thúc bằng cú nhìn nghi ngờ');
    expect(screen.getByTestId('ai-brief-counter')).toHaveTextContent(
      `${sentBrief.length}/${BRIEF_MAX_LENGTH}`,
    );

    // Vượt BRIEF_MAX_LENGTH khi cộng chuỗi cuối -> báo lỗi và tắt nút chạy
    typeBrief('a'.repeat(BRIEF_MAX_LENGTH - 10));
    expect(screen.getByTestId('ai-brief-overflow')).toBeInTheDocument();
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('ai-run-btn'));
    expect(runWorkflow).toHaveBeenCalledTimes(1);
  });

  it('Điền từ đề cương hỏi xác nhận khi brief đã có chữ; chọn mẫu chỉ điền form; không mất brief khi lỗi AI_INVALID_OUTPUT và bỏ qua Enter khi isComposing', async () => {
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockRejectedValue(
        new AiApiError('AI chưa tạo được kết quả hợp lệ. Hãy thử lại.', 'AI_INVALID_OUTPUT', 502),
      );

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 1',
        chapterOutline: 'Đề cương chương: An tìm thấy chiếc chìa khoá cũ.',
      },
    });

    const briefInput = (await screen.findByLabelText('Brief')) as HTMLTextAreaElement;

    // Brief rỗng -> điền trực tiếp từ đề cương
    fireEvent.click(screen.getByTestId('ai-fill-outline-btn'));
    expect(briefInput.value).toBe('Đề cương chương: An tìm thấy chiếc chìa khoá cũ.');

    // Brief đã có nội dung -> hỏi xác nhận trước khi ghi đè
    typeBrief('Nội dung đã gõ tay');
    fireEvent.click(screen.getByTestId('ai-fill-outline-btn'));
    expect(screen.getByTestId('ai-confirm-overwrite')).toBeInTheDocument();
    expect(briefInput.value).toBe('Nội dung đã gõ tay');

    // Bấm Huỷ -> giữ nguyên nội dung cũ
    fireEvent.click(screen.getByTestId('ai-confirm-overwrite-cancel'));
    expect(screen.queryByTestId('ai-confirm-overwrite')).not.toBeInTheDocument();
    expect(briefInput.value).toBe('Nội dung đã gõ tay');

    // Bấm Ghi đè -> thay bằng đề cương
    fireEvent.click(screen.getByTestId('ai-fill-outline-btn'));
    fireEvent.click(screen.getByTestId('ai-confirm-overwrite-yes'));
    expect(briefInput.value).toBe('Đề cương chương: An tìm thấy chiếc chìa khoá cũ.');

    // Chọn mẫu brief ngắn -> chỉ điền vào form, không chạy AI
    fireEvent.click(screen.getByTestId('ai-template-action'));
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(briefInput.value).toContain('SFX');

    // Ctrl+Enter khi đang gõ IME (isComposing = true) phải bị bỏ qua
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    briefInput.dispatchEvent(composingEvent);
    expect(runWorkflow).not.toHaveBeenCalled();

    // Khi lỗi AI_INVALID_OUTPUT: hiện đúng thông báo lỗi Backend và không làm mất brief
    const savedBrief = briefInput.value;
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-run-btn'));

    expect(await screen.findByTestId('ai-error')).toHaveTextContent(
      'AI chưa tạo được kết quả hợp lệ. Hãy thử lại.',
    );
    expect(briefInput.value).toBe(savedBrief);
  });

  it('hiện tiến trình 3 bước từ steps hiện có khi đang chạy (Đang viết → Đang đối chiếu Bible → Sẵn sàng duyệt)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(aiAgentsService, 'runWorkflow').mockResolvedValue({
      runId: 'r-prog',
      status: 'Running',
      provider: 'Mock',
      model: 'm',
    });
    vi.spyOn(aiAgentsService, 'getRun')
      .mockResolvedValueOnce(run({ id: 'r-prog', status: 'Running', steps: [], suggestions: [] }))
      .mockResolvedValueOnce(
        run({ id: 'r-prog', status: 'Running', steps: [writerStep], suggestions: [] }),
      )
      .mockResolvedValue(run({ id: 'r-prog', status: 'Completed' }));

    renderPanel();
    await screen.findByLabelText('Brief');
    typeBrief('Cảnh tiến trình');
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-run-btn'));

    // Chưa có step Writer -> Đang viết active
    const progress1 = await screen.findByTestId('ai-script-progress');
    expect(progress1.querySelector('[data-stage="writing"]')).toHaveAttribute(
      'data-stage-state',
      'active',
    );
    expect(progress1.querySelector('[data-stage="checkingBible"]')).toHaveAttribute(
      'data-stage-state',
      'pending',
    );

    // Sau khi có step Writer -> Đang viết done, Đang đối chiếu Bible active
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    const progress2 = await screen.findByTestId('ai-script-progress');
    expect(progress2.querySelector('[data-stage="writing"]')).toHaveAttribute(
      'data-stage-state',
      'done',
    );
    expect(progress2.querySelector('[data-stage="checkingBible"]')).toHaveAttribute(
      'data-stage-state',
      'active',
    );

    // Hoàn tất -> hiện Sẵn sàng duyệt và vẫn giữ nguyên brief đã nhập
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(await screen.findByText('Sẵn sàng duyệt')).toBeInTheDocument();
    expect((screen.getByLabelText('Brief') as HTMLTextAreaElement).value).toBe('Cảnh tiến trình');
  });

  it('workflow Storyboard không hiện giao diện mới của Script kể cả khi truyền scriptContext', async () => {
    vi.mocked(aiAgentsService.getWorkflowAvailability).mockResolvedValue({
      chapterId: 'c1',
      sceneId: 'sc1',
      workflows: [
        avail({
          workflowType: 'Storyboard',
          resultKinds: ['Layout'],
          agents: ['Storyboard'],
        }),
      ],
    });

    renderPanel({
      workflowType: 'Storyboard',
      suggestionKind: 'Layout',
      title: 'Trợ lý AI · Phân khung Storyboard',
      runLabel: 'Phân khung',
      scriptContext: {
        sceneTitle: 'Cảnh 1',
        sceneSummary: 'Tóm tắt',
        hasStoryArc: true,
        hasChapterOutline: true,
        chapterOutline: 'Đề cương',
        bibleEntryCount: 3,
        sceneLineCount: 4,
        linkedPanelLineCount: 2,
        onOpenScenes: vi.fn(),
        onOpenStoryboard: vi.fn(),
      },
    });

    await screen.findByLabelText('Brief');
    expect(screen.queryByTestId('ai-script-scene-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-context')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-replace-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-linked-panels-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-fill-outline-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-templates')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-options-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-script-next-storyboard')).not.toBeInTheDocument();

    // linkedPanelLineCount của Script KHÔNG khoá nút chạy của Storyboard
    typeBrief('Phân khung cảnh 1');
    await waitFor(() => expect(screen.getByTestId('ai-run-btn')).toBeEnabled());
  });

  it('sau Accept Script thành công: hiện bước tiếp theo "Tạo Trang và Panel bằng Storyboard" và gọi mở Storyboard', async () => {
    const onOpenStoryboard = vi.fn();
    vi.spyOn(aiAgentsService, 'getSuggestions').mockResolvedValue([suggestion()]);
    vi.spyOn(aiAgentsService, 'getRun')
      .mockResolvedValueOnce(run())
      .mockResolvedValueOnce(run({ suggestions: [suggestion({ status: 'Accepted' })] }));
    vi.spyOn(aiAgentsService, 'review').mockResolvedValue({
      suggestionId: 'sg1',
      status: 'Accepted',
      decisionId: 'd1',
      chapterVersion: 4,
    });

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 1',
        onOpenStoryboard,
      },
    });

    expect(screen.queryByTestId('ai-script-next-storyboard')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Accept/ }));

    const nextCard = await screen.findByTestId('ai-script-next-storyboard');
    expect(nextCard).toHaveTextContent('Accept Script không tạo Trang và Panel');

    const storyboardBtn = screen.getByRole('button', {
      name: 'Tạo Trang và Panel bằng Storyboard',
    });
    fireEvent.click(storyboardBtn);
    expect(onOpenStoryboard).toHaveBeenCalledTimes(1);
  });

  it('TASK-363: khi availability trả SCENE_LINES_LINKED, bật "Viết nối thêm" gọi lại availability với appendScript=true, mở khoá nút chạy và gửi appendScript: true', async () => {
    const getAvail = vi
      .mocked(aiAgentsService.getWorkflowAvailability)
      .mockResolvedValueOnce({
        chapterId: 'c1',
        sceneId: 'sc1',
        workflows: [
          avail({
            canRun: false,
            missing: [
              {
                code: 'SCENE_LINES_LINKED',
                kind: 'State',
                message:
                  'Scene có dòng đã gắn Panel; thay cả script bằng AI sẽ làm mất liên kết này.',
              },
            ],
          }),
        ],
      })
      .mockResolvedValueOnce({
        chapterId: 'c1',
        sceneId: 'sc1',
        workflows: [avail({ canRun: true, missing: [] })],
      })
      .mockResolvedValueOnce({
        chapterId: 'c1',
        sceneId: 'sc1',
        workflows: [
          avail({
            canRun: false,
            missing: [
              {
                code: 'SCENE_LINES_LINKED',
                kind: 'State',
                message:
                  'Scene có dòng đã gắn Panel; thay cả script bằng AI sẽ làm mất liên kết này.',
              },
            ],
          }),
        ],
      });
    const runWorkflow = vi
      .spyOn(aiAgentsService, 'runWorkflow')
      .mockResolvedValue({ runId: 'r-append', status: 'Completed', provider: 'Mock', model: 'm' });
    vi.spyOn(aiAgentsService, 'getRun').mockResolvedValue(run({ id: 'r-append' }));

    renderPanel({
      scriptContext: {
        sceneTitle: 'Cảnh 3 · Kho hàng',
        sceneLineCount: 5,
        linkedPanelLineCount: 2,
      },
    });

    const toggle = await screen.findByTestId('ai-append-script-toggle');
    expect(toggle).not.toBeChecked();
    expect(getAvail).toHaveBeenNthCalledWith(1, 's1', 'c1', 'sc1');

    typeBrief('Viết nối cảnh rượt đuổi ra ngoài bến cảng');
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();

    // Bật toggle Viết nối thêm -> gọi lại availability với appendScript=true và mở khoá nút chạy
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(getAvail).toHaveBeenNthCalledWith(2, 's1', 'c1', 'sc1', true);
      expect(screen.getByTestId('ai-run-btn')).toBeEnabled();
    });
    expect(screen.queryByTestId('ai-script-linked-panels-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-missing')).not.toBeInTheDocument();
    expect(screen.getByText(/giữ nguyên dòng cũ và liên kết Panel/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-run-btn'));
    await waitFor(() => {
      expect(runWorkflow).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          workflowType: 'Script',
          chapterId: 'c1',
          sceneId: 'sc1',
          appendScript: true,
        }),
      );
    });

    // Tắt lại toggle -> gọi lại availability mặc định và khoá nút chạy lại
    fireEvent.click(screen.getByTestId('ai-append-script-toggle'));
    await waitFor(() => {
      expect(getAvail).toHaveBeenNthCalledWith(3, 's1', 'c1', 'sc1');
      expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
    });
  });

  it('TASK-363: khi chương đang đóng băng (SCRIPT_FROZEN + SCENE_LINES_LINKED), bật "Viết nối thêm" vẫn giữ khoá nút chạy theo BR-12', async () => {
    vi.mocked(aiAgentsService.getWorkflowAvailability)
      .mockResolvedValueOnce({
        chapterId: 'c1',
        sceneId: 'sc1',
        workflows: [
          avail({
            canRun: false,
            missing: [
              {
                code: 'SCRIPT_FROZEN',
                kind: 'State',
                message: 'Kịch bản của chương đã đóng băng.',
              },
              {
                code: 'SCENE_LINES_LINKED',
                kind: 'State',
                message:
                  'Scene có dòng đã gắn Panel; thay cả script bằng AI sẽ làm mất liên kết này.',
              },
            ],
          }),
        ],
      })
      .mockResolvedValueOnce({
        chapterId: 'c1',
        sceneId: 'sc1',
        workflows: [
          avail({
            canRun: false,
            missing: [
              {
                code: 'SCRIPT_FROZEN',
                kind: 'State',
                message: 'Kịch bản của chương đã đóng băng.',
              },
            ],
          }),
        ],
      });

    renderPanel();
    const toggle = await screen.findByTestId('ai-append-script-toggle');
    typeBrief('Thử viết nối khi đã đóng băng');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(aiAgentsService.getWorkflowAvailability).toHaveBeenNthCalledWith(
        2,
        's1',
        'c1',
        'sc1',
        true,
      );
    });
    expect(screen.getByText('Kịch bản của chương đã đóng băng.')).toBeInTheDocument();
    expect(screen.getByTestId('ai-run-btn')).toBeDisabled();
  });
});

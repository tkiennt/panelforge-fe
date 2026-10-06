import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import {
  AiRunDto,
  AiStepDto,
  AiSuggestionDto,
  ArtistPromptSet,
  LetteringSuggestionSet,
  ProductionReport,
} from '@/services/aiAgents.service';
import { AgentPipelineStrip } from './AgentPipelineStrip';
import { SuggestionCard } from './SuggestionCard';
import { StepOutputView } from './StepOutputView';
import { LetteringDiffView, ProductionReportView } from './AgentOutputViews';

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
  status: 'Completed',
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

const suggestion = (over: Partial<AiSuggestionDto>): AiSuggestionDto => ({
  id: 'sg1',
  runId: 'r1',
  stepId: 'st1',
  sceneId: 'sc1',
  kind: 'Script',
  status: 'Pending',
  summary: 'Tóm tắt đề xuất',
  payload: { lines: [{}, {}] },
  payloadHash: 'abcdef1234567890',
  baseChapterVersion: 0,
  bibleRevisionIds: [],
  hasBlockingFindings: false,
  createdAt: '2026-10-02T00:00:00Z',
  decisions: [],
  decisionRoles: ['Producer', 'Writer', 'Editor'],
  canDecide: true,
  ...over,
});

const lettering: LetteringSuggestionSet = {
  schemaVersion: 1,
  runId: 'r1',
  sceneId: 'sc1',
  summary: 'Đề xuất rút gọn',
  suggestions: [
    {
      sourceScriptLineId: 'aaaaaaaa-1111-2222-3333-444444444444',
      targetElementId: null,
      panelId: 'pppppppp-1111-2222-3333-444444444444',
      originalText: 'Bà ơi hay để cháu thử cạy ổ khóa này bằng kẹp tóc',
      suggestedText: 'Bà ơi hay để cháu thử…',
      reason: 'Lược phần cuối câu',
      maxChars: 88,
      limitSource: 'panel-estimate',
      withinEstimatedLimit: true,
    },
    {
      sourceScriptLineId: 'bbbbbbbb-1111-2222-3333-444444444444',
      targetElementId: 'eeeeeeee-1111-2222-3333-444444444444',
      panelId: 'pppppppp-1111-2222-3333-444444444444',
      originalText: 'Khoan đã chưa đến lúc rồi sẽ có ngày',
      suggestedText: 'Khoan đã, chưa đến lúc…',
      reason: 'Gọn hơn',
      maxChars: 12,
      limitSource: 'element-estimate',
      withinEstimatedLimit: false,
    },
  ],
};

const artist: ArtistPromptSet = {
  schemaVersion: 1,
  runId: 'r1',
  sceneId: 'sc1',
  layoutRevisionId: 'lr1',
  styleSummary: 'Mực đen trắng',
  panels: [
    {
      panelId: 'panel-0001-aaaa',
      pageNumber: 1,
      panelNumber: 2,
      prompt: 'Manga panel, close-up of An under the rain',
      referenceIds: ['an-id'],
      consistencyNotes: 'Giữ nhất quán áo khoác của An',
    },
  ],
};

const production: ProductionReport = {
  schemaVersion: 1,
  runId: 'r1',
  headline: 'Có rủi ro tiến độ cần xử lý',
  summary: 'Hoàn thành assignment 25%. Một số phần chưa đánh giá được vì thiếu dữ liệu.',
  risks: [
    { severity: 'Warning', description: 'Assignment Writer đã quá hạn', sourceFactKeys: ['F3'] },
  ],
  recommendations: [
    {
      action: 'Xác nhận lại deadline',
      rationale: 'Quá hạn 3 ngày',
      sourceFactKeys: ['F3'],
      suggestedOwnerRole: 'Producer',
    },
  ],
  dataGaps: ['Chapter chưa đặt ngày phát hành mục tiêu.'],
  facts: [
    { key: 'F1', text: 'Chương 3: InProduction' },
    { key: 'F3', text: 'Assignment Writer/Script hạn 2026-09-30, đã quá 3 ngày.' },
  ],
};

describe('AgentPipelineStrip — 7 agent + Supervisor riêng', () => {
  it('hiển thị đủ 7 agent chuyên môn; Supervisor là khối riêng, không phải một trong 7', () => {
    const { container } = render(<AgentPipelineStrip run={null} />);

    const agents = [...container.querySelectorAll('[data-agent]')].map((n) =>
      n.getAttribute('data-agent'),
    );
    expect(agents).toEqual([
      'Writer',
      'Continuity',
      'Storyboard',
      'Artist',
      'Letterer',
      'Editor',
      'Producer',
    ]);
    expect(screen.getByText('Supervisor')).toBeInTheDocument();
    expect(agents).not.toContain('Supervisor');
  });

  it('nhiệm vụ Artist: chỉ Artist thuộc chuỗi, agent khác được làm mờ "Không thuộc nhiệm vụ này"', () => {
    const r = run({
      workflowType: 'Artist',
      steps: [
        step({
          stepIndex: 1,
          agent: 'Supervisor',
          output: { action: 'Artist', allowedActions: ['Artist'], reason: 'r' },
        }),
        step({ stepIndex: 2, agent: 'Artist', output: artist }),
        step({
          stepIndex: 3,
          agent: 'Supervisor',
          output: { action: 'Finish', allowedActions: ['Finish'], reason: 'xong' },
        }),
      ],
    });
    const { container } = render(<AgentPipelineStrip run={r} />);

    const state = (a: string) =>
      container.querySelector(`[data-agent="${a}"]`)?.getAttribute('data-state');
    expect(state('Artist')).toBe('done');
    expect(state('Writer')).toBe('notInWorkflow');
    expect(state('Producer')).toBe('notInWorkflow');
    expect(screen.getAllByText('Không thuộc nhiệm vụ này')).toHaveLength(6);
    expect(screen.getByText(/nhiệm vụ: Prompt ảnh/)).toBeInTheDocument();
  });

  it('vòng sửa Writer ↔ Continuity chỉ hiện ở nhiệm vụ có Writer; run cũ (không workflowType) vẫn hiện', () => {
    const { rerender } = render(<AgentPipelineStrip run={run({})} />);
    expect(screen.getByText(/vòng sửa 0\/2/)).toBeInTheDocument();

    rerender(<AgentPipelineStrip run={run({ workflowType: 'Producer' })} />);
    expect(screen.queryByText(/vòng sửa/)).not.toBeInTheDocument();
  });

  it('báo guardrail đã ghi đè lựa chọn của Supervisor', () => {
    const r = run({
      workflowType: 'Artist',
      steps: [
        step({
          stepIndex: 1,
          agent: 'Supervisor',
          output: {
            action: 'Artist',
            reason: 'Guardrail ghi đè',
            allowedActions: ['Artist'],
            guardrailOverridden: true,
          },
        }),
      ],
    });
    render(<AgentPipelineStrip run={r} />);

    expect(screen.getByText(/1 bị guardrail ghi đè/)).toBeInTheDocument();
  });
});

describe('SuggestionCard — nút quyết định theo loại kết quả và quyền', () => {
  const noop = () => undefined;

  it('người không đúng vai trò: không có Accept/Reject/Yêu cầu sửa, có giải thích kèm vai trò cần có', () => {
    render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'ImagePrompt',
          canDecide: false,
          decisionRoles: ['Producer', 'Artist', 'Editor'],
          payload: artist,
        })}
        busy={false}
        onDecide={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reject/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Yêu cầu sửa/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('no-decision-rights')).toHaveTextContent('Producer, Artist, Editor');
  });

  it('đúng vai trò: Accept gọi onDecide("accept"); nhãn theo loại', () => {
    const onDecide = vi.fn();
    render(
      <SuggestionCard
        suggestion={suggestion({ kind: 'Lettering', payload: lettering })}
        busy={false}
        onDecide={onDecide}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Accept \(áp dụng rút gọn thoại\)/ }));

    expect(onDecide).toHaveBeenCalledWith('accept');
  });

  it('BE cũ không trả canDecide: không ẩn nút (Backend vẫn là nơi chặn)', () => {
    const s = suggestion({});
    delete s.canDecide;
    delete s.decisionRoles;
    render(<SuggestionCard suggestion={s} busy={false} onDecide={noop} />);

    expect(screen.getByRole('button', { name: /Accept/ })).toBeEnabled();
  });

  it('Layout có Script cha chưa Accept → Accept bị khoá; Layout từ workflow Storyboard (không cha) thì không', () => {
    const { rerender } = render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'Layout',
          parentSuggestionId: 'parent',
          payload: { pages: [] },
        })}
        parentStatus='Pending'
        busy={false}
        onDecide={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /Accept \(tạo Page\/Panel\)/ })).toBeDisabled();
    expect(screen.getByText('Cần Accept đề xuất Script trước')).toBeInTheDocument();

    rerender(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'Layout',
          parentSuggestionId: null,
          payload: { pages: [] },
        })}
        busy={false}
        onDecide={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /Accept \(tạo Page\/Panel\)/ })).toBeEnabled();
  });

  it('còn finding chặn → chỉ được Reject / Yêu cầu sửa', () => {
    render(
      <SuggestionCard
        suggestion={suggestion({ hasBlockingFindings: true })}
        busy={false}
        onDecide={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /Accept/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa' })).toBeEnabled();
  });

  it('Yêu cầu sửa bắt buộc có lý do', () => {
    const onDecide = vi.fn();
    render(<SuggestionCard suggestion={suggestion({})} busy={false} onDecide={onDecide} />);

    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu sửa' }));
    const confirm = screen.getByRole('button', { name: /Xác nhận Yêu cầu sửa/ });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Lý do yêu cầu sửa/), {
      target: { value: 'Sai giọng' },
    });
    fireEvent.click(confirm);

    expect(onDecide).toHaveBeenCalledWith('request-changes', 'Sai giọng');
  });

  it('đã quyết định: không còn nút, hiện người/lý do/revision tạo ra', () => {
    render(
      <SuggestionCard
        suggestion={suggestion({
          status: 'Accepted',
          canDecide: false,
          decisions: [
            {
              id: 'd1',
              decision: 'Accepted',
              decidedByUserId: 'u',
              reason: 'Đúng ý',
              decidedAtUtc: '2026-10-02T00:00:00Z',
              chapterVersionAtDecision: 2,
              resultRevisionId: 'abcdef12-0000',
              modificationLevel: 'None',
            },
          ],
        })}
        busy={false}
        onDecide={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-decision-rights')).not.toBeInTheDocument();
    expect(screen.getByText(/tạo content revision abcdef12/)).toBeInTheDocument();
  });

  it('prompt ảnh và thoại: xem nội dung trước khi quyết định', () => {
    const first = render(
      <SuggestionCard
        suggestion={suggestion({ kind: 'ImagePrompt', payload: artist })}
        busy={false}
        onDecide={noop}
      />,
    );
    expect(screen.queryByText(/close-up of An/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Xem nội dung đề xuất/));
    expect(screen.getByText(/close-up of An under the rain/)).toBeInTheDocument();

    first.unmount();
    render(
      <SuggestionCard
        suggestion={suggestion({ kind: 'Lettering', payload: lettering })}
        busy={false}
        onDecide={noop}
      />,
    );
    fireEvent.click(screen.getByText(/Xem nội dung đề xuất/));
    expect(screen.getByText('Bà ơi hay để cháu thử…')).toBeInTheDocument();
  });
});

describe('View output riêng từng agent', () => {
  it('Letterer: so sánh trước/sau, ghi rõ giới hạn là ƯỚC LƯỢNG, bubble gắn hay chưa', () => {
    render(<LetteringDiffView set={lettering} />);

    expect(screen.getByText(/ước lượng/i, { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('chưa gắn bubble')).toBeInTheDocument();
    expect(screen.getByText(/bubble eeeeeeee/)).toBeInTheDocument();
    expect(screen.getByText(/ước lượng ≤ 88 ký tự · theo diện tích panel/)).toBeInTheDocument();
    expect(screen.getByText(/ước lượng ≤ 12 ký tự · theo kích thước bubble/)).toBeInTheDocument();
    expect(screen.getByText(/trong giới hạn ước lượng/)).toBeInTheDocument();
    expect(screen.getByText(/vượt giới hạn ước lượng/)).toBeInTheDocument();
    // phần bị lược ở bản gốc được gạch
    expect(screen.getByText(/cạy ổ khóa này bằng kẹp tóc/).className).toContain('line-through');
  });

  it('Letterer: không có đề xuất → nói rõ không dòng nào cần rút gọn', () => {
    render(<LetteringDiffView set={{ ...lettering, suggestions: [] }} />);
    expect(screen.getByText('Không dòng thoại nào cần rút gọn.')).toBeInTheDocument();
  });

  it('Producer: nêu rõ dữ liệu còn thiếu, rủi ro có nguồn fact, và số liệu do hệ thống tính', () => {
    render(<ProductionReportView report={production} />);

    expect(screen.getByText('Có rủi ro tiến độ cần xử lý')).toBeInTheDocument();
    expect(screen.getByText(/Thiếu dữ liệu — chưa đánh giá được/)).toBeInTheDocument();
    expect(screen.getByText('Chapter chưa đặt ngày phát hành mục tiêu.')).toBeInTheDocument();
    const sources = screen.getAllByText('F3', { selector: 'span.font-mono' });
    expect(sources[0]).toHaveAttribute(
      'title',
      'Assignment Writer/Script hạn 2026-09-30, đã quá 3 ngày.',
    );
    expect(screen.getByText(/Báo cáo tham khảo: không tự giao việc/)).toBeInTheDocument();
    expect(screen.getByText('Xác nhận lại deadline')).toBeInTheDocument();
  });

  it('StepOutputView chọn đúng view theo agent (Artist / Letterer / Producer)', () => {
    const base = { allSteps: [], nameById: { 'an-id': 'An' }, lines: {} };
    const { rerender } = render(
      <StepOutputView {...base} step={step({ agent: 'Artist', output: artist })} />,
    );
    expect(screen.getByText(/chưa sinh ảnh/)).toBeInTheDocument();
    expect(screen.getByText('An')).toBeInTheDocument();
    expect(screen.getByText('Trang 1 · Panel 2')).toBeInTheDocument();

    rerender(<StepOutputView {...base} step={step({ agent: 'Letterer', output: lettering })} />);
    expect(screen.getByText(/2 đề xuất rút gọn thoại/)).toBeInTheDocument();

    rerender(<StepOutputView {...base} step={step({ agent: 'Producer', output: production })} />);
    expect(screen.getByText('Có rủi ro tiến độ cần xử lý')).toBeInTheDocument();
  });

  it('step lỗi hiện mã lỗi + thông điệp thay vì output', () => {
    render(
      <StepOutputView
        allSteps={[]}
        nameById={{}}
        lines={{}}
        step={step({
          agent: 'Producer',
          status: 'Failed',
          errorCode: 'INVALID_OUTPUT',
          errorMessage: 'con số 85% không phải số liệu do hệ thống tính',
        })}
      />,
    );
    expect(screen.getByText('INVALID_OUTPUT')).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });
});

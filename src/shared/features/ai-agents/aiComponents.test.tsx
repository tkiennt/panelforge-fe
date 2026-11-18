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
import { SuggestionCard } from './SuggestionCard';
import { StepOutputView } from './StepOutputView';
import { LayoutPreview } from './LayoutPreview';
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
  canAccept: true,
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

  it('canDecide = true nhưng canAccept = false: ẩn nút Accept, vẫn hiện Reject và Yêu cầu sửa', () => {
    render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'Script',
          canDecide: true,
          canAccept: false,
          decisionRoles: ['Producer', 'Writer', 'Editor'],
        })}
        busy={false}
        onDecide={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Thay các dòng script của Scene/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-decision-rights')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa' })).toBeEnabled();
  });

  it('BE cũ không trả canDecide: không ẩn nút (Backend vẫn là nơi chặn)', () => {
    const s = suggestion({});
    delete s.canDecide;
    delete s.canAccept;
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

  it('Lettering đơn lẻ (bóng thoại): hiển thị bản gốc và bản rút gọn kèm lý do', () => {
    render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'Lettering',
          summary: 'Rút gọn thoại còn 16/25 ký tự',
          payload: {
            pageId: 'page-1',
            elementId: 'el-1',
            elementVersion: 2,
            originalText: 'Chúng ta không thể đứng nhìn họ gặp nguy hiểm!',
            suggestedText: 'Không thể đứng nhìn!',
            reason: 'Giữ ý chính cho vừa khung bóng',
            maxChars: 25,
          },
        })}
        busy={false}
        onDecide={noop}
      />,
    );

    expect(screen.getByText('Chúng ta không thể đứng nhìn họ gặp nguy hiểm!')).toBeInTheDocument();
    expect(screen.getByText('Không thể đứng nhìn!')).toBeInTheDocument();
    expect(screen.getByText(/Giữ ý chính cho vừa khung bóng/)).toBeInTheDocument();
  });

  it('BibleStub: hiển thị mô tả, tiêu đề phụ, từng trích dẫn và nút "Dùng làm nháp"', () => {
    const onDecide = vi.fn();
    render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'BibleStub',
          summary: 'Hồ sơ nháp cho Akira',
          payload: {
            entryId: 'ent-1',
            name: 'Akira',
            draft: {
              description: 'Kiếm sĩ khoác áo choàng đen, mang vết sẹo ngang mày.',
              subtitle: 'Kiếm sĩ lang thang',
              citations: [
                {
                  claim: 'Khoác áo choàng đen',
                  lineId: 'line-1',
                  quote: 'Akira kéo thấp chiếc áo choàng đen trong màn mưa.',
                },
                {
                  claim: 'Có vết sẹo ngang mày',
                  lineId: 'line-2',
                  quote: 'Vết sẹo ngang mày của Akira ánh lên dưới tia chớp.',
                },
              ],
            },
            reason: 'Tổng hợp nguyên văn từ 2 dòng kịch bản',
          },
        })}
        busy={false}
        onDecide={onDecide}
      />,
    );

    expect(screen.getByText('Kiếm sĩ lang thang')).toBeInTheDocument();
    expect(
      screen.getByText('Kiếm sĩ khoác áo choàng đen, mang vết sẹo ngang mày.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Khoác áo choàng đen')).toBeInTheDocument();
    expect(
      screen.getByText(/Akira kéo thấp chiếc áo choàng đen trong màn mưa\./),
    ).toBeInTheDocument();
    expect(screen.getByText('Có vết sẹo ngang mày')).toBeInTheDocument();
    expect(
      screen.getByText(/Vết sẹo ngang mày của Akira ánh lên dưới tia chớp\./),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dùng làm nháp/ }));
    expect(onDecide).toHaveBeenCalledWith('accept');
  });

  it('ImpactRipple: hiển thị quyết định Giữ nguyên hoặc Làm lại, lý do và danh sách thay đổi', () => {
    const onDecide = vi.fn();
    const { rerender } = render(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'ImpactRipple',
          summary: 'Gợi ý Keep cho Ink, trang 1',
          payload: {
            taskId: 'task-1',
            decision: 'Keep',
            reason: 'Chỉ chỉnh dấu câu, không ảnh hưởng nét vẽ.',
            changes: [
              {
                type: 'Dialogue',
                label: 'Akira',
                before: 'Họ đang tới',
                after: 'Họ đang tới!',
              },
            ],
          },
        })}
        busy={false}
        onDecide={onDecide}
      />,
    );

    expect(screen.getByText('Giữ nguyên')).toBeInTheDocument();
    expect(screen.getByText('Chỉ chỉnh dấu câu, không ảnh hưởng nét vẽ.')).toBeInTheDocument();
    expect(screen.getByText(/Dialogue · Akira/)).toBeInTheDocument();
    expect(screen.getByText('Họ đang tới')).toBeInTheDocument();
    expect(screen.getByText('Họ đang tới!')).toBeInTheDocument();

    rerender(
      <SuggestionCard
        suggestion={suggestion({
          kind: 'ImpactRipple',
          summary: 'Gợi ý Rework cho Ink, trang 1',
          payload: {
            taskId: 'task-1',
            decision: 'Rework',
            reason: 'Đổi hành động nhân vật từ đứng sang rút kiếm.',
            changes: [
              {
                type: 'Action',
                label: null,
                before: 'Akira đứng yên quan sát.',
                after: 'Akira rút kiếm lao tới.',
              },
            ],
          },
        })}
        busy={false}
        onDecide={onDecide}
      />,
    );

    expect(screen.getByText('Làm lại')).toBeInTheDocument();
    expect(screen.getByText('Đổi hành động nhân vật từ đứng sang rút kiếm.')).toBeInTheDocument();
    expect(screen.getByText('Akira rút kiếm lao tới.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(onDecide).toHaveBeenCalledWith('accept');
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

  it('LayoutPreview hiển thị đúng hướng đọc trên → dưới (Vertical) và khung tỉ lệ 9:16 cho Series Vertical', () => {
    render(
      <LayoutPreview
        layout={{
          schemaVersion: 1,
          runId: 'r1',
          sceneId: 'sc1',
          readingDirection: 'Vertical',
          pages: [
            {
              pageNumber: 1,
              panels: [
                {
                  panelNumber: 1,
                  readingOrder: 1,
                  bbox: { x: 0.05, y: 0.05, w: 0.9, h: 0.4 },
                  coordinateSpace: 'PageNormalized',
                  camera: 'Wide',
                  description: 'Khung dọc Webtoon',
                  characterIds: [],
                  sourceScriptLineIds: [],
                },
              ],
            },
          ],
        }}
        lines={{}}
        nameById={{}}
      />,
    );

    expect(screen.getByText(/trên → dưới \(Vertical\)/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bố cục trang 1' })).toHaveAttribute(
      'viewBox',
      '0 0 540 960',
    );
  });
});

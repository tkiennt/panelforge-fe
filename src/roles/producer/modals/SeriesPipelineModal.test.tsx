import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriesPipelineModal } from './SeriesPipelineModal';
import { pipelineService } from '@/services/pipeline.service';

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
    updateStage: vi.fn(),
    addStage: vi.fn(),
    deleteStage: vi.fn(),
    reorderStages: vi.fn(),
  },
}));

vi.mock('@/shared/context/ConfirmContext', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

describe('SeriesPipelineModal - Bật/Tắt stage (Line 210)', () => {
  const mockStages = [
    {
      id: 'stage-script',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      colorCode: '#10B981',
      allowedRole: 'Writer',
      isApprovalGate: false,
      isInitial: true,
      isTerminal: false,
      isEnabled: true,
    },
    {
      id: 'stage-color',
      name: 'Color',
      slug: 'color',
      stageOrder: 2,
      colorCode: '#EC4899',
      allowedRole: 'Artist',
      isApprovalGate: false,
      isInitial: false,
      isTerminal: false,
      isEnabled: false, // đã tắt
    },
    {
      id: 'stage-publish',
      name: 'Publish',
      slug: 'publish',
      stageOrder: 3,
      colorCode: '#8B5CF6',
      allowedRole: 'Editor',
      isApprovalGate: true,
      isInitial: false,
      isTerminal: true,
      isEnabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Test Pipeline',
      stages: mockStages as any,
      transitions: [],
    });
  });

  it('hiển thị nhãn "Đã tắt" cho stage có isEnabled === false', async () => {
    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Đã tắt')).toBeInTheDocument();
  });

  it('bấm nút bật/tắt nhanh trên stage gọi updateStage với isEnabled tương ứng', async () => {
    vi.mocked(pipelineService.updateStage).mockResolvedValueOnce({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Test Pipeline',
      stages: mockStages.map((s) =>
        s.id === 'stage-color' ? { ...s, isEnabled: true } : s,
      ) as any,
      transitions: [],
    });

    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Color');
    const toggleButtons = screen.getAllByTitle(/Bật lại công đoạn này|Tắt công đoạn này/i);
    // Bấm bật lại Color
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(pipelineService.updateStage).toHaveBeenCalledWith(
        'series-1',
        'stage-color',
        expect.objectContaining({ isEnabled: true }),
      );
    });
  });

  it('không cho tắt stage khởi tạo hoặc kết thúc', async () => {
    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Script');
    const disabledToggles = screen.getAllByTitle('Không thể tắt công đoạn khởi tạo hoặc kết thúc');
    expect(disabledToggles.length).toBeGreaterThanOrEqual(2);
    expect(disabledToggles[0]).toBeDisabled();
  });

  it('mở form sửa stage hiển thị toggle isEnabled và gợi ý tắt Color cho truyện trắng đen', async () => {
    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Color');
    const editButtons = screen.getAllByTitle('Sửa công đoạn');
    fireEvent.click(editButtons[1]); // Sửa stage Color

    expect(await screen.findByLabelText(/Bật công đoạn này/i)).toBeInTheDocument();
    expect(screen.getByText(/Truyện trắng đen → tắt Color/i)).toBeInTheDocument();
  });

  it('không có vai trò Writer trong danh sách vai trò cho phép của pipeline', async () => {
    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Color');
    const editButtons = screen.getAllByTitle('Sửa công đoạn');
    fireEvent.click(editButtons[1]);

    const roleSelect = await screen.findByDisplayValue('Artist');
    const options = Array.from((roleSelect as HTMLSelectElement).options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(options).not.toContain('Writer');
    expect(options).toEqual(['Producer', 'Artist', 'Letterer', 'Editor']);
  });

  it('cho phép chỉnh sửa Nhánh song song (track A/B) trên công đoạn và gửi track trong updateStage', async () => {
    vi.mocked(pipelineService.updateStage).mockResolvedValueOnce({
      id: 'pipe-1',
      seriesId: 'series-1',
      name: 'Test Pipeline',
      stages: mockStages.map((s) => (s.id === 'stage-color' ? { ...s, track: 'A' } : s)) as any,
      transitions: [],
    });

    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-1'
        seriesTitle='Bộ truyện Test'
        onClose={vi.fn()}
      />,
    );

    await screen.findByText('Color');
    const editButtons = screen.getAllByTitle('Sửa công đoạn');
    fireEvent.click(editButtons[1]); // Sửa stage Color

    const trackSelect = await screen.findByLabelText(/Nhánh song song/i);
    fireEvent.change(trackSelect, { target: { value: 'A' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu Thay Đổi/i }));

    await waitFor(() => {
      expect(pipelineService.updateStage).toHaveBeenCalledWith(
        'series-1',
        'stage-color',
        expect.objectContaining({ track: 'A' }),
      );
    });
    expect(await screen.findByText('Nhánh A')).toBeInTheDocument();
  });

  it('VIỆC 3 & 5: Hiện gợi ý tắt Thumbnail và hiển thị đúng huy hiệu Nhánh A / Nhánh B ngay sau khi tạo series mới (không còn Thumbnail)', async () => {
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValueOnce({
      id: 'pipe-new',
      seriesId: 'series-new',
      name: 'New V3 Series Pipeline',
      stages: [
        {
          id: 'st-pencil',
          name: 'Pencil',
          slug: 'pencil',
          stageOrder: 1,
          track: null,
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: true,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-ink',
          name: 'Ink',
          slug: 'ink',
          stageOrder: 2,
          track: 'A',
          allowedRole: 'Artist',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-letter',
          name: 'Letter',
          slug: 'letter',
          stageOrder: 3,
          track: 'B',
          allowedRole: 'Letterer',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-review',
          name: 'Review',
          slug: 'review',
          stageOrder: 4,
          track: null,
          allowedRole: 'Editor',
          isApprovalGate: true,
          isInitial: false,
          isTerminal: false,
          isEnabled: true,
        },
        {
          id: 'st-approved',
          name: 'Approved',
          slug: 'approved',
          stageOrder: 5,
          track: null,
          allowedRole: 'Editor',
          isApprovalGate: false,
          isInitial: false,
          isTerminal: true,
          isEnabled: true,
        },
      ] as any,
      transitions: [],
    });

    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-new'
        seriesTitle='Series Mới V3'
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Pencil')).toBeInTheDocument();
    expect(screen.queryByText('Thumbnail')).not.toBeInTheDocument();
    expect(screen.getByText('Nhánh A')).toBeInTheDocument();
    expect(screen.getByText('Nhánh B')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-thumbnail-hint')).toHaveTextContent(
      'Muốn bỏ Thumbnail: tắt công đoạn rồi bấm Sinh / Đồng bộ ô việc ở lưới',
    );
  });

  it('VIỆC 3: Sửa pipeline gặp 409 (tắt công đoạn / đổi thứ tự / xoá công đoạn) hiện đúng error, gợi ý "Tắt công đoạn thay vì xoá" và rollback thay đổi lạc quan', async () => {
    const activeStages = [
      {
        id: 'st-pencil',
        name: 'Pencil',
        slug: 'pencil',
        stageOrder: 1,
        allowedRole: 'Artist',
        isApprovalGate: false,
        isInitial: true,
        isTerminal: false,
        isEnabled: true,
      },
      {
        id: 'st-ink',
        name: 'Ink',
        slug: 'ink',
        stageOrder: 2,
        track: 'A',
        allowedRole: 'Artist',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: false,
        isEnabled: true,
      },
      {
        id: 'st-approved',
        name: 'Approved',
        slug: 'approved',
        stageOrder: 3,
        allowedRole: 'Editor',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: true,
        isEnabled: true,
      },
    ];
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValueOnce({
      id: 'pipe-409',
      seriesId: 'series-409',
      name: '409 Pipeline',
      stages: activeStages as any,
      transitions: [],
    });

    const onShowToast = vi.fn();
    render(
      <SeriesPipelineModal
        isOpen={true}
        seriesId='series-409'
        seriesTitle='Series 409'
        onClose={vi.fn()}
        onShowToast={onShowToast}
      />,
    );

    await screen.findByText('Ink');

    // 1. Tắt công đoạn đang có ô giao trên lưới -> 409 + rollback (không hiện nhãn "Đã tắt")
    const conflictDisable: any = new Error(
      'Công đoạn này đã có ô được giao trên lưới; bỏ gán các ô đó trước khi tắt công đoạn.',
    );
    conflictDisable.code = 'CONFLICT';
    conflictDisable.status = 409;
    vi.mocked(pipelineService.updateStage).mockRejectedValueOnce(conflictDisable);

    fireEvent.click(screen.getByTestId('pipeline-toggle-stage-st-ink'));

    expect(
      await screen.findByText(
        'Công đoạn này đã có ô được giao trên lưới; bỏ gán các ô đó trước khi tắt công đoạn.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Đã tắt')).not.toBeInTheDocument();

    // 2. Đổi thứ tự khi còn N ô đang làm dở -> 409 + rollback thứ tự
    const conflictReorder: any = new Error(
      'Còn 3 ô trên lưới giao việc đang làm dở; không đổi thứ tự, nhánh, vai trò hay thêm công đoạn được cho tới khi các ô này được duyệt hoặc bỏ gán.',
    );
    conflictReorder.code = 'CONFLICT';
    conflictReorder.status = 409;
    vi.mocked(pipelineService.reorderStages).mockRejectedValueOnce(conflictReorder);

    const upButtons = screen.getAllByTitle('Di chuyển lên trước');
    fireEvent.click(upButtons[1]); // Bấm di chuyển Ink lên trước Pencil

    expect(await screen.findByText(/Còn 3 ô trên lưới giao việc đang làm dở/i)).toBeInTheDocument();

    // 3. Xoá công đoạn đã có ô lưới -> 409 + gợi ý "Tắt công đoạn thay vì xoá"
    const conflictDelete: any = new Error(
      'Không thể xóa stage đang được sử dụng (có Page/Panel đang ở stage này hoặc Assignment chưa hoàn tất).',
    );
    conflictDelete.code = 'CONFLICT';
    conflictDelete.status = 409;
    vi.mocked(pipelineService.deleteStage).mockRejectedValueOnce(conflictDelete);

    const deleteButtons = screen.getAllByTitle('Xóa công đoạn');
    fireEvent.click(deleteButtons[0]);

    expect(await screen.findByText(/Gợi ý: Tắt công đoạn thay vì xoá\./i)).toBeInTheDocument();
    expect(onShowToast).toHaveBeenCalledWith(
      'Không thể xóa công đoạn',
      expect.stringContaining('Tắt công đoạn thay vì xoá'),
    );
  });
});

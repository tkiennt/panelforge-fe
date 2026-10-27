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
});

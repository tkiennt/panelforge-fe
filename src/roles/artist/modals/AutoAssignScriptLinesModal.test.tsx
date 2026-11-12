import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AutoAssignScriptLinesModal } from './AutoAssignScriptLinesModal';
import { pageService, AutoAssignScriptLinesResult } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { SceneScriptLineSummaryDto } from '@/services/scriptLine.service';

vi.mock('@/services/page.service', () => ({
  pageService: {
    autoAssignScriptLines: vi.fn(),
  },
}));

const mockPanels: PanelDto[] = [
  { id: 'p1', pageId: 'pg1', panelNumber: 1, readingOrder: 1, boundingBox: '{}', createdAt: '' },
  { id: 'p2', pageId: 'pg1', panelNumber: 2, readingOrder: 2, boundingBox: '{}', createdAt: '' },
];

const mockLines: SceneScriptLineSummaryDto[] = [
  { id: 'l1', lineOrder: 1, stageDirection: 'Cận cảnh Ren rút kiếm' },
  { id: 'l2', lineOrder: 2, dialogueText: 'Kẻ nào dám vào đây?', speakerCharacterId: 'c1' },
  { id: 'l3', lineOrder: 3, stageDirection: 'Bà Lan lùi lại kinh ngạc' },
  { id: 'l4', lineOrder: 4, dialogueText: 'Khoan đã Ren!', speakerCharacterId: 'c2' },
  { id: 'l5', lineOrder: 5, stageDirection: 'Toàn cảnh ngôi đền rung chuyển' },
];

const mockDryRunResult: AutoAssignScriptLinesResult = {
  assignments: [
    { panelId: 'p1', scriptLineIds: ['l1', 'l2'] },
    { panelId: 'p2', scriptLineIds: ['l3', 'l4'] },
  ],
  unassignedLineIds: ['l5'],
  missingPanels: 1,
  applied: false,
};

describe('AutoAssignScriptLinesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    pageId: 'pg1',
    pageNumber: 1,
    sceneId: 'sc1',
    sceneHeading: 'Cảnh 1: Đền cổ',
    panels: mockPanels,
    lines: mockLines,
    bibleNameById: { c1: 'Kiếm Sĩ Ren', c2: 'Bà Lan' },
    onSuccess: vi.fn(),
    onShowToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pageService.autoAssignScriptLines).mockResolvedValue(mockDryRunResult);
  });

  it('gọi dryRun và hiển thị xem trước phân bổ vào từng khung', async () => {
    render(<AutoAssignScriptLinesModal {...defaultProps} />);

    await waitFor(() => {
      expect(pageService.autoAssignScriptLines).toHaveBeenCalledWith('pg1', {
        sceneId: 'sc1',
        dryRun: true,
      });
    });

    // Header & scene heading
    expect(screen.getByText(/Tự Động Phân Bổ Kịch Bản/i)).toBeInTheDocument();
    expect(screen.getByText('Cảnh 1: Đền cổ')).toBeInTheDocument();

    // Stats
    expect(screen.getByText('2 / 2 khung')).toBeInTheDocument();
    expect(screen.getByText('1 khung')).toBeInTheDocument();

    // Content mapping
    expect(screen.getByText('Khung #1')).toBeInTheDocument();
    expect(screen.getByText('Khung #2')).toBeInTheDocument();
    expect(screen.getByText('Kiếm Sĩ Ren')).toBeInTheDocument();
    expect(screen.getByText('Bà Lan')).toBeInTheDocument();

    // Missing panels warning
    expect(
      screen.getByText(/Kịch bản có nhiều cụm hơn số khung hiện tại trên trang/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Toàn cảnh ngôi đền rung chuyển')).toBeInTheDocument();
  });

  it('gọi dryRun = false và onSuccess khi bấm Áp dụng phân bổ', async () => {
    vi.mocked(pageService.autoAssignScriptLines)
      .mockResolvedValueOnce(mockDryRunResult) // dryRun call
      .mockResolvedValueOnce({ ...mockDryRunResult, applied: true }); // actual apply call

    render(<AutoAssignScriptLinesModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('apply-auto-assign-btn')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('apply-auto-assign-btn'));

    await waitFor(() => {
      expect(pageService.autoAssignScriptLines).toHaveBeenCalledWith('pg1', {
        sceneId: 'sc1',
        dryRun: false,
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onShowToast).toHaveBeenCalledWith(
        'Phân bổ kịch bản thành công',
        expect.stringContaining('2 khung tranh'),
      );
    });
  });

  it('không render khi isOpen = false', () => {
    render(<AutoAssignScriptLinesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('auto-assign-script-lines-modal')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StartProductionModal } from './StartProductionModal';
import { chapterService } from '@/services/chapter.service';
import { chapterCastService } from '@/services/chapterCast.service';
import { workspaceService } from '@/services/workspace.service';
import { pageService } from '@/services/page.service';
import { bibleService } from '@/services/bible.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    setBibleEntryCrowd: vi.fn().mockResolvedValue({ id: 'entry-2', isCrowd: true }),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getScriptComments: vi.fn(),
    startProduction: vi.fn(),
  },
}));

vi.mock('@/services/chapterCast.service', () => ({
  chapterCastService: {
    getChapterCast: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

describe('StartProductionModal Component', () => {
  const defaultProps = {
    isOpen: true,
    workspaceId: 'ws-1',
    seriesId: 'series-1',
    chapterId: 'chap-1',
    chapterNumber: 1,
    chapterTitle: 'Khởi đầu',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onShowToast: vi.fn(),
  };

  const mockPages = [
    { id: 'page-1', pageNumber: 1, chapterId: 'chap-1' } as any,
    { id: 'page-2', pageNumber: 2, chapterId: 'chap-1' } as any,
    { id: 'page-3', pageNumber: 3, chapterId: 'chap-1' } as any,
  ];

  const mockMembers = [
    {
      userId: 'user-artist-1',
      fullName: 'Họa sĩ A',
      email: 'a@example.com',
      role: 'Artist',
    } as any,
    {
      userId: 'user-letterer-1',
      fullName: 'Thoát thoại B',
      email: 'b@example.com',
      role: 'Letterer',
    } as any,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(chapterCastService.getChapterCast).mockResolvedValue({
      chapterId: 'chap-1',
      entries: [],
      submitGate: { isPassed: true, blockers: [] },
      gate: { isPassed: true, canStart: true, blockers: [] },
    } as any);

    vi.mocked(chapterService.getScriptComments).mockResolvedValue([]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue(mockMembers);
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue(mockPages);
  });

  it('renders Gate 1 modal with ready Bible gate and enables submit when artist is selected', async () => {
    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-bible-ready')).toBeInTheDocument();
      expect(screen.getByTestId('gate1-artist-select')).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId('gate1-submit-btn');
    expect(submitBtn).toBeDisabled();

    // Select artist for whole chapter
    fireEvent.change(screen.getByTestId('gate1-artist-select'), {
      target: { value: 'user-artist-1' },
    });

    expect(submitBtn).toBeEnabled();

    // Click submit
    vi.mocked(chapterService.startProduction).mockResolvedValueOnce({
      chapter: { id: 'chap-1', status: 'InProduction' } as any,
      assignments: [],
      lots: [],
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(chapterService.startProduction).toHaveBeenCalledWith('chap-1', {
        pageAssignments: [{ artistId: 'user-artist-1', pageFrom: 1, pageTo: 3 }],
        lettererAssignments: null,
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('blocks submit and shows blocker list when Series Bible is not ready', async () => {
    vi.mocked(chapterCastService.getChapterCast).mockResolvedValueOnce({
      chapterId: 'chap-1',
      entries: [],
      submitGate: { isPassed: false, blockers: [] },
      gate: {
        isPassed: false,
        canStart: false,
        blockers: [
          {
            bibleEntryId: 'entry-1',
            entryName: 'Nhân vật X',
            revisionId: null,
            reason: 'Chưa khoá Canon',
            sourceExplanation: 'Xuất hiện ở Trang 1',
          },
        ],
      },
    } as any);

    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-bible-blockers')).toBeInTheDocument();
      expect(screen.getByText(/Nhân vật X/)).toBeInTheDocument();
      expect(screen.getByText(/Chưa khoá Canon/)).toBeInTheDocument();
    });

    // Submit button must be disabled regardless of artist selection
    fireEvent.change(screen.getByTestId('gate1-artist-select'), {
      target: { value: 'user-artist-1' },
    });

    const submitBtn = screen.getByTestId('gate1-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('displays soft open comments warning when there are unresolved comments', async () => {
    vi.mocked(chapterService.getScriptComments).mockResolvedValueOnce([
      { id: 'c-1', resolvedAt: null } as any,
      { id: 'c-2', resolvedAt: '2026-11-15T00:00:00Z' } as any,
    ]);

    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-open-comments-warning')).toBeInTheDocument();
      expect(screen.getByText(/Còn 1 góp ý kịch bản chưa giải quyết/)).toBeInTheDocument();
    });
  });

  it('validates overlapping page ranges for artists and displays inline conflict alert', async () => {
    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-artist-mode-ranges')).toBeInTheDocument();
    });

    // Switch to ranges mode
    fireEvent.click(screen.getByTestId('gate1-artist-mode-ranges'));

    // Range 1 is pre-populated (pageFrom: 1, pageTo: 3)
    // Add another range
    fireEvent.click(screen.getByTestId('gate1-add-artist-range-btn'));

    // Range 2 overlaps Range 1 (both have 1..3)
    await waitFor(() => {
      expect(screen.getByTestId('gate1-artist-conflict-alert')).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId('gate1-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('supports optional letterer assignment and sends lettererAssignments in payload', async () => {
    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-artist-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('gate1-artist-select'), {
      target: { value: 'user-artist-1' },
    });

    // Enable letterer assignment
    fireEvent.click(screen.getByTestId('gate1-letterer-checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('gate1-letterer-select')).toBeInTheDocument();
    });

    // Submit disabled until letterer is selected
    expect(screen.getByTestId('gate1-submit-btn')).toBeDisabled();

    fireEvent.change(screen.getByTestId('gate1-letterer-select'), {
      target: { value: 'user-letterer-1' },
    });

    expect(screen.getByTestId('gate1-submit-btn')).toBeEnabled();

    vi.mocked(chapterService.startProduction).mockResolvedValueOnce({
      chapter: { id: 'chap-1', status: 'InProduction' } as any,
      assignments: [],
      lots: [],
    });

    fireEvent.click(screen.getByTestId('gate1-submit-btn'));

    await waitFor(() => {
      expect(chapterService.startProduction).toHaveBeenCalledWith('chap-1', {
        pageAssignments: [{ artistId: 'user-artist-1', pageFrom: 1, pageTo: 3 }],
        lettererAssignments: [{ artistId: 'user-letterer-1', pageFrom: 1, pageTo: 3 }],
      });
    });
  });

  it('displays inline 409 conflict error and blockers if submission fails on server', async () => {
    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-artist-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('gate1-artist-select'), {
      target: { value: 'user-artist-1' },
    });

    const conflictErr: any = new Error('Lỗi xung đột khi bắt đầu sản xuất');
    conflictErr.status = 409;
    conflictErr.blockers = [
      {
        bibleEntryId: 'entry-2',
        entryName: 'Nhân vật Y',
        reason: 'Canon chưa khóa',
      },
    ];

    vi.mocked(chapterService.startProduction).mockRejectedValueOnce(conflictErr);

    fireEvent.click(screen.getByTestId('gate1-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('gate1-submit-error')).toBeInTheDocument();
      expect(screen.getByText('Lỗi xung đột khi bắt đầu sản xuất')).toBeInTheDocument();
      expect(screen.getByText(/Nhân vật Y/)).toBeInTheDocument();
      expect(screen.getByTestId('gate1-quick-crowd-entry-2')).toBeInTheDocument();
      expect(defaultProps.onShowToast).toHaveBeenCalledWith(
        'Lỗi xung đột khi bắt đầu sản xuất',
        '',
      );
    });

    // Producer quick-resolves background NPC as IsCrowd right inside 409 blocker list
    fireEvent.click(screen.getByTestId('gate1-quick-crowd-entry-2'));
    await waitFor(() => {
      expect(bibleService.setBibleEntryCrowd).toHaveBeenCalledWith('series-1', 'entry-2', true);
      expect(screen.queryByTestId('gate1-quick-crowd-entry-2')).not.toBeInTheDocument();
    });
  });

  it('forwards lots in StartChapterProductionResultDto to onSuccess and surfaces exact 409 message when page range is already assigned', async () => {
    render(<StartProductionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('gate1-artist-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('gate1-artist-select'), {
      target: { value: 'user-artist-1' },
    });

    const conflictRangeErr: any = new Error('Khoảng trang 1-3 đã được giao cho thành viên khác.');
    conflictRangeErr.status = 409;
    conflictRangeErr.code = 'CONFLICT';
    vi.mocked(chapterService.startProduction).mockRejectedValueOnce(conflictRangeErr);

    fireEvent.click(screen.getByTestId('gate1-submit-btn'));

    await waitFor(() => {
      expect(
        screen.getByText('Khoảng trang 1-3 đã được giao cho thành viên khác.'),
      ).toBeInTheDocument();
      expect(defaultProps.onShowToast).toHaveBeenCalledWith(
        'Khoảng trang 1-3 đã được giao cho thành viên khác.',
        '',
      );
    });

    const mockLotsResult = {
      chapter: { id: 'chap-1', status: 'InProduction' } as any,
      assignments: [],
      lots: [
        {
          id: 'lot-1',
          chapterId: 'chap-1',
          pipelineStageId: 'st-pencil',
          assigneeUserId: 'user-artist-1',
          assignedRole: 'Artist',
          status: 'InProgress',
          isOverdue: false,
          taskCount: 3,
          approvedCount: 0,
          rowVersion: 1,
          createdAt: '2026-01-01T00:00:00Z',
          taskIds: ['t-1', 't-2', 't-3'],
        } as any,
      ],
    };
    vi.mocked(chapterService.startProduction).mockResolvedValueOnce(mockLotsResult);

    fireEvent.click(screen.getByTestId('gate1-submit-btn'));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockLotsResult);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorDeskView } from './EditorDeskView';
import { assignmentService } from '@/services/assignment.service';
import { seriesService } from '@/services/series.service';
import {
  EditorReviewQueueItemDto,
} from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const sampleItem = (overrides: Partial<EditorReviewQueueItemDto> = {}): EditorReviewQueueItemDto => ({
  assignmentId: 'asg-001',
  chapterId: 'chap-101',
  chapterNumber: 12,
  chapterTitle: 'Trận Chiến Ở Đền Thờ',
  seriesId: 'series-001',
  seriesTitle: 'Đại Chiến Thần Binh',
  pipelineStageId: 'stg-storyboard',
  stageName: 'Storyboard',
  stageOrder: 1,
  stageColorCode: '#9333EA',
  gate: 'gate1',
  status: 'Submitted',
  entityType: 'Page',
  targetEntityId: 'page-004',
  scopeLabel: 'Trang 4',
  assigneeUserId: 'usr-artist-1',
  assigneeName: 'Hoạ sĩ Tuấn',
  assigneeAvatarUrl: null,
  latestSubmissionId: 'sub-001',
  submissionAttempt: 1,
  submittedAt: '2026-11-10T08:30:00Z',
  isSelfSubmission: false,
  openChangeRequestsCount: 0,
  dueDate: '2026-11-15T00:00:00Z',
  priority: 'High',
  createdAt: '2026-11-09T00:00:00Z',
  artworkReferenceIds: ['art-001'],
  ...overrides,
});

const renderView = (props: Partial<React.ComponentProps<typeof EditorDeskView>> = {}) =>
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-001/editor/desk']}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/editor/desk'
          element={<EditorDeskView workspaceRole='EDITOR' {...props} />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('EditorDeskView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
  });

  it('renders loading state initially and then displays queue items', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([
      sampleItem(),
      sampleItem({
        assignmentId: 'asg-002',
        chapterNumber: 12,
        stageName: 'Mực & Thoại',
        gate: 'gate2',
        scopeLabel: 'Trang 5',
        status: 'UnderReview',
      }),
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({
      id: 'series-001',
      title: 'Đại Chiến Thần Binh',
    } as any);

    renderView();

    expect(screen.getByText(/Đang nạp hàng đợi duyệt bài của Editor/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn Thẩm Định Biên Tập (Editor Desk)')).toBeInTheDocument();
      expect(screen.getByText('Trang 4')).toBeInTheDocument();
      expect(screen.getByText('Trang 5')).toBeInTheDocument();
    });

    // Check Gate Pills
    expect(screen.getByText('Gate 1: Storyboard')).toBeInTheDocument();
    expect(screen.getByText('Gate 2: Composite')).toBeInTheDocument();
  });

  it('renders KPI metric summary cards correctly', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([
      sampleItem({ status: 'Submitted', gate: 'gate1' }),
      sampleItem({
        assignmentId: 'asg-002',
        status: 'UnderReview',
        gate: 'gate2',
      }),
      sampleItem({
        assignmentId: 'asg-003',
        status: 'Submitted',
        isSelfSubmission: true,
      }),
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getAllByText(/Chờ mở duyệt/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Đang thẩm định/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Khóa 4 mắt \(BR-26\)/i)).toBeInTheDocument();
    });

    // Count checks
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });

  it('enforces Rule BR-26 Anti-Self-Approval by locking self-submitted assignments', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([
      sampleItem({
        assignmentId: 'asg-self',
        isSelfSubmission: true,
        scopeLabel: 'Trang 1 Bản Vẽ Tự Làm',
      }),
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Trang 1 Bản Vẽ Tự Làm')).toBeInTheDocument();
    });

    // Verify warning banner is displayed
    expect(
      screen.getByText(/Quy tắc 4 mắt \(BR-26\)/i)
    ).toBeInTheDocument();

    // Verify button is disabled with lock text
    const lockedBtn = screen.getByRole('button', {
      name: /Khóa: Cần Editor khác duyệt/i,
    });
    expect(lockedBtn).toBeInTheDocument();
    expect(lockedBtn).toBeDisabled();

    // Ensure clicking locked button does nothing
    fireEvent.click(lockedBtn);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows opening review for non-self submissions and transitions to review screen', async () => {
    const item = sampleItem({
      assignmentId: 'asg-open-me',
      chapterId: 'chap-101',
      status: 'Submitted',
      isSelfSubmission: false,
    });
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([item]);
    vi.spyOn(assignmentService, 'openReview').mockResolvedValue({} as any);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    const onShowToast = vi.fn();
    renderView({ onShowToast });

    await waitFor(() => {
      expect(screen.getByText('Trang 4')).toBeInTheDocument();
    });

    const openBtn = screen.getByRole('button', { name: /Mở Thẩm Định/i });
    expect(openBtn).toBeInTheDocument();
    expect(openBtn).not.toBeDisabled();

    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(assignmentService.openReview).toHaveBeenCalledWith('chap-101', 'asg-open-me');
      expect(mockNavigate).toHaveBeenCalledWith(
        '/workspaces/ws-1/series/series-001/review/asg-open-me'
      );
      expect(onShowToast).toHaveBeenCalledWith(
        'Bắt đầu thẩm định',
        expect.stringContaining('Trang 4')
      );
    });
  });

  it('allows continuing review directly for UnderReview assignments without calling openReview', async () => {
    const item = sampleItem({
      assignmentId: 'asg-under-review',
      status: 'UnderReview',
      isSelfSubmission: false,
    });
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([item]);
    const openReviewSpy = vi.spyOn(assignmentService, 'openReview');
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Trang 4')).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole('button', { name: /Tiếp tục thẩm định/i });
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);

    expect(openReviewSpy).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-001/review/asg-under-review'
    );
  });

  it('filters queue items by Gate 1 and Gate 2 tabs', async () => {
    const getQueueSpy = vi
      .spyOn(assignmentService, 'getEditorReviewQueue')
      .mockResolvedValue([sampleItem()]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Gate 1: Storyboard')).toBeInTheDocument();
    });

    // Click Gate 2 tab
    const gate2Tab = screen.getByRole('button', { name: /Gate 2/i });
    fireEvent.click(gate2Tab);

    await waitFor(() => {
      expect(getQueueSpy).toHaveBeenCalledWith('series-001', {
        gate: 'gate2',
        status: undefined,
      });
    });
  });

  it('displays empty state when queue is empty', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(
        screen.getByText('Hàng Đợi Thẩm Định Đang Sạch (Inbox Zero)')
      ).toBeInTheDocument();
    });
  });
});

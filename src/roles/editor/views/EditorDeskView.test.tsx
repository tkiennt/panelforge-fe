import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorDeskView } from './EditorDeskView';
import { assignmentService } from '@/services/assignment.service';
import { bibleService } from '@/services/bible.service';
import { chapterService } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';
import { EditorReviewQueueItemDto } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const sampleItem = (
  overrides: Partial<EditorReviewQueueItemDto> = {},
): EditorReviewQueueItemDto => ({
  assignmentId: 'asg-001',
  chapterId: 'chap-101',
  chapterNumber: 12,
  chapterTitle: 'Trận Chiến Ở Đền Thờ',
  seriesId: 'series-001',
  seriesTitle: 'Đại Chiến Thần Binh',
  pipelineStageId: 'stg-storyboard',
  stageName: 'Storyboard',
  stageSlug: 'storyboard',
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
    </MemoryRouter>,
  );

describe('EditorDeskView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
    vi.spyOn(assignmentService, 'getTaskGridReviewQueue').mockResolvedValue([]);
    vi.spyOn(workspaceService, 'getMembers').mockResolvedValue([]);
    vi.spyOn(bibleService, 'getSeriesBible').mockResolvedValue(null as any);
    vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
    } as any);
  });

  it('renders loading state initially and then displays queue items', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([
      sampleItem(),
      sampleItem({
        assignmentId: 'asg-002',
        chapterNumber: 12,
        stageName: 'Mực & Thoại',
        stageSlug: 'letter',
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
      expect(screen.getByText(/Bàn thẩm định biên tập/i)).toBeInTheDocument();
      expect(screen.getByText('Trang 4')).toBeInTheDocument();
      expect(screen.getByText('Trang 5')).toBeInTheDocument();
    });

    // Check Gate Pills
    expect(screen.getAllByText(/Gate 1: Storyboard/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gate 2:.*Composite/i).length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByText(/Quy tắc 4 mắt \(BR-26\)/i)).toBeInTheDocument();

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
        '/workspaces/ws-1/series/series-001/chapters/chap-101/review/asg-open-me',
      );
      expect(onShowToast).toHaveBeenCalledWith(
        'Bắt đầu thẩm định',
        expect.stringContaining('Trang 4'),
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
      '/workspaces/ws-1/series/series-001/chapters/chap-101/review/asg-under-review',
    );
  });

  it('filters queue items by Gate 1 and Gate 2 tabs', async () => {
    const getQueueSpy = vi
      .spyOn(assignmentService, 'getEditorReviewQueue')
      .mockResolvedValue([sampleItem()]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getAllByText(/Gate 1: Storyboard/i).length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getByText('Hàng Đợi Thẩm Định Đang Sạch (Inbox Zero)')).toBeInTheDocument();
    });
  });

  it('Lát cắt 4 (Clean Cutover): đọc hàng đợi từ getTaskGridReviewQueue, khoá tự duyệt BR-06 và cho Duyệt / Yêu cầu sửa ô Lưới V3', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([]);
    vi.spyOn(assignmentService, 'getTaskGridReviewQueue').mockResolvedValue([
      {
        taskId: 'grid-task-1',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        chapterTitle: 'Trận Chiến Ở Đền Thờ',
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'page-007',
        pageNumber: 7,
        status: 'Submitted',
        assigneeUserId: 'usr-artist-1',
        attemptNumber: 2,
        submittedAt: '2026-11-14T09:00:00Z',
      },
      {
        taskId: 'grid-task-self',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-ink',
        stageName: 'Ink',
        pageId: 'page-008',
        pageNumber: 8,
        status: 'Submitted',
        assigneeUserId: 'usr-editor-self',
        attemptNumber: 1,
        submittedAt: '2026-11-14T09:30:00Z',
      },
    ]);
    const approveSpy = vi
      .spyOn(assignmentService, 'approveStageTask')
      .mockResolvedValue({ id: 'grid-task-1', status: 'Approved' } as any);
    const rejectSpy = vi
      .spyOn(assignmentService, 'requestStageTaskChanges')
      .mockResolvedValue({ id: 'grid-task-1', status: 'ReworkRequired' } as any);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView({ currentUserId: 'usr-editor-self', onShowToast: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText('Trang 7')).toBeInTheDocument();
      expect(screen.getByText('Trang 8')).toBeInTheDocument();
    });

    // Ô do chính Editor nộp bị khoá theo BR-06
    expect(screen.queryByTestId('editor-approve-grid-grid-task-self')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Khóa: Cần Editor khác duyệt/i })).toBeDisabled();

    // Yêu cầu sửa bắt buộc phải nhập nhận xét (BR-06)
    fireEvent.click(screen.getByTestId('editor-reject-toggle-grid-task-1'));
    const confirmRejectBtn = screen.getByTestId('editor-confirm-reject-grid-task-1');
    expect(confirmRejectBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nhận xét yêu cầu sửa'), {
      target: { value: 'Chỉnh lại tỉ lệ bàn tay ở khung 2' },
    });
    expect(confirmRejectBtn).not.toBeDisabled();
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        'chap-101',
        'grid-task-1',
        'Chỉnh lại tỉ lệ bàn tay ở khung 2',
      );
      expect(screen.queryByTestId('editor-confirm-reject-grid-task-1')).not.toBeInTheDocument();
    });

    // Duyệt trực tiếp ô Lưới V3
    fireEvent.click(screen.getByTestId('editor-approve-grid-grid-task-1'));
    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('chap-101', 'grid-task-1');
    });
  });

  it('calls openStageTaskReview before navigating to V3 detail review and blocks navigation on 409', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([]);
    const queueSpy = vi.spyOn(assignmentService, 'getTaskGridReviewQueue').mockResolvedValue([
      {
        taskId: 'grid-task-open',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'page-009',
        pageNumber: 9,
        status: 'Submitted',
        assigneeUserId: 'usr-artist-1',
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:00:00Z',
      },
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);
    const conflictErr = Object.assign(new Error('Ô này vừa được Editor khác mở duyệt.'), {
      status: 409,
    });
    const openSpy = vi
      .spyOn(assignmentService, 'openStageTaskReview')
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({
        id: 'grid-task-open',
        status: 'UnderReview',
        reviewerUserId: 'usr-editor-1',
      } as any);

    const onShowToast = vi.fn();
    renderView({ currentUserId: 'usr-editor-1', onShowToast });

    await waitFor(() => {
      expect(screen.getByText('Trang 9')).toBeInTheDocument();
    });

    // Lần 1: 409 -> báo đúng message BE, không điều hướng, nạp lại hàng đợi
    fireEvent.click(screen.getByTestId('editor-open-grid-review-grid-task-open'));
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('chap-101', 'grid-task-open');
      expect(onShowToast).toHaveBeenCalledWith(
        'Lỗi mở duyệt',
        'Ô này vừa được Editor khác mở duyệt.',
      );
      expect(queueSpy).toHaveBeenCalledTimes(2);
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    // Lần 2: 200 OK -> điều hướng vào màn duyệt chi tiết
    fireEvent.click(screen.getByTestId('editor-open-grid-review-grid-task-open'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/workspaces/ws-1/series/series-001/chapters/chap-101/review/grid-task-open',
      );
    });
  });

  it('locks UnderReview cells held by another Editor and lets Producer force-release lock', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([]);
    vi.spyOn(assignmentService, 'getTaskGridReviewQueue').mockResolvedValue([
      {
        taskId: 'grid-task-locked',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-ink',
        stageName: 'Ink',
        pageId: 'page-010',
        pageNumber: 10,
        status: 'UnderReview',
        assigneeUserId: 'usr-artist-1',
        reviewerUserId: 'usr-editor-2',
        reviewerName: 'Biên tập Minh',
        isInputOutdated: false,
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:30:00Z',
      },
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);
    const releaseSpy = vi
      .spyOn(assignmentService, 'releaseStageTaskReview')
      .mockResolvedValue({ id: 'grid-task-locked', status: 'Submitted' } as any);

    const { unmount } = renderView({ currentUserId: 'usr-editor-1', workspaceRole: 'EDITOR' });

    await waitFor(() => {
      expect(screen.getByTestId('editor-locked-by-other-grid-task-locked')).toHaveTextContent(
        /Đang được duyệt bởi Biên tập Minh/i,
      );
    });
    expect(screen.getByTestId('editor-open-grid-review-grid-task-locked')).toBeDisabled();
    expect(screen.getByTestId('editor-reject-toggle-grid-task-locked')).toBeDisabled();
    expect(screen.getByTestId('editor-approve-grid-grid-task-locked')).toBeDisabled();
    expect(screen.queryByTestId('editor-force-release-grid-task-locked')).not.toBeInTheDocument();

    unmount();

    renderView({ currentUserId: 'usr-producer-1', workspaceRole: 'PRODUCER' });
    const forceReleaseBtn = await screen.findByTestId('editor-force-release-grid-task-locked');
    fireEvent.click(forceReleaseBtn);
    await waitFor(() => {
      expect(releaseSpy).toHaveBeenCalledWith('chap-101', 'grid-task-locked');
    });
  });

  it('TASK-360: hiển thị chip "Được phân cho bạn" cho gợi ý mềm (Submitted), lọc "Của tôi / Tất cả" và không khoá ô Submitted gợi ý cho Editor khác', async () => {
    vi.spyOn(assignmentService, 'getEditorReviewQueue').mockResolvedValue([]);
    vi.spyOn(assignmentService, 'getTaskGridReviewQueue').mockResolvedValue([
      {
        taskId: 'grid-mine',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-pencil',
        stageName: 'Pencil',
        pageId: 'page-001',
        pageNumber: 1,
        status: 'Submitted',
        assigneeUserId: 'usr-artist-1',
        reviewerUserId: 'usr-editor-1',
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:00:00Z',
      },
      {
        taskId: 'grid-other-suggested',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-ink',
        stageName: 'Ink',
        pageId: 'page-002',
        pageNumber: 2,
        status: 'Submitted',
        assigneeUserId: 'usr-artist-1',
        reviewerUserId: 'usr-editor-2',
        reviewerName: 'Biên tập Minh',
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:05:00Z',
      },
      {
        taskId: 'grid-unassigned-reviewer',
        seriesId: 'series-001',
        seriesTitle: 'Đại Chiến Thần Binh',
        chapterId: 'chap-101',
        chapterNumber: 12,
        pipelineStageId: 'stg-color',
        stageName: 'Color',
        pageId: 'page-003',
        pageNumber: 3,
        status: 'Submitted',
        assigneeUserId: 'usr-artist-1',
        reviewerUserId: null,
        attemptNumber: 1,
        submittedAt: '2026-11-14T10:10:00Z',
      },
    ]);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001' } as any);

    renderView({ currentUserId: 'usr-editor-1', workspaceRole: 'EDITOR' });

    await waitFor(() => {
      expect(screen.getByText('Trang 1')).toBeInTheDocument();
      expect(screen.getByText('Trang 2')).toBeInTheDocument();
      expect(screen.getByText('Trang 3')).toBeInTheDocument();
    });

    const scopeAllBtn = screen.getByTestId('editor-scope-all');
    const scopeMineBtn = screen.getByTestId('editor-scope-mine');
    expect(scopeAllBtn).toHaveAttribute('aria-pressed', 'true');
    expect(scopeMineBtn).toHaveAttribute('aria-pressed', 'false');

    // Chỉ ô có reviewerUserId === currentUserId ở trạng thái Submitted mới hiện chip "Được phân cho bạn"
    expect(screen.getByTestId('editor-assigned-to-you-grid-mine')).toHaveTextContent(
      'Được phân cho bạn',
    );
    expect(
      screen.queryByTestId('editor-assigned-to-you-grid-other-suggested'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('editor-assigned-to-you-grid-unassigned-reviewer'),
    ).not.toBeInTheDocument();

    // Gợi ý mềm cho Editor khác khi status = Submitted KHÔNG khoá thao tác (R2)
    expect(
      screen.queryByTestId('editor-locked-by-other-grid-other-suggested'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('editor-open-grid-review-grid-other-suggested')).not.toBeDisabled();
    expect(screen.getByTestId('editor-approve-grid-grid-other-suggested')).not.toBeDisabled();
    expect(screen.getByTestId('editor-reject-toggle-grid-other-suggested')).not.toBeDisabled();

    // Lọc "Của tôi" chỉ giữ lại các mục có reviewerUserId === currentUserId
    fireEvent.click(scopeMineBtn);
    expect(scopeMineBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Trang 1')).toBeInTheDocument();
    expect(screen.queryByText('Trang 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Trang 3')).not.toBeInTheDocument();

    // Chuyển lại "Tất cả" hiện đủ cả 3 mục
    fireEvent.click(scopeAllBtn);
    expect(screen.getByText('Trang 1')).toBeInTheDocument();
    expect(screen.getByText('Trang 2')).toBeInTheDocument();
    expect(screen.getByText('Trang 3')).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemberSeriesPortal } from './MemberSeriesPortal';
import { assignmentService } from '@/services/assignment.service';
import type { SeriesDto } from '@/services/series.service';
import type { WorkspaceAssignmentDto } from '@/types/pipeline';

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid='authenticated-cover' src={src} alt={alt} />
  ),
}));

const makeSeries = (overrides: Partial<SeriesDto> = {}): SeriesDto => ({
  id: 'series-1',
  workspaceId: 'ws-1',
  title: 'Hành Trình Bất Tận',
  synopsis: 'Câu chuyện phiêu lưu kỳ ảo của nhóm thiếu niên.',
  readingDirection: 1,
  genre: 'Action',
  format: 'Manga',
  chaptersCount: 4,
  isCompleted: false,
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
  ...overrides,
});

const makeAssignment = (
  overrides: Partial<WorkspaceAssignmentDto> = {},
): WorkspaceAssignmentDto => ({
  id: 'asg-1',
  seriesId: 'series-1',
  seriesTitle: 'Hành Trình Bất Tận',
  chapterId: 'chap-1',
  chapterNumber: 3,
  chapterTitle: ' Khởi hành ',
  entityType: 'Page',
  targetEntityId: 'page-2',
  pipelineStageId: 'stage-ink',
  stageName: 'Ink',
  stageOrder: 1,
  scopeLabel: 'Trang 2',
  assigneeUserId: 'u-writer',
  assignedRole: 'WRITER',
  brief: 'Viết hội thoại cao trào',
  dueDate: '2026-12-05T00:00:00Z',
  priority: 'Medium',
  status: 'InProgress',
  createdAt: '2026-11-20T00:00:00Z',
  ...overrides,
});

describe('MemberSeriesPortal (TASK-367 / DESIGN_RULES §4.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(assignmentService, 'getMyWorkspaceAssignments').mockResolvedValue([]);
  });

  it('renders PageHeader, kraft SectionHeader count chip, SeriesImageFallbacks, and horizontal workbench layout for a single series without duplicate task counters', async () => {
    const onOpenSeries = vi.fn();

    render(
      <MemberSeriesPortal
        workspaceId='ws-1'
        workspaceName='Sakura Ink Studio'
        userName='Minh Writer'
        workspaceRole='WRITER'
        seriesList={[makeSeries({ coverUrl: null, avatarUrl: null })]}
        loading={false}
        onOpenSeries={onOpenSeries}
      />,
    );

    await waitFor(() => {
      expect(assignmentService.getMyWorkspaceAssignments).toHaveBeenCalledWith('ws-1');
    });

    // PageHeader: studio eyebrow, H1 title, personal greeting, no duplicate "đầu việc đang giao" pill in header
    expect(screen.getByText('Sakura Ink Studio')).toHaveClass('text-sienna');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Chọn Bộ truyện để làm việc' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chào mừng trở lại, Minh Writer/i)).toBeInTheDocument();
    expect(screen.queryByText(/đầu việc đang giao/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Automation' })).not.toBeInTheDocument();

    // SectionHeader: count chip uses kraft token, not a bordered filter button
    const countChip = screen.getByText('Hiển thị 1/1 bộ truyện');
    expect(countChip.tagName).toBe('SPAN');
    expect(countChip).toHaveClass('bg-kraft', 'text-kraft-ink');

    // Card uses Surface Card/CardHeader (bg-head-wash) + SeriesImageFallbacks (no black placeholder)
    const card = screen.getByTestId('portal-series-series-1');
    expect(card).toHaveClass('border-t-accent');
    expect(within(card).getByTestId('series-banner-fallback')).toBeInTheDocument();
    expect(within(card).getByTestId('series-avatar-fallback')).toBeInTheDocument();
    expect(within(card).getByTestId('portal-role-chip-series-1')).toHaveTextContent('Biên kịch');
    expect(within(card).getByTestId('portal-status-chip-series-1')).toHaveTextContent(
      'Đang sản xuất',
    );
    expect(within(card).getByTestId('portal-task-count-series-1')).toHaveTextContent('0');

    // Compact lightweight CTA when 0 tasks (not full-width solid orange)
    const ctaBtn = screen.getByTestId('open-series-btn-series-1');
    expect(ctaBtn).toHaveTextContent('Xem việc của tôi');
    expect(ctaBtn).not.toHaveClass('w-full');
    expect(ctaBtn).toHaveClass('bg-white');

    fireEvent.click(ctaBtn);
    expect(onOpenSeries).toHaveBeenCalledWith('series-1');
  });

  it('sorts open tasks (urgent first, nearest due date), excludes Approved, highlights at most one featured card, and exposes Automation action only when provided (BR-07)', async () => {
    const onOpenSeries = vi.fn();
    const onOpenAutomation = vi.fn();

    vi.spyOn(assignmentService, 'getMyWorkspaceAssignments').mockResolvedValue([
      makeAssignment({
        id: 'asg-approved',
        seriesId: 'series-1',
        scopeLabel: 'Trang 1',
        status: 4, // numeric Approved
      }),
      makeAssignment({
        id: 'asg-later',
        seriesId: 'series-2',
        scopeLabel: 'Trang 9',
        dueDate: '2026-12-20T00:00:00Z',
        status: 'Assigned',
      }),
      makeAssignment({
        id: 'asg-rework',
        seriesId: 'series-2',
        scopeLabel: 'Trang 4',
        brief: 'Sửa thoại khung 2',
        dueDate: '2026-12-25T00:00:00Z',
        status: 'ReworkRequired',
      }),
    ]);

    render(
      <MemberSeriesPortal
        workspaceId='ws-1'
        workspaceRole='EDITOR'
        seriesList={[
          makeSeries({
            id: 'series-1',
            title: 'Bộ Truyện Một',
            chaptersCount: 0,
            coverUrl: '/covers/s1.png',
          }),
          makeSeries({
            id: 'series-2',
            title: 'Bộ Truyện Hai',
            chaptersCount: 6,
            isCompleted: true,
          }),
        ]}
        loading={false}
        onOpenSeries={onOpenSeries}
        onOpenAutomation={onOpenAutomation}
      />,
    );

    const card1 = await screen.findByTestId('portal-series-series-1');
    const card2 = screen.getByTestId('portal-series-series-2');

    // Wait for assignments to settle
    await waitFor(() => {
      expect(within(card2).getByTestId('portal-task-count-series-2')).toHaveTextContent('2');
    });

    // Approved task on series-1 is excluded -> 0 open tasks
    expect(within(card1).getByTestId('portal-task-count-series-1')).toHaveTextContent('0');
    expect(within(card1).getByTestId('authenticated-cover')).toHaveAttribute(
      'src',
      '/covers/s1.png',
    );
    expect(within(card1).getByTestId('portal-status-chip-series-1')).toHaveTextContent('Tiền kỳ');
    expect(within(card2).getByTestId('portal-status-chip-series-2')).toHaveTextContent(
      'Hoàn thành',
    );

    // DESIGN_RULES §4.8.4: Only series-2 (urgent rework) is featured (danger top strip) + primary CTA
    expect(card1).not.toHaveClass('border-t-accent', 'border-t-rose-500');
    expect(card2).toHaveClass('border-t-rose-500');
    expect(within(card2).getByText('Cần ưu tiên')).toBeInTheDocument();

    const items = within(card2).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Trang 4');
    expect(items[0]).toHaveTextContent('Cần sửa');
    expect(items[1]).toHaveTextContent('Trang 9');

    expect(screen.getByTestId('open-series-btn-series-2')).toHaveClass('bg-orange-600');
    expect(screen.getByTestId('open-series-btn-series-1')).toHaveClass('bg-white');

    // Editor Automation button works
    fireEvent.click(screen.getByRole('button', { name: 'Automation' }));
    expect(onOpenAutomation).toHaveBeenCalledTimes(1);
  });

  it('filters series by search query and resets search from no-results state', async () => {
    render(
      <MemberSeriesPortal
        workspaceId='ws-1'
        workspaceRole='ARTIST'
        seriesList={[
          makeSeries({ id: 's-1', title: 'Hành Trình Bất Tận', genre: 'Action' }),
          makeSeries({ id: 's-2', title: 'Thành Phố Hoàng Hôn', genre: 'Mystery' }),
        ]}
        loading={false}
        onOpenSeries={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(assignmentService.getMyWorkspaceAssignments).toHaveBeenCalledWith('ws-1');
    });

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Mystery' } });

    expect(screen.queryByText('Hành Trình Bất Tận')).not.toBeInTheDocument();
    expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1/2 bộ truyện')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Không tồn tại' } });
    expect(screen.getByText('Không tìm thấy bộ truyện phù hợp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }));
    expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
  });
});

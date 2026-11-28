import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EditorSeriesDashboardView } from './EditorSeriesDashboardView';
import { sumReviewStats } from './reviewStats';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import { seriesService } from '@/services/series.service';
import type { ChapterReviewStatsDto } from '@/types';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getSeriesReviewStats: vi.fn(),
    getChangeRequests: vi.fn(),
    getConsistencyFindings: vi.fn(),
    getStageProgress: vi.fn(),
  },
}));
vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getPipelineStages: vi.fn(),
  },
}));
vi.mock('@/services/series.service', () => ({
  seriesService: { getSeriesById: vi.fn() },
}));

const row = (n: number, over: Partial<ChapterReviewStatsDto> = {}): ChapterReviewStatsDto => ({
  chapterId: `c${n}`,
  chapterNumber: n,
  title: `Tập ${n}`,
  status: 'InProduction',
  scriptStatus: 'Frozen',
  waitingReview: 0,
  inReview: 0,
  openChangeRequests: 0,
  resolvedChangeRequests: 0,
  verifiedChangeRequests: 0,
  overdueChangeRequests: 0,
  openFindings: 0,
  blockingFindings: 0,
  approved: 0,
  rejected: 0,
  firstPassApproved: 0,
  tasksTotal: 0,
  tasksApproved: 0,
  tasksInProgress: 0,
  tasksRework: 0,
  tasksOverdue: 0,
  ...over,
});

describe('sumReviewStats', () => {
  it('adds chapters up, computes production percent, scripts in review, and first-pass rate', () => {
    const t = sumReviewStats([
      row(1, {
        waitingReview: 2,
        inReview: 1,
        approved: 3,
        rejected: 1,
        firstPassApproved: 2,
        tasksTotal: 10,
        tasksApproved: 6,
        tasksInProgress: 2,
        tasksRework: 1,
        tasksOverdue: 1,
        scriptStatus: 'InReview',
      }),
      row(2, {
        waitingReview: 1,
        resolvedChangeRequests: 4,
        tasksTotal: 10,
        tasksApproved: 4,
        scriptStatus: 'Draft',
      }),
    ]);
    expect(t.queue).toBe(4);
    expect(t.resolvedChangeRequests).toBe(4);
    expect(t.firstPassRate).toBe(50);
    expect(t.tasksTotal).toBe(20);
    expect(t.tasksApproved).toBe(10);
    expect(t.productionPercent).toBe(50);
    expect(t.scriptsInReview).toBe(1);
  });

  it('returns null first-pass rate without decisions', () => {
    expect(sumReviewStats([row(1)]).firstPassRate).toBeNull();
  });

  it('returns null production percent when tasksTotal is 0', () => {
    expect(sumReviewStats([row(1)]).productionPercent).toBeNull();
  });
});

const LocationConsumer: React.FC = () => {
  const location = useLocation();
  return <div data-testid='current-search'>{location.search}</div>;
};

describe('EditorSeriesDashboardView', () => {
  beforeEach(() => {
    vi.mocked(seriesService.getSeriesById).mockResolvedValue({ id: 's1', title: 'Alpha' } as never);
    vi.mocked(assignmentService.getSeriesReviewStats).mockResolvedValue({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [
        row(2, { scriptStatus: 'InReview' }),
        row(1, { waitingReview: 3, resolvedChangeRequests: 2, tasksTotal: 5, tasksApproved: 3 }),
      ],
      decisions: [],
      avgReviewHours: null,
    });
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValue([]);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);
    vi.mocked(pipelineService.getPipelineStages).mockResolvedValue([]);
  });

  it('shows totals and sets search params when chapter detail button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard']}>
        <LocationConsumer />
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<EditorSeriesDashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const btn = await screen.findByTestId('editor-dash-open-chapter-c1');
    expect(screen.getByTestId('editor-dash-kpi-queue').textContent).toContain('3');
    expect(screen.getByTestId('editor-dash-kpi-verify').textContent).toContain('2');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Tập 1');
    expect(rows[1].textContent).toContain('Tập 2');

    fireEvent.click(btn);
    expect(screen.getByTestId('current-search').textContent).toBe('?chapter=c1');
  });

  it('shows production progress chart when chapters have tasks', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<EditorSeriesDashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tiến độ sản xuất theo chương')).toBeTruthy();
  });

  it('hides production progress chart when no chapter has tasks', async () => {
    vi.mocked(assignmentService.getSeriesReviewStats).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [row(1, { tasksTotal: 0 }), row(2, { tasksTotal: 0 })],
      decisions: [],
      avgReviewHours: null,
    });
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<EditorSeriesDashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('editor-series-dashboard');
    expect(screen.queryByText('Tiến độ sản xuất theo chương')).toBeNull();
  });

  it('displays series status summary and KPI strip items', async () => {
    vi.mocked(assignmentService.getSeriesReviewStats).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [
        row(1, {
          tasksTotal: 10,
          tasksApproved: 8,
          tasksOverdue: 2,
          tasksRework: 1,
          approved: 4,
          firstPassApproved: 3,
          scriptStatus: 'InReview',
        }),
      ],
      decisions: [],
      avgReviewHours: 2.5,
      bible: {
        entries: 10,
        draft: 2,
        conceptSubmitted: 3,
        reworkRequired: 1,
        canonLocked: 4,
      },
    });
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<EditorSeriesDashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('editor-dash-series-status')).toBeTruthy();
    const statusText = screen.getByTestId('editor-dash-series-status').textContent;
    expect(statusText).toContain('Sản xuất 80%');
    expect(statusText).toContain('2 việc trễ hạn');
    expect(statusText).toContain('1 việc làm lại');
    expect(statusText).toContain('Bible: 4/10 đã khoá canon');
    expect(statusText).toContain('Duyệt lần đầu 75%');
    expect(statusText).toContain('TB 2,5 giờ/lượt');

    expect(screen.getByTestId('editor-dash-kpi-scripts').textContent).toContain('1');
    expect(screen.getByTestId('editor-dash-kpi-bible').textContent).toContain('3');
  });

  it('opens drawer when ?chapter=id is in URL and displays chapter detail', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard?chapter=c2']}>
        <LocationConsumer />
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<EditorSeriesDashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Chương 2 - Tập 2')).toBeTruthy();
    expect(screen.getByText('Duyệt kịch bản')).toBeTruthy();
    expect(screen.getByText('Mở bàn duyệt chương này')).toBeTruthy();
    expect(await screen.findByTestId('editor-chapter-detail')).toBeTruthy();

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(screen.getByTestId('current-search').textContent).toBe('');
  });
});

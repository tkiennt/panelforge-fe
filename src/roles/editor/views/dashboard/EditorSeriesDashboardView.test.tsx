import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorSeriesDashboardView } from './EditorSeriesDashboardView';
import { sumReviewStats } from './reviewStats';
import { assignmentService } from '@/services/assignment.service';
import { seriesService } from '@/services/series.service';
import type { ChapterReviewStatsDto } from '@/types';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: { getSeriesReviewStats: vi.fn() },
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
  ...over,
});

describe('sumReviewStats', () => {
  it('adds chapters up and computes first-pass rate over all decisions', () => {
    const t = sumReviewStats([
      row(1, { waitingReview: 2, inReview: 1, approved: 3, rejected: 1, firstPassApproved: 2 }),
      row(2, { waitingReview: 1, resolvedChangeRequests: 4 }),
    ]);
    expect(t.queue).toBe(4);
    expect(t.resolvedChangeRequests).toBe(4);
    expect(t.firstPassRate).toBe(50);
  });

  it('returns null first-pass rate without decisions', () => {
    expect(sumReviewStats([row(1)]).firstPassRate).toBeNull();
  });
});

describe('EditorSeriesDashboardView', () => {
  beforeEach(() => {
    vi.mocked(seriesService.getSeriesById).mockResolvedValue({ id: 's1', title: 'Alpha' } as never);
    vi.mocked(assignmentService.getSeriesReviewStats).mockResolvedValue({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [
        row(2, { scriptStatus: 'InReview' }),
        row(1, { waitingReview: 3, resolvedChangeRequests: 2 }),
      ],
      decisions: [],
      avgReviewHours: null,
    });
  });

  it('shows totals and links each chapter to its review overview', async () => {
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

    const link = await screen.findByTestId('editor-dash-open-chapter-c1');
    expect(link.getAttribute('href')).toBe('/workspaces/w1/series/s1/editor/dashboard/c1');
    expect(screen.getByTestId('editor-dash-kpi-queue').textContent).toContain('3');
    expect(screen.getByTestId('editor-dash-kpi-verify').textContent).toContain('2');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Tập 1');
    expect(rows[1].textContent).toContain('Tập 2');
  });

  it('shows 30-day decisions chart when there are decisions', async () => {
    vi.mocked(assignmentService.getSeriesReviewStats).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [row(1)],
      decisions: [{ date: '2026-11-20T00:00:00Z', approved: 2, rejected: 1 }],
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

    expect(await screen.findByText('Lượt duyệt 30 ngày')).toBeTruthy();
  });
});

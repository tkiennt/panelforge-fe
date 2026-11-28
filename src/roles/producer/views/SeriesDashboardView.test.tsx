import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SeriesDashboardView } from './SeriesDashboardView';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/series.service', () => ({
  seriesService: { getSeriesProgress: vi.fn(), getSeriesById: vi.fn() },
}));

const chapter = (n: number, status: string, percent: number, overdue = 0) => ({
  chapterId: `c${n}`,
  chapterNumber: n,
  title: `Tập ${n}`,
  status,
  targetReleaseDate: null,
  pageCount: 4,
  panelCount: 12,
  percentComplete: percent,
  stages: [],
  assignmentsByStatus: {},
  overdueAssignments: overdue,
});

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/workspaces/w1/series/s1/dashboard']}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/dashboard'
          element={<SeriesDashboardView />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('SeriesDashboardView (UC-16)', () => {
  beforeEach(() => {
    vi.mocked(seriesService.getSeriesById).mockResolvedValue({ id: 's1', title: 'Alpha' } as never);
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValue({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(2, 'PreProduction', 0), chapter(1, 'InProduction', 50, 2)],
      workload: [
        {
          userId: 'u1',
          fullName: 'A',
          role: 'Artist',
          open: 3,
          overdue: 1,
          waitingReview: 2,
          done: 4,
        },
      ],
      overdue: [],
      burndown: [],
    });
  });

  it('lists chapters in order with links down to the chapter overview', async () => {
    renderView();
    const link = await screen.findByTestId('series-dashboard-open-chapter-c1');
    expect(link.getAttribute('href')).toBe('/workspaces/w1/series/s1/chapters?chapterId=c1');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Tập 1');
    expect(rows[1].textContent).toContain('Tập 2');
  });

  it('shows average completion and waiting-review totals', async () => {
    renderView();
    expect(await screen.findByText('25%')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows progress by chapter chart when at least one chapter has percentComplete > 0', async () => {
    renderView();
    expect(await screen.findByText('Tiến độ theo chương')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Tiến độ theo chương' })).toBeTruthy();
  });

  it('hides progress by chapter chart when all chapters have percentComplete = 0', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(1, 'InProduction', 0), chapter(2, 'PreProduction', 0)],
      workload: [],
      overdue: [],
      burndown: [],
    });
    renderView();
    await screen.findByTestId('series-dashboard-open-chapter-c1');
    expect(screen.queryByText('Tiến độ theo chương')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Tiến độ theo chương' })).toBeNull();
  });
});

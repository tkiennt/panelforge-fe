import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    const chaptersCard = screen
      .getByText('Các chương')
      .closest('div[class*="rounded-xl"]') as HTMLElement;
    const rows = within(chaptersCard).getAllByRole('row').slice(1);
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

  it('shows burndown chart when at least one burndown point has remaining > 0', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(1, 'InProduction', 50)],
      workload: [],
      overdue: [],
      burndown: [
        { date: '2026-11-20T00:00:00Z', remaining: 10 },
        { date: '2026-11-21T00:00:00Z', remaining: 5 },
      ],
    });
    renderView();
    expect(await screen.findByText('Việc còn lại theo ngày')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Việc còn lại theo ngày' })).toBeTruthy();
  });

  it('hides burndown chart when burndown is empty', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(1, 'InProduction', 50)],
      workload: [],
      overdue: [],
      burndown: [],
    });
    renderView();
    await screen.findByTestId('series-dashboard-open-chapter-c1');
    expect(screen.queryByText('Việc còn lại theo ngày')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Việc còn lại theo ngày' })).toBeNull();
  });

  it('hides burndown chart when all burndown points have remaining = 0', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(1, 'InProduction', 50)],
      workload: [],
      overdue: [],
      burndown: [
        { date: '2026-11-20T00:00:00Z', remaining: 0 },
        { date: '2026-11-21T00:00:00Z', remaining: 0 },
      ],
    });
    renderView();
    await screen.findByTestId('series-dashboard-open-chapter-c1');
    expect(screen.queryByText('Việc còn lại theo ngày')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Việc còn lại theo ngày' })).toBeNull();
  });

  it('sorts crew workload by overdue descending then open descending, up to 6 members', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [],
      workload: [
        {
          userId: 'u1',
          fullName: 'Crew 1',
          role: 'Artist',
          open: 5,
          overdue: 0,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u2',
          fullName: 'Crew 2',
          role: 'Colorist',
          open: 1,
          overdue: 3,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u3',
          fullName: 'Crew 3',
          role: 'Inker',
          open: 4,
          overdue: 1,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u4',
          fullName: 'Crew 4',
          role: 'Writer',
          open: 2,
          overdue: 1,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u5',
          fullName: 'Crew 5',
          role: 'Editor',
          open: 1,
          overdue: 0,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u6',
          fullName: 'Crew 6',
          role: 'Letterer',
          open: 3,
          overdue: 0,
          waitingReview: 0,
          done: 0,
        },
        {
          userId: 'u7',
          fullName: 'Crew 7',
          role: 'Supervisor',
          open: 0,
          overdue: 0,
          waitingReview: 0,
          done: 0,
        },
      ],
      overdue: [],
      burndown: [],
    });
    renderView();
    expect(await screen.findByText('Tải việc ê-kíp')).toBeTruthy();

    const workloadCard = screen
      .getByText('Tải việc ê-kíp')
      .closest('div[class*="rounded-xl"]') as HTMLElement;
    const rows = within(workloadCard).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(rows[0].textContent).toContain('Crew 2');
    expect(rows[1].textContent).toContain('Crew 3');
    expect(rows[2].textContent).toContain('Crew 4');
    expect(rows[3].textContent).toContain('Crew 1');
    expect(rows[4].textContent).toContain('Crew 6');
    expect(rows[5].textContent).toContain('Crew 5');
    expect(within(workloadCard).queryByText('Crew 7')).toBeNull();
  });

  it('renders link to crew workspace with tab=crew', async () => {
    renderView();
    expect(await screen.findByText('Tải việc ê-kíp')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Xem ê-kíp & tải việc' });
    expect(link.getAttribute('href')).toBe('/workspaces/w1/series/s1/workspace?tab=crew');
  });

  it('hides crew workload card when workload is empty', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce({
      seriesId: 's1',
      generatedAt: '2026-11-28T00:00:00Z',
      chapters: [chapter(1, 'InProduction', 50)],
      workload: [],
      overdue: [],
      burndown: [],
    });
    renderView();
    await screen.findByTestId('series-dashboard-open-chapter-c1');
    expect(screen.queryByText('Tải việc ê-kíp')).toBeNull();
  });
});

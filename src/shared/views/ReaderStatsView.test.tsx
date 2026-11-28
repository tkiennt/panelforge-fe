import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReaderStatsView } from './ReaderStatsView';
import { monetizationService } from '@/services/payment.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/payment.service', () => ({
  monetizationService: { getReaderStats: vi.fn() },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: { getReaderTimeseries: vi.fn() },
}));

const emptyTrend = {
  granularity: 'Day' as const,
  from: '2026-10-30T00:00:00Z',
  to: '2026-11-29T00:00:00Z',
  points: [{ periodStart: '2026-11-28T00:00:00Z', views: 0, uniqueReaders: 0, revenueVnd: 0 }],
};

const chapter = (n: number, views: number) => ({
  chapterId: `c${n}`,
  chapterNumber: n,
  title: null,
  isPublished: true,
  views,
  uniqueReaders: views,
});

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path='/w/:workspaceId' element={<ReaderStatsView />} />
        <Route path='/w/:workspaceId/s/:seriesId' element={<ReaderStatsView />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReaderStatsView charts (BR-32)', () => {
  beforeEach(() => {
    vi.mocked(workspaceService.getReaderTimeseries).mockReset();
    vi.mocked(workspaceService.getReaderTimeseries).mockResolvedValue(emptyTrend);
    vi.mocked(monetizationService.getReaderStats).mockResolvedValue({
      totalViews: 30,
      totalUniqueReaders: 12,
      series: [
        {
          seriesId: 's1',
          title: 'Alpha',
          views: 20,
          uniqueReaders: 8,
          chapters: [chapter(2, 5), chapter(1, 15)],
        },
        { seriesId: 's2', title: 'Beta', views: 10, uniqueReaders: 4, chapters: [] },
      ],
    });
  });

  it('ranks series by views when the Studio has several series', async () => {
    renderAt('/w/ws1');
    expect(
      await screen.findByRole('img', { name: /Lượt đọc theo bộ truyện|Reads by series/ }),
    ).toBeInTheDocument();
  });

  it('switches to a per-chapter chart when scoped to one series', async () => {
    renderAt('/w/ws1/s/s1');
    expect(await screen.findByRole('img', { name: /Alpha/ })).toBeInTheDocument();
  });

  it('hides the chart when every value is zero', async () => {
    vi.mocked(monetizationService.getReaderStats).mockResolvedValue({
      totalViews: 0,
      totalUniqueReaders: 0,
      series: [{ seriesId: 's1', title: 'Alpha', views: 0, uniqueReaders: 0, chapters: [] }],
    });
    renderAt('/w/ws1');
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('loads the 30-day daily trend for the workspace and series by default', async () => {
    renderAt('/w/ws1/s/s1');
    await waitFor(() => expect(workspaceService.getReaderTimeseries).toHaveBeenCalled());
    expect(workspaceService.getReaderTimeseries).toHaveBeenLastCalledWith(
      'ws1',
      expect.objectContaining({ granularity: 'Day', seriesId: 's1' }),
    );
  });

  it('draws the trend line when a period has reads and switches to monthly for 12 months', async () => {
    vi.mocked(workspaceService.getReaderTimeseries).mockResolvedValue({
      ...emptyTrend,
      points: [{ periodStart: '2026-11-28T00:00:00Z', views: 7, uniqueReaders: 3, revenueVnd: 0 }],
    });
    renderAt('/w/ws1');
    expect(
      await screen.findByRole('img', { name: /Lượt đọc theo thời gian|Reads over time/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /12 tháng|12 months/ }));
    await waitFor(() =>
      expect(workspaceService.getReaderTimeseries).toHaveBeenLastCalledWith(
        'ws1',
        expect.objectContaining({ granularity: 'Month' }),
      ),
    );
  });
});

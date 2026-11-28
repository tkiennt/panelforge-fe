import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReaderStatsView } from './ReaderStatsView';
import { monetizationService } from '@/services/payment.service';

vi.mock('@/services/payment.service', () => ({
  monetizationService: { getReaderStats: vi.fn() },
}));

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
});

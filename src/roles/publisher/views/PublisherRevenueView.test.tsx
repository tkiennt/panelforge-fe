import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherRevenueView } from './PublisherRevenueView';
import { monetizationService } from '@/services/payment.service';

vi.mock('@/services/payment.service', () => ({
  monetizationService: { getPublisherRevenue: vi.fn(), getRevenueTimeseries: vi.fn() },
}));

vi.mock('@/services/publisher.service', () => ({
  publisherService: { getWorkspaces: vi.fn().mockResolvedValue([]) },
}));

describe('PublisherRevenueView trend charts (BR-32)', () => {
  beforeEach(() => {
    vi.mocked(monetizationService.getPublisherRevenue).mockResolvedValue({
      summary: { totalRevenueVnd: 0, chapterRevenueVnd: 0, pendingCount: 0, totalViews: 0 },
      series: [],
    });
    vi.mocked(monetizationService.getRevenueTimeseries).mockResolvedValue({
      granularity: 'Day',
      from: '2026-10-30T00:00:00Z',
      to: '2026-11-29T00:00:00Z',
      points: [
        { periodStart: '2026-11-27T00:00:00Z', views: 4, uniqueReaders: 2, revenueVnd: 0 },
        { periodStart: '2026-11-28T00:00:00Z', views: 9, uniqueReaders: 5, revenueVnd: 6000 },
      ],
    });
  });

  it('shows reads and revenue over time as two separate charts', async () => {
    render(
      <MemoryRouter>
        <PublisherRevenueView />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('img', { name: /Lượt đọc theo thời gian|Reads over time/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Doanh thu theo thời gian|Revenue over time/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(monetizationService.getRevenueTimeseries).toHaveBeenCalledWith(
        expect.objectContaining({ granularity: 'Day', workspaceId: undefined }),
      ),
    );
  });
});

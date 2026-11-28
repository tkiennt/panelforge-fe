import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailDeliveryLogCard } from './EmailDeliveryLogCard';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/admin.service')>()),
  adminService: {
    getEmailLogs: vi.fn().mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      failedLast24h: 0,
    }),
  },
}));

describe('EmailDeliveryLogCard date range', () => {
  it('sends the local day range as UTC from / to and resets to page 1', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <EmailDeliveryLogCard />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(adminService.getEmailLogs).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-11-21' } });

    await waitFor(() =>
      expect(adminService.getEmailLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          from: new Date('2026-11-20T00:00:00').toISOString(),
          to: new Date('2026-11-21T23:59:59.999').toISOString(),
        }),
      ),
    );
  });
});

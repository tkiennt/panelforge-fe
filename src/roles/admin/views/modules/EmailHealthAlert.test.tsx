import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailHealthAlert } from './EmailHealthAlert';
import { adminService, type AdminEmailHealthDto } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: { getEmailHealth: vi.fn() },
}));

const base: AdminEmailHealthDto = {
  status: 'OK',
  isConfigured: true,
  problem: null,
  lastSentAt: '2026-11-28T09:00:00Z',
  lastSucceeded: true,
  lastFailureReason: null,
  recentTotal: 4,
  recentFailed: 0,
  windowHours: 24,
};

const renderAlert = (props: React.ComponentProps<typeof EmailHealthAlert> = {}) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EmailHealthAlert {...props} />
    </QueryClientProvider>,
  );

describe('EmailHealthAlert', () => {
  beforeEach(() => {
    vi.mocked(adminService.getEmailHealth).mockReset();
  });

  it('renders nothing when sending is healthy', async () => {
    vi.mocked(adminService.getEmailHealth).mockResolvedValue(base);
    const { container } = renderAlert();
    await waitFor(() => expect(adminService.getEmailHealth).toHaveBeenCalled());
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('warns when SMTP is not configured and links to the settings', async () => {
    vi.mocked(adminService.getEmailHealth).mockResolvedValue({
      ...base,
      status: 'NOT_CONFIGURED',
      isConfigured: false,
      problem: 'NOT_CONFIGURED',
    });
    const onOpenSettings = vi.fn();
    renderAlert({ onOpenSettings, onOpenLogs: vi.fn() });

    expect(await screen.findByText('Email hệ thống chưa được cấu hình')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xem Lịch sử email' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mở Cấu hình email' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('warns when the last send failed with the reason and counts', async () => {
    vi.mocked(adminService.getEmailHealth).mockResolvedValue({
      ...base,
      status: 'LAST_SEND_FAILED',
      lastSucceeded: false,
      lastFailureReason: 'AUTH_FAILED',
      recentFailed: 3,
    });
    const onOpenLogs = vi.fn();
    renderAlert({ onOpenSettings: vi.fn(), onOpenLogs });

    expect(await screen.findByText('Gửi email đang bị lỗi')).toBeTruthy();
    expect(screen.getByText(/3\/4 email lỗi trong 24 giờ qua/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xem Lịch sử email' }));
    expect(onOpenLogs).toHaveBeenCalled();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailSettingsView } from './EmailSettingsView';
import { adminService, type AdminEmailSettingsDto } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getEmailSettings: vi.fn(),
    updateEmailSettings: vi.fn(),
    sendTestEmail: vi.fn(),
  },
}));

const notConfigured: AdminEmailSettingsDto = {
  isConfigured: false,
  smtpServer: null,
  smtpPort: null,
  senderName: null,
  senderEmail: null,
  hasPassword: false,
  changedAt: null,
  changedByName: null,
};

const configured: AdminEmailSettingsDto = {
  isConfigured: true,
  smtpServer: 'smtp.gmail.com',
  smtpPort: 587,
  senderName: 'PanelForge',
  senderEmail: 'noreply@panelforge.vn',
  hasPassword: true,
  changedAt: '2026-11-28T08:00:00Z',
  changedByName: 'Quản Trị',
};

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EmailSettingsView />
    </QueryClientProvider>,
  );

describe('EmailSettingsView', () => {
  beforeEach(() => {
    vi.mocked(adminService.getEmailSettings).mockReset();
    vi.mocked(adminService.updateEmailSettings).mockReset();
    vi.mocked(adminService.sendTestEmail).mockReset();
  });

  it('requires a password on first setup and does not submit without it', async () => {
    vi.mocked(adminService.getEmailSettings).mockResolvedValue(notConfigured);
    renderView();
    await screen.findByText('Chưa cấu hình trong app');

    fireEvent.change(screen.getByLabelText(/Email gửi đi/), {
      target: { value: 'noreply@panelforge.vn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    expect(await screen.findByText('Nhập mật khẩu SMTP cho lần cấu hình đầu tiên.')).toBeTruthy();
    expect(adminService.updateEmailSettings).not.toHaveBeenCalled();
  });

  it('keeps the saved password when the field is left blank', async () => {
    vi.mocked(adminService.getEmailSettings).mockResolvedValue(configured);
    vi.mocked(adminService.updateEmailSettings).mockResolvedValue(configured);
    renderView();
    await screen.findByText('Đang dùng cấu hình này');
    await waitFor(() =>
      expect((screen.getByLabelText(/Email gửi đi/) as HTMLInputElement).value).toBe(
        'noreply@panelforge.vn',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    await waitFor(() =>
      expect(adminService.updateEmailSettings).toHaveBeenCalledWith({
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,
        senderName: 'PanelForge',
        senderEmail: 'noreply@panelforge.vn',
        password: null,
      }),
    );
  });

  it('shows the server error when the test email cannot be sent', async () => {
    vi.mocked(adminService.getEmailSettings).mockResolvedValue(configured);
    vi.mocked(adminService.sendTestEmail).mockRejectedValue(new Error('Không gửi được email thử.'));
    renderView();
    await screen.findByText('Đang dùng cấu hình này');

    fireEvent.click(screen.getByRole('button', { name: 'Gửi email thử' }));

    expect(await screen.findByText('Không gửi được email thử.')).toBeTruthy();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailTemplatesCard } from './EmailTemplatesCard';
import { adminService, type AdminEmailTemplateDto } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: { getEmailTemplates: vi.fn(), updateEmailTemplate: vi.fn() },
}));

const otp: AdminEmailTemplateDto = {
  key: 'PasswordReset',
  subject: '[PanelForge] Đặt lại mật khẩu',
  bodyHtml: '<p>Chào {{name}}, mã {{code}}</p>',
  defaultSubject: '[PanelForge] Yêu cầu đặt lại mật khẩu',
  defaultBodyHtml: '<p>Mặc định {{code}}</p>',
  placeholders: ['name', 'code', 'validFor'],
  requiredPlaceholders: ['code'],
  isCustomized: true,
  changedAt: '2026-11-28T08:00:00Z',
  changedByName: 'Quản Trị',
};

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailTemplatesCard onSaved={vi.fn()} onError={vi.fn()} />
    </QueryClientProvider>,
  );

const body = () => screen.getByLabelText(/Nội dung \(HTML\)/) as HTMLTextAreaElement;

describe('EmailTemplatesCard', () => {
  beforeEach(() => {
    vi.mocked(adminService.getEmailTemplates).mockReset().mockResolvedValue([otp]);
    vi.mocked(adminService.updateEmailTemplate).mockReset();
  });

  it('blocks saving an OTP template without {{code}} or with unknown variables', async () => {
    renderCard();
    await screen.findByDisplayValue(otp.subject);

    fireEvent.change(body(), { target: { value: '<p>Chào {{name}}</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }));
    expect(await screen.findByText('Nội dung phải có {{code}}.')).toBeTruthy();

    fireEvent.change(body(), { target: { value: '<p>{{code}} {{password}}</p>' } });
    expect(screen.getByText('Biến không hỗ trợ: {{password}}.')).toBeTruthy();
    expect(adminService.updateEmailTemplate).not.toHaveBeenCalled();
  });

  it('restores the default content and saves it', async () => {
    vi.mocked(adminService.updateEmailTemplate).mockResolvedValue({ ...otp, isCustomized: false });
    renderCard();
    await screen.findByDisplayValue(otp.subject);

    fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu mặc định' }));
    expect(body().value).toBe(otp.defaultBodyHtml);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }));

    await waitFor(() =>
      expect(adminService.updateEmailTemplate).toHaveBeenCalledWith('PasswordReset', {
        subject: otp.defaultSubject,
        bodyHtml: otp.defaultBodyHtml,
      }),
    );
  });

  it('inserts a variable and previews sample values HTML-encoded in a sandboxed frame', async () => {
    renderCard();
    await screen.findByDisplayValue(otp.subject);

    fireEvent.change(body(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /\{\{validFor\}\}/ }));
    expect(body().value).toBe('{{validFor}}');

    const frame = screen.getByTitle('Xem trước email') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('srcdoc')).toContain('15 phút');
  });
});

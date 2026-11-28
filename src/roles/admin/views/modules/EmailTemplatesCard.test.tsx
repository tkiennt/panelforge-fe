import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailTemplatesCard } from './EmailTemplatesCard';
import { adminService, type AdminEmailTemplateDto } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getEmailTemplates: vi.fn(),
    updateEmailTemplate: vi.fn(),
    previewEmailTemplate: vi.fn(),
    sendTestEmailTemplate: vi.fn(),
  },
}));

const defaults = {
  subject: '[PanelForge] Yêu cầu đặt lại mật khẩu',
  greeting: 'Xin chào {{name}},',
  intro: 'Mã OTP đặt lại mật khẩu của bạn là:',
  note: 'Mã có hiệu lực {{validFor}}.',
  signature: 'PanelForge Studio Team',
};

const reset: AdminEmailTemplateDto = {
  key: 'PasswordReset',
  content: { ...defaults, subject: '[PanelForge] Đặt lại mật khẩu' },
  defaultContent: defaults,
  placeholders: ['name', 'validFor'],
  hasCode: true,
  isCustomized: true,
  changedAt: '2026-11-28T08:00:00Z',
  changedByName: 'Quản Trị',
};

const onSaved = vi.fn();
const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailTemplatesCard onSaved={onSaved} onError={vi.fn()} />
    </QueryClientProvider>,
  );

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

describe('EmailTemplatesCard', () => {
  beforeEach(() => {
    vi.mocked(adminService.getEmailTemplates).mockReset().mockResolvedValue([reset]);
    vi.mocked(adminService.updateEmailTemplate).mockReset();
    vi.mocked(adminService.sendTestEmailTemplate).mockReset();
    vi.mocked(adminService.previewEmailTemplate)
      .mockReset()
      .mockResolvedValue({ subject: 'Xem trước', bodyHtml: '<p>482913</p>' });
    onSaved.mockReset();
  });

  it('shows plain-text fields, a locked OTP box and when the email is sent', async () => {
    renderCard();
    await screen.findByDisplayValue(reset.content.subject);

    expect(screen.getByText('Mã OTP sẽ hiện ở đây')).toBeTruthy();
    expect(screen.getByText('Gửi khi người dùng bấm Quên mật khẩu.')).toBeTruthy();
    expect(screen.queryByLabelText(/HTML/)).toBeNull();
    const frame = (await screen.findByTitle('Xem trước email')) as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
  });

  it('inserts a variable by its friendly name into the field being edited', async () => {
    renderCard();
    await screen.findByDisplayValue(reset.content.subject);

    const intro = field(/Đoạn mở đầu/);
    fireEvent.change(intro, { target: { value: 'Chào ' } });
    fireEvent.focus(intro);
    intro.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole('button', { name: '+ Tên người nhận' }));

    expect(field(/Đoạn mở đầu/).value).toBe('Chào {{name}}');
  });

  it('blocks save when a required field is empty, then saves and resets to default', async () => {
    vi.mocked(adminService.updateEmailTemplate).mockResolvedValue({
      ...reset,
      content: defaults,
      isCustomized: false,
    });
    renderCard();
    await screen.findByDisplayValue(reset.content.subject);

    fireEvent.change(field(/Lời chào/), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }));
    expect(await screen.findByText('Ô này bắt buộc.')).toBeTruthy();
    expect(adminService.updateEmailTemplate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Về mẫu mặc định' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }));
    await waitFor(() =>
      expect(adminService.updateEmailTemplate).toHaveBeenCalledWith('PasswordReset', defaults),
    );
  });

  it('sends the unsaved draft as a test email', async () => {
    vi.mocked(adminService.sendTestEmailTemplate).mockResolvedValue({ sentTo: 'a@pf.vn' });
    renderCard();
    await screen.findByDisplayValue(reset.content.subject);

    fireEvent.change(field(/Tiêu đề/), { target: { value: 'Mã mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thử tới tôi' }));

    await waitFor(() =>
      expect(adminService.sendTestEmailTemplate).toHaveBeenCalledWith('PasswordReset', {
        ...reset.content,
        subject: 'Mã mới',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('Đã gửi email thử tới a@pf.vn.');
  });
});

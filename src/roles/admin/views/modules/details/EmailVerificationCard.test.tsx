import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminUserDetailDto } from '@/services/adminDetail.service';
import { adminDetailService } from '@/services/adminDetail.service';
import { EmailVerificationCard } from './EmailVerificationCard';

vi.mock('@/services/adminDetail.service', () => ({
  adminDetailService: {
    resendVerification: vi.fn(() => Promise.resolve({ message: 'ok' })),
    confirmEmail: vi.fn(() => Promise.resolve({ message: 'ok' })),
  },
}));

const base = {
  id: 'u-9',
  email: 'new@test.com',
  isActive: true,
  isEmailConfirmed: false,
  isPendingInvitation: false,
} as AdminUserDetailDto;

const renderCard = (user: AdminUserDetailDto) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailVerificationCard user={user} />
    </QueryClientProvider>,
  );

describe('EmailVerificationCard — Admin xử lý tài khoản chưa xác thực email', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gửi lại mã xác thực và báo thành công', async () => {
    renderCard(base);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã xác thực' }));

    expect(await screen.findByText('Đã gửi lại mã xác thực tới new@test.com.')).toBeInTheDocument();
    expect(adminDetailService.resendVerification).toHaveBeenCalledWith('u-9');
  });

  it('xác thực thủ công bắt buộc nhập lý do rồi gửi lý do đã trim', async () => {
    renderCard(base);
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã xác thực' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xác thực email' }));

    expect(await screen.findByText('Vui lòng nhập lý do.')).toBeInTheDocument();
    expect(adminDetailService.confirmEmail).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '  Đã gọi xác minh  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác thực email' }));

    await waitFor(() =>
      expect(adminDetailService.confirmEmail).toHaveBeenCalledWith('u-9', 'Đã gọi xác minh'),
    );
  });

  it('tài khoản đang chờ lời mời Studio: không có thao tác', () => {
    renderCard({ ...base, isPendingInvitation: true });

    expect(screen.queryByRole('button', { name: 'Gửi lại mã xác thực' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã xác thực' })).not.toBeInTheDocument();
  });

  it('tài khoản bị khoá: không gửi lại mã được', () => {
    renderCard({ ...base, isActive: false });

    expect(screen.getByRole('button', { name: 'Gửi lại mã xác thực' })).toBeDisabled();
  });
});

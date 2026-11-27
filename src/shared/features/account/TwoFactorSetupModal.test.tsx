import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { authService } from '@/services/auth.service';

// Mock authService
vi.mock('@/services/auth.service', () => ({
  authService: {
    enableTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn(),
  },
}));

describe('TwoFactorSetupModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị mã QR và khóa dự phòng khi mở modal', async () => {
    vi.mocked(authService.enableTwoFactor).mockResolvedValueOnce({
      sharedKey: 'JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
      authenticatorUri:
        'otpauth://totp/PanelForge:artist@studio.com?secret=JBSWY3DPEHPK3PXP&issuer=PanelForge',
    });

    render(
      <TwoFactorSetupModal
        isOpen={true}
        onClose={vi.fn()}
        token='test-jwt-token'
        onSuccess={vi.fn()}
      />,
    );

    expect(await screen.findByText('Quét mã QR bằng ứng dụng Authenticator')).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('kích hoạt 2FA thành công khi người dùng nhập đúng mã 6 số OTP', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();

    vi.mocked(authService.enableTwoFactor).mockResolvedValueOnce({
      sharedKey: 'JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
      authenticatorUri:
        'otpauth://totp/PanelForge:artist@studio.com?secret=JBSWY3DPEHPK3PXP&issuer=PanelForge',
    });

    vi.mocked(authService.verifyTwoFactor).mockResolvedValueOnce({
      message: 'Kích hoạt 2FA thành công!',
    });

    render(
      <TwoFactorSetupModal
        isOpen={true}
        onClose={vi.fn()}
        token='test-jwt-token'
        onSuccess={handleSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText('000000');
    await user.type(otpInput, '654321');

    const submitBtn = screen.getByRole('button', { name: /Xác nhận kích hoạt 2FA/i });
    await user.click(submitBtn);

    expect(authService.verifyTwoFactor).toHaveBeenCalledWith({ code: '654321' }, 'test-jwt-token');
    expect(await screen.findByText('Đã kích hoạt 2FA thành công!')).toBeInTheDocument();
    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('giữ màn thành công khi component cha bật cờ 2FA lúc modal còn mở', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.enableTwoFactor).mockResolvedValueOnce({
      sharedKey: 'JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
      authenticatorUri: 'otpauth://totp/PanelForge:a@b.c?secret=JBSWY3DPEHPK3PXP&issuer=PanelForge',
    });
    vi.mocked(authService.verifyTwoFactor).mockResolvedValueOnce({ message: 'ok' });

    const { rerender } = render(
      <TwoFactorSetupModal isOpen onClose={vi.fn()} token='t' isTwoFactorEnabled={false} />,
    );
    await user.type(await screen.findByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /Xác nhận kích hoạt 2FA/i }));
    expect(await screen.findByText('Đã kích hoạt 2FA thành công!')).toBeInTheDocument();

    // App/UserProfileView đổi cờ trong onSuccess → modal không được nhảy sang màn "trạng thái"
    rerender(<TwoFactorSetupModal isOpen onClose={vi.fn()} token='t' isTwoFactorEnabled />);
    expect(screen.getByText('Đã kích hoạt 2FA thành công!')).toBeInTheDocument();
    expect(authService.enableTwoFactor).toHaveBeenCalledTimes(1);
  });

  it('mở màn trạng thái, không gọi enable-2fa khi 2FA đã bật', () => {
    render(<TwoFactorSetupModal isOpen onClose={vi.fn()} token='t' isTwoFactorEnabled />);

    expect(screen.getByText('2FA đang hoạt động và bảo vệ tài khoản')).toBeInTheDocument();
    expect(authService.enableTwoFactor).not.toHaveBeenCalled();
  });

  it('chỉ giữ chữ số khi dán mã có khoảng trắng hoặc gạch nối', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.enableTwoFactor).mockResolvedValueOnce({
      sharedKey: 'JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
      authenticatorUri: 'otpauth://totp/PanelForge:a@b.c?secret=JBSWY3DPEHPK3PXP&issuer=PanelForge',
    });
    render(<TwoFactorSetupModal isOpen onClose={vi.fn()} token='t' />);

    const input = await screen.findByLabelText('Nhập mã 6 chữ số để kích hoạt');
    await user.click(input);
    await user.paste('123 456');

    expect(input).toHaveValue('123456');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
});

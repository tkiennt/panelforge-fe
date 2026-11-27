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
    regenerateRecoveryCodes: vi.fn(),
    disableTwoFactor: vi.fn(),
    forgetDevice: vi.fn(),
  },
}));

const RECOVERY = ['2B4CD-6F8GH', 'JK3MN-5PQ7R', 'ST9UV-WX2YZ'];

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

  it('hiện mã khôi phục sau khi bật 2FA và chỉ cho đóng khi đã xác nhận lưu', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.enableTwoFactor).mockResolvedValueOnce({
      sharedKey: 'JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
      authenticatorUri: 'otpauth://totp/PanelForge:a@b.c?secret=JBSWY3DPEHPK3PXP&issuer=PanelForge',
    });
    vi.mocked(authService.verifyTwoFactor).mockResolvedValueOnce({
      message: 'ok',
      recoveryCodes: RECOVERY,
    });
    const onClose = vi.fn();
    render(<TwoFactorSetupModal isOpen onClose={onClose} token='t' />);

    await user.type(await screen.findByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /Xác nhận kích hoạt 2FA/i }));

    const panel = await screen.findByTestId('recovery-codes-panel');
    RECOVERY.forEach((c) => expect(panel).toHaveTextContent(c));
    // Mã chỉ hiện một lần: chưa tick "đã lưu" thì không đóng được (kể cả nút X)
    const done = screen.getByRole('button', { name: 'Đã lưu, đóng' });
    expect(done).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Tôi đã lưu các mã khôi phục/));
    expect(done).toBeEnabled();
    await user.click(done);
    expect(onClose).toHaveBeenCalled();
  });

  it('tạo bộ mã khôi phục mới từ màn trạng thái', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.regenerateRecoveryCodes).mockResolvedValueOnce({
      recoveryCodes: RECOVERY,
    });
    render(
      <TwoFactorSetupModal
        isOpen
        onClose={vi.fn()}
        token='t'
        isTwoFactorEnabled
        recoveryCodesLeft={2}
      />,
    );

    expect(screen.getByTestId('recovery-codes-left')).toHaveTextContent('2/10');
    await user.click(screen.getByRole('button', { name: 'Tạo mã khôi phục mới' }));
    await user.type(screen.getByLabelText('Mã 6 số từ Authenticator'), '654321');
    await user.click(screen.getByRole('button', { name: 'Tạo bộ mã mới' }));

    expect(authService.regenerateRecoveryCodes).toHaveBeenCalledWith('654321');
    expect(await screen.findByTestId('recovery-codes-panel')).toHaveTextContent(RECOVERY[0]);

    await user.click(screen.getByLabelText(/Tôi đã lưu các mã khôi phục/));
    await user.click(screen.getByRole('button', { name: 'Đã lưu, đóng' }));
    expect(screen.getByTestId('recovery-codes-left')).toHaveTextContent('3/10');
  });

  it('tắt 2FA bằng mật khẩu + mã khôi phục khi mất điện thoại', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.disableTwoFactor).mockResolvedValueOnce({ message: 'ok' });
    render(<TwoFactorSetupModal isOpen onClose={vi.fn()} token='t' isTwoFactorEnabled />);

    await user.click(screen.getByRole('button', { name: 'Tắt 2FA' }));
    await user.type(screen.getByLabelText(/Mật khẩu hiện tại/), 'Bnt123#');
    await user.click(screen.getByRole('button', { name: /Dùng mã khôi phục/ }));
    await user.type(screen.getByLabelText('Mã khôi phục'), 'jk3mn-5pq7r');
    await user.click(screen.getByRole('button', { name: 'Xác nhận tắt 2FA' }));

    expect(authService.disableTwoFactor).toHaveBeenCalledWith({
      code: 'JK3MN-5PQ7R',
      currentPassword: 'Bnt123#',
    });
    expect(await screen.findByText('Đã tắt 2FA')).toBeInTheDocument();
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

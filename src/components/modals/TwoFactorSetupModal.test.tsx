import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { authService } from '../../services/auth.service';

// Mock authService
vi.mock('../../services/auth.service', () => ({
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
});

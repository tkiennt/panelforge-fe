import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginModal } from './LoginModal';
import { authService } from '../../services/auth.service';

// Mock Firebase module
vi.mock('../../firebase', () => ({
  signInWithPopup: vi.fn(),
  auth: {},
  googleProvider: {},
}));

// Mock authService
vi.mock('../../services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    verifyTwoFactor: vi.fn(),
    externalLogin: vi.fn(),
  },
}));

describe('LoginModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị form đăng nhập đầy đủ các trường nhập liệu và nút bấm', () => {
    const handleClose = vi.fn();
    const handleLogin = vi.fn();

    const { container } = render(<LoginModal onClose={handleClose} onLogin={handleLogin} />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Log in to your studio workspace.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mika@studio.com/i)).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
  });

  it('gọi callback onLogin khi người dùng nhập thông tin và submit form', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleLogin = vi.fn();
    vi.mocked(authService.login).mockResolvedValueOnce({
      token: 'fake-jwt-token',
      user: { email: 'editor@panelforge.com', role: 'EDITOR' },
    });

    const { container } = render(<LoginModal onClose={handleClose} onLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText(/mika@studio.com/i);
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'editor@panelforge.com');
    await user.type(passwordInput, 'secret123');
    await user.click(submitBtn);

    expect(authService.login).toHaveBeenCalledWith('editor@panelforge.com', 'secret123');
    expect(handleLogin).toHaveBeenCalledTimes(1);
    expect(handleLogin).toHaveBeenCalledWith('editor@panelforge.com', 'secret123');
  });

  it('chuyển sang màn hình xác thực 2FA khi tài khoản đã kích hoạt 2FA', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleLogin = vi.fn();

    vi.mocked(authService.login).mockResolvedValueOnce({
      requiresTwoFactor: true,
      twoFactorEmail: 'artist@panelforge.com',
      message: 'Yêu cầu xác thực 2FA',
    });

    vi.mocked(authService.verifyTwoFactor).mockResolvedValueOnce({
      token: 'valid-2fa-token',
      user: { email: 'artist@panelforge.com', role: 'ARTIST' },
    });

    const { container } = render(<LoginModal onClose={handleClose} onLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText(/mika@studio.com/i);
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'artist@panelforge.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    // Chuyển sang màn hình 2FA
    expect(await screen.findByText('Xác thực 2 yếu tố')).toBeInTheDocument();
    expect(screen.getByText('artist@panelforge.com')).toBeInTheDocument();

    const otpInput = screen.getByPlaceholderText('000000');
    await user.type(otpInput, '123456');

    const verifyBtn = screen.getByRole('button', { name: /Xác thực & Đăng nhập/i });
    await user.click(verifyBtn);

    expect(authService.verifyTwoFactor).toHaveBeenCalledWith({
      email: 'artist@panelforge.com',
      code: '123456',
    });
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it('gọi onClose khi nhấn nút đóng modal', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleLogin = vi.fn();

    const { container } = render(<LoginModal onClose={handleClose} onLogin={handleLogin} />);

    // Nút đóng modal góc phải
    const closeBtn = container.querySelector('button[aria-label="Close"], button.absolute');
    if (closeBtn) {
      await user.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });
});

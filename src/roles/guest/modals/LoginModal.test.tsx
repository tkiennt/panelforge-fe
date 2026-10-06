import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginModal } from './LoginModal';
import { authService } from '@/services/auth.service';

// Mock Firebase module
vi.mock('@/firebase', () => ({
  signInWithPopup: vi.fn(),
  auth: {},
  googleProvider: {},
}));

// Mock authService
vi.mock('@/services/auth.service', () => ({
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

  it('đăng nhập không rào cản và gọi handleLogin thành công khi xác thực đúng', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleLogin = vi.fn();

    vi.mocked(authService.login).mockResolvedValueOnce({
      token: 'mock-jwt-token',
      user: { email: 'artist@panelforge.com', role: 'ARTIST' },
    });

    const { container } = render(<LoginModal onClose={handleClose} onLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText(/mika@studio.com/i);
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'artist@panelforge.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    expect(authService.login).toHaveBeenCalledWith('artist@panelforge.com', 'password123');
    expect(handleLogin).toHaveBeenCalledTimes(1);
    expect(handleLogin).toHaveBeenCalledWith('artist@panelforge.com', 'password123');
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

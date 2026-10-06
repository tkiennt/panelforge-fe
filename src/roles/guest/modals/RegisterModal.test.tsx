import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterModal } from './RegisterModal';
import { authService } from '@/services/auth.service';

// Mock Firebase
vi.mock('@/firebase', () => ({
  signInWithPopup: vi.fn(),
  auth: {},
  googleProvider: {},
}));

// Mock authService
vi.mock('@/services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    externalLogin: vi.fn(),
  },
}));

describe('RegisterModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('render đầy đủ các trường nhập liệu của form đăng ký', () => {
    render(<RegisterModal onClose={vi.fn()} onSuccess={vi.fn()} onSwitchToLogin={vi.fn()} />);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Eiichiro Oda/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/creator@studio.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register & Receive PIN/i })).toBeInTheDocument();
  });

  it('chuyển sang bước nhập mã PIN khi đăng ký thành công', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.register).mockResolvedValueOnce({
      message: 'Mã PIN đã gửi về email!',
    });

    const { container } = render(
      <RegisterModal onClose={vi.fn()} onSuccess={vi.fn()} onSwitchToLogin={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(/Eiichiro Oda/i), 'Oda Eiichiro');
    await user.type(screen.getByPlaceholderText(/creator@studio.com/i), 'oda@onepiece.jp');
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(passwordInput, 'Luffy@1997');

    await user.click(screen.getByRole('button', { name: /Register & Receive PIN/i }));

    // Xác nhận đã chuyển sang bước Verify PIN
    expect(await screen.findByText('Verify PIN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify PIN & Enter Studio/i })).toBeInTheDocument();
  });

  it('gọi callback onSwitchToLogin khi bấm Log In', async () => {
    const user = userEvent.setup();
    const handleSwitch = vi.fn();

    render(<RegisterModal onClose={vi.fn()} onSuccess={vi.fn()} onSwitchToLogin={handleSwitch} />);

    const loginLink = screen.getByRole('button', { name: /Log In/i });
    await user.click(loginLink);

    expect(handleSwitch).toHaveBeenCalledTimes(1);
  });
});

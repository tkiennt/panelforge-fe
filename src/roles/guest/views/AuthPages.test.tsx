import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { AuthLayout } from './AuthLayout';
import { authService } from '@/services/auth.service';

// Mock Firebase module
vi.mock('@/config/firebase', () => ({
  signInWithPopup: vi.fn(),
  auth: {},
  googleProvider: {},
}));

// Mock authService
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    verifyTwoFactor: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    externalLogin: vi.fn(),
    getLandingContext: vi.fn().mockResolvedValue({ suggestedLanding: 'YourWorkspaces' }),
  },
}));

describe('AuthLayout and VersionedBlueprintVisual', () => {
  it('render dialog card nổi với role="dialog", aria-modal="true" và đủ 3 tờ bản thảo', () => {
    render(
      <MemoryRouter>
        <AuthLayout mode='login'>
          <div>Test Form Content</div>
        </AuthLayout>
      </MemoryRouter>,
    );

    // Kiểm tra card có role="dialog", aria-modal="true"
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'auth-dialog-title');

    // Kiểm tra nút đóng (X) và link Về trang chủ
    expect(screen.getByTestId('auth-close-btn')).toHaveAttribute('aria-label', 'Đóng');
    expect(screen.getByText('Về trang chủ')).toBeInTheDocument();

    // Kiểm tra 3 tờ giấy bản thảo manga với các asset thực tế
    const manuscriptRegion = screen.getByRole('region', {
      name: /Bản thảo manga hoàn thiện/i,
    });
    expect(manuscriptRegion).toBeInTheDocument();
    expect(screen.getByAltText(/Bản thảo manga hoàn thiện/i)).toBeInTheDocument();

    const imgs = Array.from(dialog.querySelectorAll('img'));
    const imgSources = imgs.map((img) => img.getAttribute('src'));
    expect(imgSources).toContain('/images/auth-manga-script.jpg');
    expect(imgSources).toContain('/images/auth-manga-sketch.jpg');
    expect(imgSources).toContain('/images/auth-manga-finished.jpg');
  });

  it('đóng dialog khi bấm phím Escape hoặc nút đóng (X)', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/', '/login']} initialIndex={1}>
        <Routes>
          <Route path='/' element={<div>Trang chủ Landing</div>} />
          <Route
            path='/login'
            element={
              <AuthLayout mode='login'>
                <div>Form Login</div>
              </AuthLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Bấm nút đóng (X)
    const closeBtn = screen.getByTestId('auth-close-btn');
    await user.click(closeBtn);

    // Dialog đóng và điều hướng về trang trước
    expect(screen.getByText('Trang chủ Landing')).toBeInTheDocument();
  });

  it('đóng dialog khi bấm phím Escape', () => {
    render(
      <MemoryRouter initialEntries={['/', '/login']} initialIndex={1}>
        <Routes>
          <Route path='/' element={<div>Trang chủ Landing</div>} />
          <Route
            path='/login'
            element={
              <AuthLayout mode='login'>
                <div>Form Login</div>
              </AuthLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Gửi sự kiện phím Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(screen.getByText('Trang chủ Landing')).toBeInTheDocument();
  });

  it('truy cập URL trực tiếp rồi đóng thì về "/"', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']} initialIndex={0}>
        <Routes>
          <Route path='/' element={<div>Trang chủ Landing</div>} />
          <Route
            path='/login'
            element={
              <AuthLayout mode='login'>
                <div>Form Login</div>
              </AuthLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const closeBtn = screen.getByTestId('auth-close-btn');
    await user.click(closeBtn);

    expect(screen.getByText('Trang chủ Landing')).toBeInTheDocument();
  });

  it('click trong card không đóng dialog; click vào backdrop thì đóng', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/', '/login']} initialIndex={1}>
        <Routes>
          <Route path='/' element={<div>Trang chủ Landing</div>} />
          <Route
            path='/login'
            element={
              <AuthLayout mode='login'>
                <div data-testid='inside-card'>Nội dung Form</div>
              </AuthLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // 1. Click bên trong card: dialog không bị đóng
    const insideCard = screen.getByTestId('inside-card');
    await user.click(insideCard);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // 2. Click vào backdrop: dialog đóng
    const backdrop = screen.getByTestId('auth-backdrop');
    await user.click(backdrop);
    expect(screen.getByText('Trang chủ Landing')).toBeInTheDocument();
  });

  it('tự động focus vào ô nhập đầu tiên khi mở', async () => {
    render(
      <MemoryRouter>
        <AuthLayout mode='login'>
          <input data-testid='first-input' type='text' />
          <input data-testid='second-input' type='text' />
        </AuthLayout>
      </MemoryRouter>,
    );

    const firstInput = screen.getByTestId('first-input');
    await waitFor(() => {
      expect(document.activeElement).toBe(firstInput);
    });
  });
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị đầy đủ form đăng nhập với đúng autocomplete và nhãn hiển thị', () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const title = screen.getByRole('heading', { name: /Chào mừng.*trở lại/i });
    expect(title).toBeInTheDocument();
    expect(title).toHaveAttribute('id', 'auth-dialog-title');
    expect(screen.getByText('Tiếp tục câu chuyện của bạn cùng studio.')).toBeInTheDocument();

    const emailInput = container.querySelector('#login-email') as HTMLInputElement;
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Nút hiện/ẩn mật khẩu có aria-label
    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });
    expect(toggleBtn).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục với Google/i })).toBeInTheDocument();
    expect(screen.getByText(/Chưa có tài khoản\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tạo tài khoản/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Kích hoạt tài khoản được mời hoặc chưa xác thực\?/i),
    ).toBeInTheDocument();
  });

  it('chuyển đổi ẩn/hiện mật khẩu khi nhấn nút mắt', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Ẩn mật khẩu/i })).toBeInTheDocument();
  });

  it('hiển thị lỗi server trong role="alert" khi đăng nhập thất bại', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Sai tài khoản hoặc mật khẩu'));

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(
      container.querySelector('#login-email') as HTMLInputElement,
      'artist@studio.com',
    );
    await user.type(container.querySelector('#login-password') as HTMLInputElement, 'WrongPass123');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sai tài khoản hoặc mật khẩu');
  });

  it('chuyển sang bước 2FA khi backend yêu cầu requiresTwoFactor', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValueOnce({
      requiresTwoFactor: true,
      twoFactorEmail: 'producer@panelforge.com',
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(
      container.querySelector('#login-email') as HTMLInputElement,
      'producer@panelforge.com',
    );
    await user.type(container.querySelector('#login-password') as HTMLInputElement, 'Bnt123#');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Xác thực hai bước (2FA)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã xác thực 6 chữ số/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xác nhận & Vào Studio/i })).toBeInTheDocument();
  });
});

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị đầy đủ form đăng ký theo đúng API yêu cầu và checklist mật khẩu', () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const title = screen.getByRole('heading', { name: /Bắt đầu câu chuyện.*mới/i });
    expect(title).toBeInTheDocument();
    expect(title).toHaveAttribute('id', 'auth-dialog-title');
    expect(screen.getByText('Tạo tài khoản để cộng tác cùng studio của bạn.')).toBeInTheDocument();

    const fullNameInput = container.querySelector('#register-fullname') as HTMLInputElement;
    expect(fullNameInput).toHaveAttribute('autocomplete', 'name');

    const emailInput = container.querySelector('#register-email') as HTMLInputElement;
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');

    const confirmPasswordInput = container.querySelector(
      '#register-confirm-password',
    ) as HTMLInputElement;
    expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');

    // Checklist mật khẩu
    expect(screen.getByText('Ít nhất 6 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Ít nhất 1 chữ cái viết hoa (A-Z)')).toBeInTheDocument();
    expect(screen.getByText(/Ít nhất 1 ký tự đặc biệt/i)).toBeInTheDocument();
  });

  it('báo lỗi lệch mật khẩu xác nhận ngay khi blur', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector(
      '#register-confirm-password',
    ) as HTMLInputElement;

    await user.type(passwordInput, 'ValidPass@123');
    await user.type(confirmPasswordInput, 'MismatchPass@999');
    await user.tab(); // trigger blur

    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument();
  });

  it('chuyển sang trạng thái "Kiểm tra email để kích hoạt" khi đăng ký thành công', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.register).mockResolvedValueOnce({
      message: 'Mã PIN 6 số đã được gửi tới email.',
    });

    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(
      container.querySelector('#register-fullname') as HTMLInputElement,
      'Eiichiro Oda',
    );
    await user.type(
      container.querySelector('#register-email') as HTMLInputElement,
      'oda@studio.com',
    );
    await user.type(
      container.querySelector('#register-password') as HTMLInputElement,
      'Manga@2026',
    );
    await user.type(
      container.querySelector('#register-confirm-password') as HTMLInputElement,
      'Manga@2026',
    );

    await user.click(screen.getByRole('button', { name: 'Đăng ký tài khoản' }));

    expect(await screen.findByText('Kiểm tra email để kích hoạt')).toBeInTheDocument();
    expect(container.querySelector('#register-pin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xác thực & Vào Studio/i })).toBeInTheDocument();
  });
});

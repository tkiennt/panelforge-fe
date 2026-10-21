import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter (Lucian #036)', () => {
  it('render đầy đủ nhãn và các tiêu chuẩn bảo mật', () => {
    render(<PasswordStrengthMeter value='' onChange={vi.fn()} />);

    expect(screen.getByText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByText('Độ mạnh mật khẩu')).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByText('1 chữ in hoa (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Ít nhất 1 chữ số (0-9)')).toBeInTheDocument();
    expect(screen.getByText('1 ký tự đặc biệt (!@#$)')).toBeInTheDocument();
  });

  it('cập nhật mức độ mạnh yếu khi nhập mật khẩu', () => {
    const { rerender } = render(<PasswordStrengthMeter value='abc' onChange={vi.fn()} />);
    expect(screen.getByText('Rất yếu')).toBeInTheDocument();

    rerender(<PasswordStrengthMeter value='Abc123' onChange={vi.fn()} />);
    expect(screen.getByText('Khá tốt')).toBeInTheDocument();

    rerender(<PasswordStrengthMeter value='Abc123!@#' onChange={vi.fn()} />);
    expect(screen.getByText('Rất mạnh')).toBeInTheDocument();
  });

  it('bật/tắt hiển thị mật khẩu khi bấm icon con mắt', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordStrengthMeter value='Secret123!' onChange={vi.fn()} />);

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });
    await user.click(toggleBtn);
    expect(input.type).toBe('text');

    await user.click(toggleBtn);
    expect(input.type).toBe('password');
  });
});

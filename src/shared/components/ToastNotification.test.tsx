import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastItem, ToastStack, ToastItemData } from './ToastNotification';

describe('ToastNotification Component', () => {
  it('hiển thị đúng thông báo hết phiên với icon đồng hồ hổ phách, tiêu đề, mô tả và role alert', () => {
    const mockOnClose = vi.fn();
    const sessionExpiredToast: ToastItemData = {
      id: 'session-expired',
      title: 'Phiên đăng nhập đã hết hạn',
      desc: 'Vui lòng đăng nhập lại để tiếp tục.',
      type: 'warning',
    };

    render(<ToastItem toast={sessionExpiredToast} onClose={mockOnClose} />);

    // Kiểm tra nội dung tiêu đề và mô tả
    expect(screen.getByText('Phiên đăng nhập đã hết hạn')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng đăng nhập lại để tiếp tục.')).toBeInTheDocument();

    // Kiểm tra icon warning (đồng hồ hổ phách, KHÔNG phải tick xanh)
    expect(screen.getByTestId('toast-icon-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('toast-icon-success')).not.toBeInTheDocument();

    // Kiểm tra accessibility: role="alert" và aria-live="assertive" cho thông báo hết phiên
    const alertEl = screen.getByRole('alert');
    expect(alertEl).toHaveAttribute('aria-live', 'assertive');

    // Kiểm tra nút đóng với accessible name đúng
    const closeBtn = screen.getByRole('button', { name: 'Đóng thông báo' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledWith('session-expired');
  });

  it('hiển thị đúng thông báo đăng xuất chủ động với icon đăng xuất và role status', () => {
    const mockOnClose = vi.fn();
    const logoutToast: ToastItemData = {
      id: 'auth-logout',
      title: 'Đã đăng xuất',
      desc: 'Bạn đã đăng xuất khỏi PanelForge.',
      type: 'logout',
    };

    render(<ToastItem toast={logoutToast} onClose={mockOnClose} />);

    expect(screen.getByText('Đã đăng xuất')).toBeInTheDocument();
    expect(screen.getByText('Bạn đã đăng xuất khỏi PanelForge.')).toBeInTheDocument();

    // Icon logout
    expect(screen.getByTestId('toast-icon-logout')).toBeInTheDocument();
    expect(screen.queryByTestId('toast-icon-warning')).not.toBeInTheDocument();

    // Đăng xuất thông thường dùng role="status" (thông báo lịch sự, không cướp sự chú ý như alert)
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('hiển thị thông báo thành công với icon tick xanh, lớp u070-type-success và role status', () => {
    const mockOnClose = vi.fn();
    const successToast: ToastItemData = {
      id: 'success-layout',
      title: 'Đã lưu bố cục trang',
      desc: 'Khung vẽ Trang #1 đã sẵn sàng nhận ảnh.',
      type: 'success',
    };

    render(<ToastItem toast={successToast} onClose={mockOnClose} />);

    expect(screen.getByText('Đã lưu bố cục trang')).toBeInTheDocument();
    expect(screen.getByText('Khung vẽ Trang #1 đã sẵn sàng nhận ảnh.')).toBeInTheDocument();
    expect(screen.getByTestId('toast-icon-success')).toBeInTheDocument();
    const item = screen.getByTestId('toast-item-success');
    expect(item).toHaveClass('u070-type-success');
    expect(item).toHaveAttribute('role', 'status');
  });

  it('hỗ trợ nút hành động "Đăng nhập lại" khi có action và gọi đúng callback', () => {
    const mockOnClose = vi.fn();
    const mockActionClick = vi.fn();
    const toastWithAction: ToastItemData = {
      id: 'session-expired-action',
      title: 'Phiên đăng nhập đã hết hạn',
      desc: 'Vui lòng đăng nhập lại để tiếp tục.',
      type: 'warning',
      action: {
        label: 'Đăng nhập lại',
        onClick: mockActionClick,
      },
    };

    render(<ToastItem toast={toastWithAction} onClose={mockOnClose} />);

    const actionBtn = screen.getByRole('button', { name: /Đăng nhập lại/i });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(mockActionClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('không hiển thị nút hành động nếu action không được truyền', () => {
    const mockOnClose = vi.fn();
    const toastWithoutAction: ToastItemData = {
      id: 'session-expired-no-action',
      title: 'Phiên đăng nhập đã hết hạn',
      desc: 'Vui lòng đăng nhập lại để tiếp tục.',
      type: 'warning',
    };

    render(<ToastItem toast={toastWithoutAction} onClose={mockOnClose} />);

    expect(screen.queryByRole('button', { name: /Đăng nhập lại/i })).not.toBeInTheDocument();
  });

  it('ToastStack hiển thị danh sách toast trong vùng region với aria-label chuẩn', () => {
    const mockOnClose = vi.fn();
    const toasts: ToastItemData[] = [
      {
        id: 'toast-1',
        title: 'Thành công',
        desc: 'Thao tác hoàn tất',
        type: 'success',
      },
      {
        id: 'toast-2',
        title: 'Phiên đăng nhập đã hết hạn',
        desc: 'Vui lòng đăng nhập lại để tiếp tục.',
        type: 'warning',
      },
    ];

    render(<ToastStack toasts={toasts} onClose={mockOnClose} />);

    const region = screen.getByRole('region', { name: 'Thông báo hệ thống' });
    expect(region).toBeInTheDocument();
    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('Phiên đăng nhập đã hết hạn')).toBeInTheDocument();
  });

  it('không chiếm focus khi xuất hiện', () => {
    const mockOnClose = vi.fn();
    render(
      <div>
        <input data-testid='test-input' autoFocus />
        <ToastItem
          toast={{
            id: 'toast-focus-test',
            title: 'Phiên đăng nhập đã hết hạn',
            desc: 'Vui lòng đăng nhập lại để tiếp tục.',
            type: 'warning',
          }}
          onClose={mockOnClose}
        />
      </div>,
    );

    const input = screen.getByTestId('test-input');
    expect(document.activeElement).toBe(input);
  });
});

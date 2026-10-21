import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LucianConfirmModal } from './LucianConfirmModal';
import { ConfirmProvider, useConfirm } from '@/shared/context/ConfirmContext';

describe('LucianConfirmModal Component', () => {
  it('hiển thị đúng tiêu đề, mô tả và nút xác nhận', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <LucianConfirmModal
        isOpen={true}
        title='Xác nhận xóa phân cảnh'
        description='Toàn bộ dữ liệu thoại sẽ bị xóa.'
        confirmText='Xác nhận xóa'
        cancelText='Giữ lại'
        variant='danger'
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    expect(screen.getByText('Xác nhận xóa phân cảnh')).toBeInTheDocument();
    expect(screen.getByText('Toàn bộ dữ liệu thoại sẽ bị xóa.')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-accept-btn');
    expect(confirmBtn).toHaveTextContent('Xác nhận xóa');

    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByTestId('confirm-cancel-btn');
    expect(cancelBtn).toHaveTextContent('Giữ lại');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('đóng modal khi nhấn phím Escape', () => {
    const handleCancel = vi.fn();

    render(
      <LucianConfirmModal
        isOpen={true}
        title='Xác nhận'
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('tích hợp thành công với useConfirm hook qua Promise', async () => {
    let confirmResult: boolean | null = null;

    const TestComponent = () => {
      const confirm = useConfirm();
      return (
        <button
          onClick={async () => {
            const res = await confirm({
              title: 'Xóa tập truyện?',
              description: 'Tập truyện sẽ bị xóa vĩnh viễn.',
            });
            confirmResult = res;
          }}
        >
          Mở Confirm
        </button>
      );
    };

    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByText('Mở Confirm'));

    expect(screen.getByText('Xóa tập truyện?')).toBeInTheDocument();

    // Nhấn xác nhận
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-accept-btn'));
    });

    expect(confirmResult).toBe(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LucianInlineAlert } from './LucianInlineAlert';

describe('LucianInlineAlert Component', () => {
  it('hiển thị đúng tiêu đề, mô tả và role alert cho dạng warning/danger', () => {
    render(
      <LucianInlineAlert
        type='warning'
        title='Cảnh báo dung lượng'
        description='Bộ nhớ lưu trữ sắp đầy.'
      />,
    );

    expect(screen.getByText('Cảnh báo dung lượng')).toBeInTheDocument();
    expect(screen.getByText('Bộ nhớ lưu trữ sắp đầy.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hỗ trợ mở rộng xem chi tiết nhật ký lỗi', () => {
    render(
      <LucianInlineAlert
        type='danger'
        title='Lỗi kết nối'
        description='Không thể đồng bộ kịch bản.'
        details='504 Gateway Timeout at /api/chapters/1'
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /chi tiết/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('504 Gateway Timeout at /api/chapters/1')).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText('Ẩn chi tiết')).toBeInTheDocument();
  });

  it('đóng thông báo và gọi callback onDismiss', () => {
    const handleDismiss = vi.fn();
    render(<LucianInlineAlert type='info' title='Thông báo hệ thống' onDismiss={handleDismiss} />);

    const closeBtn = screen.getByRole('button', { name: 'Đóng thông báo' });
    fireEvent.click(closeBtn);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Thông báo hệ thống')).not.toBeInTheDocument();
  });
});

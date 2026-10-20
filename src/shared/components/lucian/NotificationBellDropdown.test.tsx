import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBellDropdown, LucianNotificationItem } from './NotificationBellDropdown';

describe('NotificationBellDropdown (Lucian UX/UI #074)', () => {
  const mockItems: LucianNotificationItem[] = [
    {
      id: 'n1',
      author: 'Akira',
      action: 'đã nộp bản vẽ cho Khung #3',
      time: '5 phút trước',
      isMention: true,
      isRead: false,
    },
    {
      id: 'n2',
      author: 'Producer',
      action: 'đã duyệt toàn bộ Trang 2',
      time: '30 phút trước',
      isMention: false,
      isRead: false,
    },
    {
      id: 'n3',
      author: 'Editor',
      action: 'đã tạo yêu cầu sửa đổi cho Thoại',
      time: '2 giờ trước',
      isMention: false,
      isRead: true,
    },
  ];

  it('render chuông thông báo và số lượng badge chưa đọc', () => {
    render(<NotificationBellDropdown initialItems={mockItems} />);

    const badge = screen.getByTestId('u074-badge');
    expect(badge).toHaveTextContent('2');
    expect(screen.getByTestId('u074-bell-btn')).toHaveAttribute('aria-label', 'Notifications, 2 unread');
  });

  it('mở danh sách thông báo khi click vào chuông', () => {
    render(<NotificationBellDropdown initialItems={mockItems} />);

    const container = screen.getByTestId('lucian-074-dropdown');
    expect(container).toHaveClass('is-closed');

    const bellBtn = screen.getByTestId('u074-bell-btn');
    fireEvent.click(bellBtn);

    expect(container).not.toHaveClass('is-closed');
    expect(bellBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('đã nộp bản vẽ cho Khung #3')).toBeInTheDocument();
  });

  it('chuyển tab giữa Tất cả và Đề cập (Mentions)', () => {
    render(<NotificationBellDropdown initialItems={mockItems} />);

    // Mở menu
    fireEvent.click(screen.getByTestId('u074-bell-btn'));

    // Ban đầu ở tab Tất cả -> có cả Akira và Producer
    expect(screen.getByText('Akira')).toBeInTheDocument();
    expect(screen.getByText('Producer')).toBeInTheDocument();

    // Chuyển sang tab Đề cập
    const mentionsTab = screen.getByTestId('u074-tab-mentions');
    fireEvent.click(mentionsTab);

    // Chỉ còn Akira (isMention: true)
    expect(screen.getByText('Akira')).toBeInTheDocument();
    expect(screen.queryByText('Producer')).not.toBeInTheDocument();
  });

  it('đánh dấu đã đọc khi click vào một thông báo', () => {
    const handleNotificationClick = vi.fn();
    render(
      <NotificationBellDropdown
        initialItems={mockItems}
        onNotificationClick={handleNotificationClick}
      />,
    );

    fireEvent.click(screen.getByTestId('u074-bell-btn'));

    const itemBtn = screen.getByText('đã nộp bản vẽ cho Khung #3').closest('button');
    expect(itemBtn).not.toHaveClass('read');

    fireEvent.click(itemBtn!);

    expect(handleNotificationClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', author: 'Akira' }),
    );
    expect(itemBtn).toHaveClass('read');
    expect(screen.getByTestId('u074-badge')).toHaveTextContent('1');
  });

  it('đánh dấu đọc tất cả khi bấm nút Đọc tất cả', () => {
    const handleMarkAllRead = vi.fn();
    render(
      <NotificationBellDropdown
        initialItems={mockItems}
        onMarkAllRead={handleMarkAllRead}
      />,
    );

    fireEvent.click(screen.getByTestId('u074-bell-btn'));

    const markAllBtn = screen.getByTestId('u074-mark-all-read');
    expect(markAllBtn).not.toBeDisabled();

    fireEvent.click(markAllBtn);

    expect(handleMarkAllRead).toHaveBeenCalled();
    expect(screen.getByTestId('u074-badge')).toHaveTextContent('0');
    expect(markAllBtn).toBeDisabled();
  });

  it('đóng menu khi nhấn phím Escape', () => {
    render(<NotificationBellDropdown initialItems={mockItems} />);

    const container = screen.getByTestId('lucian-074-dropdown');
    fireEvent.click(screen.getByTestId('u074-bell-btn'));
    expect(container).not.toHaveClass('is-closed');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container).toHaveClass('is-closed');
  });
});

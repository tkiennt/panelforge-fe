import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell, CurrentUser } from './AppShell';

vi.mock('@/shared/features/collaboration/NotificationBell', () => ({
  NotificationBell: () => <div data-testid='notification-bell' />,
}));

describe('AppShell Component', () => {
  const renderInRouter = (
    user: CurrentUser,
    route = '/workspaces/ws-1/series/ser-1/dashboard',
    props: Partial<React.ComponentProps<typeof AppShell>> = {},
  ) => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/*'
            element={
              <AppShell currentUser={user} {...props}>
                <div data-testid='outlet-content'>Content</div>
              </AppShell>
            }
          />
          <Route
            path='/*'
            element={
              <AppShell currentUser={user} {...props}>
                <div data-testid='outlet-content'>Content</div>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('hiển thị mục "Bàn vẽ & Khung trang" cho vai trò ARTIST trong ngữ cảnh Series (Line 135)', () => {
    const artistUser: CurrentUser = {
      name: 'Nguyễn Văn Họa Sĩ',
      role: 'USER',
      workspaceRole: 'ARTIST' as any,
      activeRoles: ['ARTIST'],
      avatarInitials: 'AH',
    };

    renderInRouter(artistUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Bàn vẽ & Khung trang')).toBeInTheDocument();
    expect(screen.getByText('Công việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản (Script)')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    // Artist không được thấy màn Letterer
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
  });

  it('hiển thị mục "Chèn chữ & Bóng thoại" cho vai trò LETTERER trong ngữ cảnh Series (Line 135)', () => {
    const lettererUser: CurrentUser = {
      name: 'Lê Văn Chữ',
      role: 'USER',
      workspaceRole: 'LETTERER' as any,
      activeRoles: ['LETTERER'],
      avatarInitials: 'LC',
    };

    renderInRouter(lettererUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Chèn chữ & Bóng thoại')).toBeInTheDocument();
    expect(screen.getByText('Công việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản (Script)')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    // Letterer không thấy màn Artist
    expect(screen.queryByText('Bàn vẽ & Khung trang')).not.toBeInTheDocument();
  });

  it('vai trò WRITER không thấy cả Bàn vẽ lẫn Chèn chữ', () => {
    const writerUser: CurrentUser = {
      name: 'Trần Văn Kịch Bản',
      role: 'USER',
      workspaceRole: 'WRITER' as any,
      activeRoles: ['WRITER'],
      avatarInitials: 'TK',
    };

    renderInRouter(writerUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Kịch bản (Script)')).toBeInTheDocument();
    expect(screen.getByText('Công việc của tôi')).toBeInTheDocument();
    expect(screen.queryByText('Bàn vẽ & Khung trang')).not.toBeInTheDocument();
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
  });

  it('vai trò PRODUCER trong Series thấy đầy đủ các menu quản lý và sản xuất', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    expect(screen.getByText('Series Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quy trình sản xuất')).toBeInTheDocument();
    expect(screen.getByText('Bàn vẽ & Khung trang')).toBeInTheDocument();
    expect(screen.getByText('Chèn chữ & Bóng thoại')).toBeInTheDocument();
    expect(screen.getByText('Cổng Duyệt Xuất Bản')).toBeInTheDocument();
    expect(screen.queryByText('AI Multi-Agent')).not.toBeInTheDocument();
  });

  it('không còn hiển thị mục AI Multi-Agent trong thanh điều hướng sau khi loại bỏ phần demo', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');
    expect(screen.queryByText('AI Multi-Agent')).not.toBeInTheDocument();
  });

  it('hiển thị menu Admin cho vai trò ADMINISTRATOR', () => {
    const adminUser: CurrentUser = {
      name: 'Quản Trị Viên',
      role: 'ADMINISTRATOR',
      avatarInitials: 'AD',
    };

    renderInRouter(adminUser, '/admin');

    expect(screen.getByText('System Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users & Roles')).toBeInTheDocument();
    expect(screen.getByText('AI Provider & Quota')).toBeInTheDocument();
  });

  it('hỗ trợ mở và đóng sidebar drawer trên màn hình nhỏ (< md) bằng nút hamburger', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i });
    expect(hamburgerBtn).toBeInTheDocument();
    expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'false');

    // Mở drawer
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /menu điều hướng/i })).toBeInTheDocument();

    // Đóng drawer bằng nút Đóng menu
    const closeBtn = screen.getByRole('button', { name: /đóng menu điều hướng/i });
    fireEvent.click(closeBtn);
    expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: /menu điều hướng/i })).not.toBeInTheDocument();
  });

  it('kích hoạt onOpenCommandPalette khi click vào nút tìm kiếm nhanh ⌘K', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };
    const onOpenCommandPalette = vi.fn();

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard', {
      onOpenCommandPalette,
    });

    const triggerBtn = screen.getByTestId('header-command-palette-trigger');
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('hiển thị breadcrumb Chapter khi URL có tham số chapterId trong ngữ cảnh Series', () => {
    const artistUser: CurrentUser = {
      name: 'Nguyễn Văn Họa Sĩ',
      role: 'USER',
      workspaceRole: 'ARTIST' as any,
      activeRoles: ['ARTIST'],
      avatarInitials: 'AH',
    };

    renderInRouter(artistUser, '/workspaces/ws-1/series/ser-1/artist?chapterId=01');

    const chapterBreadcrumb = screen.getByTestId('header-chapter-breadcrumb');
    expect(chapterBreadcrumb).toBeInTheDocument();
    expect(chapterBreadcrumb).toHaveTextContent('Chapter 01');
  });

  it('sidebar mở rộng mặc định trên màn hình letterer thay vì tự động co lại thành rail', () => {
    localStorage.clear();
    const lettererUser: CurrentUser = {
      name: 'Lê Văn Chữ',
      role: 'USER',
      workspaceRole: 'LETTERER' as any,
      activeRoles: ['LETTERER'],
      avatarInitials: 'LC',
    };

    renderInRouter(lettererUser, '/workspaces/ws-1/series/ser-1/letterer');

    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar).toBeInTheDocument();
    // Không bị co thành rail mà có class w-64 mở rộng mặc định
    expect(sidebar).toHaveClass('w-64');
    expect(sidebar).not.toHaveClass('w-16');
  });

  it('cho phép người dùng bấm nút tự thu gọn và mở rộng sidebar, trạng thái được lưu localStorage', () => {
    localStorage.clear();
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar).toHaveClass('w-64');

    const toggleBtn = screen.getByTestId('sidebar-rail-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-label', 'Thu gọn menu');

    // Bấm thu gọn
    fireEvent.click(toggleBtn);
    expect(sidebar).toHaveClass('w-16');
    expect(sidebar).not.toHaveClass('w-64');
    expect(localStorage.getItem('pf.sidebar.collapsed')).toBe('true');
    expect(toggleBtn).toHaveAttribute('aria-label', 'Mở rộng menu');

    // Bấm mở rộng lại
    fireEvent.click(toggleBtn);
    expect(sidebar).toHaveClass('w-64');
    expect(sidebar).not.toHaveClass('w-16');
    expect(localStorage.getItem('pf.sidebar.collapsed')).toBe('false');
  });

  it('mục điều hướng đang chọn có nền cam ngà #FFF2E6, chữ than #1C1917, aria-current="page" và không có nền đen', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    const activeLink = screen.getByRole('link', { name: /Series Dashboard/i });
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    // Nền cam ngà nhạt #FFF2E6, chữ than #1C1917, bo góc 8px (rounded-lg)
    expect(activeLink).toHaveClass('bg-[#FFF2E6]');
    expect(activeLink).toHaveClass('text-[#1C1917]');
    expect(activeLink).toHaveClass('rounded-lg');

    // Không có nền đen cũ #292524 hay rounded-full
    expect(activeLink).not.toHaveClass('bg-[#292524]');
    expect(activeLink).not.toHaveClass('rounded-full');
  });

  it('sidebar áp dụng màu nền trắng ngà #FCFBF8 và viền phải #E7E2D9', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar).toHaveClass('bg-[#FCFBF8]');
    expect(sidebar).toHaveClass('border-[#E7E2D9]');
  });
});

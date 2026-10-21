import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShellSidebar, AppShellSidebarProps } from './AppShellSidebar';
import { AppShell, CurrentUser } from './AppShell';
import { notificationService } from '@/services/notification.service';

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'notif-1',
          type: 'AssignmentAssigned',
          title: 'Giao việc mới',
          message: 'Bạn được giao Inking Trang 1',
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
      unreadCount: 3,
      pageIndex: 1,
      pageSize: 20,
    }),
    markAsRead: vi.fn().mockResolvedValue(1),
    markAllAsRead: vi.fn().mockResolvedValue(3),
  },
}));

describe('AppShell Navbar/Sidebar 3 Functions: Notifications, Global Search, My Activity', () => {
  const defaultUser: CurrentUser = {
    name: 'Kiểm Thử Viên',
    role: 'USER',
    workspaceRole: 'PRODUCER' as any,
    activeRoles: ['PRODUCER'],
    avatarInitials: 'KT',
  };

  const defaultProps: AppShellSidebarProps = {
    currentUser: defaultUser,
    activeSeries: { title: 'Cyberpunk Red', subtitle: 'Studio' },
    isReader: false,
    navSections: [],
    handleNavClick: vi.fn(),
    renderBadge: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppShellSidebar 4 footer functions removal and Logout retention', () => {
    it('không còn hiển thị 4 nút chức năng (Notifications, Global Search, My Activity, 2FA) ở góc dưới sidebar', () => {
      render(
        <MemoryRouter>
          <AppShellSidebar
            {...defaultProps}
            unreadNotificationCount={5}
            onOpenNotifications={vi.fn()}
            onOpenCommandPalette={vi.fn()}
            onOpenActivityHistory={vi.fn()}
            isCollapsed={false}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('sidebar-notifications-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-global-search-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-activity-history-btn')).not.toBeInTheDocument();
      expect(screen.queryByText(/Profile & Security/i)).not.toBeInTheDocument();
    });

    it('vẫn hiển thị nút Logout ở dưới cùng khi có callback onLogout', () => {
      const handleLogout = vi.fn();
      render(
        <MemoryRouter>
          <AppShellSidebar {...defaultProps} onLogout={handleLogout} isCollapsed={false} />
        </MemoryRouter>,
      );

      const logoutBtn = screen.getByTestId('sidebar-logout-btn');
      expect(logoutBtn).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();

      fireEvent.click(logoutBtn);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppShellSidebar: trạng thái do AppShell điều khiển bằng click', () => {
    it('không còn nút toggle trong sidebar (logo chỉ là thương hiệu)', () => {
      render(
        <MemoryRouter>
          <AppShellSidebar {...defaultProps} isCollapsed={false} />
        </MemoryRouter>,
      );
      expect(screen.queryByTestId('sidebar-rail-toggle-btn')).not.toBeInTheDocument();
    });

    it('không tự động mở rộng khi di chuột vào sidebar đang thu nhỏ (loại bỏ hover expand)', () => {
      render(
        <MemoryRouter>
          <AppShellSidebar {...defaultProps} isCollapsed={true} />
        </MemoryRouter>,
      );

      const sidebar = screen.getByTestId('app-shell-sidebar');
      expect(sidebar).toHaveStyle({ width: '64px' });

      fireEvent.mouseEnter(sidebar);
      expect(sidebar).toHaveStyle({ width: '64px' });
      // Nhãn ẩn khi thu gọn
      expect(screen.queryByText('v2.4')).not.toBeInTheDocument();
    });

    it('không tự động thu nhỏ khi bấm chuột ra ngoài sidebar đang mở rộng (loại bỏ click outside collapse)', () => {
      render(
        <MemoryRouter>
          <div>
            <div data-testid='outside-area'>Vùng bên ngoài</div>
            <AppShellSidebar {...defaultProps} isCollapsed={false} />
          </div>
        </MemoryRouter>,
      );

      fireEvent.mouseDown(screen.getByTestId('outside-area'));
      expect(screen.getByTestId('app-shell-sidebar')).toHaveStyle({ width: '256px' });
    });
  });

  describe('AppShell Component integration with header actions', () => {
    it('kích hoạt onOpenCommandPalette khi click vào ô tìm kiếm ⌘K trên header', async () => {
      const onOpenCommandPalette = vi.fn();

      render(
        <MemoryRouter>
          <AppShell currentUser={defaultUser} onOpenCommandPalette={onOpenCommandPalette}>
            <div>Nội dung</div>
          </AppShell>
        </MemoryRouter>,
      );

      const searchTrigger = screen.getByTestId('header-command-palette-trigger');
      expect(searchTrigger).toBeInTheDocument();

      fireEvent.click(searchTrigger);
      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });
  });
});

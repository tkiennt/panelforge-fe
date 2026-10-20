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

  describe('AppShellSidebar 3 footer buttons', () => {
    it('gọi onOpenNotifications khi nhấn vào nút Notifications và hiển thị badge số chưa đọc', () => {
      const handleOpenNotifications = vi.fn();
      render(
        <MemoryRouter>
          <AppShellSidebar
            {...defaultProps}
            unreadNotificationCount={5}
            onOpenNotifications={handleOpenNotifications}
            isCollapsed={false}
          />
        </MemoryRouter>,
      );

      const notifBtn = screen.getByTestId('sidebar-notifications-btn');
      expect(notifBtn).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-notifications-badge')).toHaveTextContent('5');

      fireEvent.click(notifBtn);
      expect(handleOpenNotifications).toHaveBeenCalledTimes(1);
    });

    it('hiển thị chấm đỏ khi sidebar ở trạng thái collapsed và có thông báo chưa đọc', () => {
      render(
        <MemoryRouter>
          <AppShellSidebar
            {...defaultProps}
            unreadNotificationCount={2}
            isCollapsed={true}
          />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('sidebar-notifications-dot')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-notifications-badge')).not.toBeInTheDocument();
    });

    it('gọi onOpenCommandPalette khi nhấn nút Global Search', () => {
      const handleOpenSearch = vi.fn();
      render(
        <MemoryRouter>
          <AppShellSidebar
            {...defaultProps}
            onOpenCommandPalette={handleOpenSearch}
            isCollapsed={false}
          />
        </MemoryRouter>,
      );

      const searchBtn = screen.getByTestId('sidebar-global-search-btn');
      expect(searchBtn).toBeInTheDocument();
      expect(screen.getByText('Global Search')).toBeInTheDocument();
      expect(screen.getByText('⌘K')).toBeInTheDocument();

      fireEvent.click(searchBtn);
      expect(handleOpenSearch).toHaveBeenCalledTimes(1);
    });

    it('gọi onOpenActivityHistory khi nhấn nút My Activity / History', () => {
      const handleOpenHistory = vi.fn();
      render(
        <MemoryRouter>
          <AppShellSidebar
            {...defaultProps}
            onOpenActivityHistory={handleOpenHistory}
            isCollapsed={false}
          />
        </MemoryRouter>,
      );

      const historyBtn = screen.getByTestId('sidebar-activity-history-btn');
      expect(historyBtn).toBeInTheDocument();
      expect(screen.getByText('My Activity / History')).toBeInTheDocument();

      fireEvent.click(historyBtn);
      expect(handleOpenHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppShell Component integration with notification polling and action wiring', () => {
    it('truyền các callback điều hướng và số thông báo chưa đọc xuống sidebar', async () => {
      const onOpenNotifications = vi.fn();
      const onOpenCommandPalette = vi.fn();
      const onOpenActivityHistory = vi.fn();

      render(
        <MemoryRouter>
          <AppShell
            currentUser={defaultUser}
            onOpenNotifications={onOpenNotifications}
            onOpenCommandPalette={onOpenCommandPalette}
            onOpenActivityHistory={onOpenActivityHistory}
          >
            <div>Nội dung</div>
          </AppShell>
        </MemoryRouter>,
      );

      // Chờ polling notificationService lấy unreadCount = 3
      await waitFor(() => {
        expect(notificationService.getNotifications).toHaveBeenCalled();
      });

      // Nhấn nút Notifications trên sidebar
      const notifBtns = screen.getAllByTestId('sidebar-notifications-btn');
      fireEvent.click(notifBtns[0]);
      expect(onOpenNotifications).toHaveBeenCalledTimes(1);

      // Nhấn nút Global Search trên sidebar
      const searchBtns = screen.getAllByTestId('sidebar-global-search-btn');
      fireEvent.click(searchBtns[0]);
      expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);

      // Nhấn nút My Activity / History trên sidebar
      const historyBtns = screen.getAllByTestId('sidebar-activity-history-btn');
      fireEvent.click(historyBtns[0]);
      expect(onOpenActivityHistory).toHaveBeenCalledTimes(1);
    });
  });
});

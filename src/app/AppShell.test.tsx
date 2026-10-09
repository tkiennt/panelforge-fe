import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell, CurrentUser } from './AppShell';

vi.mock('@/shared/features/collaboration/NotificationBell', () => ({
  NotificationBell: () => <div data-testid='notification-bell' />,
}));

describe('AppShell Component', () => {
  const renderInRouter = (user: CurrentUser, route = '/workspaces/ws-1/series/ser-1/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/*'
            element={
              <AppShell currentUser={user}>
                <div data-testid='outlet-content'>Content</div>
              </AppShell>
            }
          />
          <Route
            path='/*'
            element={
              <AppShell currentUser={user}>
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
    expect(screen.getByText('Production Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Bàn vẽ & Khung trang')).toBeInTheDocument();
    expect(screen.getByText('Chèn chữ & Bóng thoại')).toBeInTheDocument();
    expect(screen.getByText('Cổng Duyệt Xuất Bản')).toBeInTheDocument();
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
});

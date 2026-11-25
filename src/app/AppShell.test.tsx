import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell, CurrentUser } from './AppShell';
import { I18nProvider } from '@/lib/i18n';

vi.mock('@/shared/features/collaboration/NotificationBell', () => ({
  NotificationBell: () => <div data-testid='notification-bell' />,
}));

describe('AppShell Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderInRouter = (
    user: CurrentUser,
    route = '/workspaces/ws-1/series/ser-1/dashboard',
    props: Partial<React.ComponentProps<typeof AppShell>> = {},
  ) => {
    return render(
      <I18nProvider>
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
        </MemoryRouter>
      </I18nProvider>,
    );
  };

  it('hiển thị mục "Bàn vẽ Khung tranh" cho vai trò ARTIST trong ngữ cảnh Series', () => {
    const artistUser: CurrentUser = {
      name: 'Nguyễn Văn Họa Sĩ',
      role: 'USER',
      workspaceRole: 'ARTIST' as any,
      activeRoles: ['ARTIST'],
      avatarInitials: 'AH',
    };

    renderInRouter(artistUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Bàn vẽ Khung tranh')).toBeInTheDocument();
    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản (chỉ đọc)')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    // Artist không được thấy màn Letterer
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
  });

  it('hiển thị mục "Chèn chữ & Bóng thoại" cho vai trò LETTERER trong ngữ cảnh Series', () => {
    const lettererUser: CurrentUser = {
      name: 'Lê Văn Chữ',
      role: 'USER',
      workspaceRole: 'LETTERER' as any,
      activeRoles: ['LETTERER'],
      avatarInitials: 'LC',
    };

    renderInRouter(lettererUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Chèn chữ & Bóng thoại')).toBeInTheDocument();
    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản (chỉ đọc)')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    // Letterer không thấy màn Artist
    expect(screen.queryByText('Bàn vẽ Khung tranh')).not.toBeInTheDocument();
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

    expect(screen.getByText('Kịch bản Chương')).toBeInTheDocument();
    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    expect(screen.getByText('Hồ sơ Nhân vật & Lore')).toBeInTheDocument();
    expect(screen.queryByText('Bàn vẽ Khung tranh')).not.toBeInTheDocument();
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
  });

  it('hiển thị đầy đủ Bàn kiểm tra & hiệu đính, Kịch bản, Series Bible cho vai trò EDITOR trong ngữ cảnh Series', () => {
    const editorUser: CurrentUser = {
      name: 'Vũ Biên Tập',
      role: 'USER',
      workspaceRole: 'EDITOR' as any,
      activeRoles: ['EDITOR'],
      avatarInitials: 'VB',
    };

    renderInRouter(editorUser, '/workspaces/ws-1/series/ser-1/my-work');

    expect(screen.getByText('Kiểm tra & Hiệu đính')).toBeInTheDocument();
    expect(screen.getByText(/Kịch bản/)).toBeInTheDocument();
    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    expect(screen.queryByText('Bàn vẽ Khung tranh')).not.toBeInTheDocument();
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
    expect(screen.queryByText('Cổng Duyệt Xuất Bản')).not.toBeInTheDocument();
  });

  it('vai trò PRODUCER trong Series thấy chính xác các menu quản lý và sản xuất theo Stitch', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    expect(screen.getByText('Tiến độ & Giao việc')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản & Cổng duyệt')).toBeInTheDocument();
    expect(screen.getByText('Đọc duyệt tranh')).toBeInTheDocument();
    expect(screen.getByText('Đóng gói & Xuất bản')).toBeInTheDocument();
    expect(screen.getByText('Thư viện')).toBeInTheDocument();
    expect(screen.getByText('Doanh thu & Lượt đọc')).toBeInTheDocument();
    expect(screen.getByText('Đội ngũ')).toBeInTheDocument();
    // Removed old items:
    expect(screen.queryByText('Quy trình sản xuất')).not.toBeInTheDocument();
    expect(screen.queryByText('Bàn vẽ & Khung trang')).not.toBeInTheDocument();
    expect(screen.queryByText('Chèn chữ & Bóng thoại')).not.toBeInTheDocument();
    expect(screen.queryByText('Cổng Duyệt Xuất Bản')).not.toBeInTheDocument();
    expect(screen.queryByText('Series Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Quản lý chương')).not.toBeInTheDocument();
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

  it('kích hoạt onOpenCommandPalette khi nhấn tổ hợp phím ⌘K / Ctrl+K', () => {
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

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
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
    expect(sidebar).toHaveStyle({ width: '256px' });
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
    expect(sidebar).toHaveStyle({ width: '256px' });

    const toggleBtn = screen.getByTestId('sidebar-rail-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-label', 'Thu gọn thanh điều hướng');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'app-shell-sidebar');
    // Nút nằm bên trong side rail (Lucian UX/UI Prompt #040)
    expect(sidebar).toContainElement(toggleBtn);

    // Bấm thu gọn
    fireEvent.click(toggleBtn);
    expect(sidebar).toHaveStyle({ width: '64px' });
    expect(localStorage.getItem('pf.sidebar.collapsed')).toBe('true');
    const collapsedToggleBtn = screen.getByTestId('sidebar-rail-toggle-btn');
    expect(collapsedToggleBtn).toHaveAttribute('aria-label', 'Mở rộng thanh điều hướng');
    expect(collapsedToggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Hover không tự mở rộng
    fireEvent.mouseEnter(sidebar);
    expect(sidebar).toHaveStyle({ width: '64px' });

    // Bấm mở rộng lại
    fireEvent.click(collapsedToggleBtn);
    expect(sidebar).toHaveStyle({ width: '256px' });
    expect(localStorage.getItem('pf.sidebar.collapsed')).toBe('false');
  });

  it('mục điều hướng đang chọn áp dụng theme Lucianlab (#040) với highlight nổi bật và aria-current="page"', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/workspace');

    const activeLink = screen.getByRole('link', { name: /Tiến độ & Giao việc/i });
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    // Mục đang chọn: vạch nhấn + nền nhẹ qua token scope của sidebar
    expect(activeLink).toHaveClass('pf-sb-item');
    expect(activeLink).toHaveClass('rounded-xl');
    expect(activeLink.querySelector('span[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('highlights Quy trình sản xuất on the production page even though its link carries ?chapterId', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/workspace?chapterId=ch-1');

    const current = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toContain('/series/ser-1/workspace?chapterId=ch-1');
  });

  it('sidebar áp dụng màu nền Dark Ink #1C1917 và viền phải #292524 chuẩn theme Lucianlab (#040)', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    localStorage.clear();
    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    // Mặc định "Mực đậm" cho người chưa chọn
    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar).toHaveClass('pf-sidebar');
    expect(sidebar).toHaveAttribute('data-sb-theme', 'ink');

    // Đổi preset: áp dụng ngay và lưu trên thiết bị
    fireEvent.click(screen.getByTestId('sidebar-theme-btn'));
    const ocean = screen.getByTestId('sidebar-theme-ocean');
    expect(screen.getByTestId('sidebar-theme-ink')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(ocean);
    expect(sidebar).toHaveAttribute('data-sb-theme', 'ocean');
    expect(localStorage.getItem('pf.sidebar.theme')).toBe('ocean');
  });

  it('không còn hiển thị chữ AI: Sẵn sàng và nút Export trên navbar header', () => {
    const producerUser: CurrentUser = {
      name: 'Phạm Nhà Sản Xuất',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'PN',
    };

    renderInRouter(producerUser, '/workspaces/ws-1/series/ser-1/dashboard');

    // Chữ AI: Sẵn sàng và nút Export không tồn tại trong Navbar
    expect(screen.queryByText(/AI: Sẵn sàng/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Export$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Export$/i)).not.toBeInTheDocument();
  });

  it('chuyển đổi ngôn ngữ VI sang EN qua LanguageSwitcher cập nhật tức thì toàn bộ menu và header', () => {
    localStorage.clear();
    const artistUser: CurrentUser = {
      name: 'Nguyễn Văn Họa Sĩ',
      role: 'USER',
      workspaceRole: 'ARTIST' as any,
      activeRoles: ['ARTIST'],
      avatarInitials: 'AH',
    };

    renderInRouter(artistUser, '/workspaces/ws-1/series/ser-1/my-work');

    // Mặc định là Tiếng Việt
    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Bàn vẽ Khung tranh')).toBeInTheDocument();

    // Chuyển sang Tiếng Anh
    const enBtn = screen.getByTestId('lang-btn-en');
    fireEvent.click(enBtn);

    // Kiểm tra các nhãn điều hướng đổi sang English
    expect(screen.getByText('My Work')).toBeInTheDocument();
    expect(screen.getByText('Panel Canvas')).toBeInTheDocument();

    // Chuyển lại về Tiếng Việt
    const viBtn = screen.getByTestId('lang-btn-vi');
    fireEvent.click(viBtn);

    expect(screen.getByText('Việc của tôi')).toBeInTheDocument();
    expect(screen.getByText('Bàn vẽ Khung tranh')).toBeInTheDocument();
  });

  it('hiển thị thẻ img với avatarUrl khi có ảnh đại diện của user', () => {
    const userWithAvatar: CurrentUser = {
      name: 'Alex Producer',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'AP',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    };

    renderInRouter(userWithAvatar, '/workspaces/ws-1/dashboard');

    const headerUserBtn = screen.getByTestId('header-user-menu-btn');
    const avatarImg = within(headerUserBtn).getByRole('img', { name: 'Alex Producer' });
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', userWithAvatar.avatarUrl);
    expect(within(headerUserBtn).queryByText('AP')).not.toBeInTheDocument();
  });

  it('fallback về avatarInitials khi avatarUrl bị lỗi tải', () => {
    const userWithFailingAvatar: CurrentUser = {
      name: 'Alex Producer',
      role: 'USER',
      workspaceRole: 'PRODUCER' as any,
      activeRoles: ['PRODUCER'],
      avatarInitials: 'AP',
      avatarUrl: 'https://invalid-avatar-url.jpg',
    };

    renderInRouter(userWithFailingAvatar, '/workspaces/ws-1/dashboard');

    const headerUserBtn = screen.getByTestId('header-user-menu-btn');
    const avatarImg = within(headerUserBtn).getByRole('img', { name: 'Alex Producer' });
    expect(avatarImg).toBeInTheDocument();

    // Giả lập lỗi tải ảnh (onError)
    fireEvent.error(avatarImg);

    // Sau khi ảnh lỗi, component fallback hiển thị initials
    expect(within(headerUserBtn).getByText('AP')).toBeInTheDocument();
    expect(
      within(headerUserBtn).queryByRole('img', { name: 'Alex Producer' }),
    ).not.toBeInTheDocument();
  });
});

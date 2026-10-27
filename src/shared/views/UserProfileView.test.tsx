import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProfileView } from './UserProfileView';
import { userService } from '@/services/user.service';
import { workspaceService } from '@/services/workspace.service';

describe('UserProfileView Component', () => {
  const mockUser = {
    id: 'user-001',
    username: 'Tatsuki Fujimoto',
    email: 'fujimoto@panelforge.studio',
    avatar: 'https://example.com/avatar.jpg',
    phoneNumber: '+84901234567',
    isActive: true,
    role: 'USER',
    createdAt: '2026-02-01T00:00:00Z',
  };

  const mockWorkspaces = [
    {
      id: 'ws-1',
      name: 'Chainsaw & Devil Studio',
      ownerId: 'user-001',
      ownerName: 'Tatsuki Fujimoto',
      ownerEmail: 'fujimoto@panelforge.studio',
      storageQuotaBytes: 10737418240,
      usedStorageBytes: 52428800,
      createdAt: '2026-02-01T00:00:00Z',
      isOwner: true,
      currentUserRole: 'ARTIST',
      memberCount: 4,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    vi.spyOn(userService, 'getMyProfile').mockResolvedValue(mockUser);
    vi.spyOn(userService, 'updateProfile').mockResolvedValue(mockUser);
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue(mockWorkspaces as any);
  });

  it('hiển thị đầy đủ thông tin hồ sơ và danh sách workspace từ API', async () => {
    render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('@tatsuki_fujimoto').length).toBeGreaterThan(0);
    expect(screen.getAllByText('fujimoto@panelforge.studio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+84901234567').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Chainsaw & Devil Studio')).toBeInTheDocument();
    });
    expect(screen.getByText(/Họa sĩ \(Artist\)/i)).toBeInTheDocument();
  });

  it('chuyển sang chế độ chỉnh sửa, kiểm tra validation và lưu thành công', async () => {
    vi.spyOn(userService, 'updateProfile').mockResolvedValue({
      ...mockUser,
      username: 'Fujimoto Editor',
    });

    render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
    });

    // Bấm nút chỉnh sửa hồ sơ
    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('ĐANG CHỈNH SỬA')).toBeInTheDocument();

    // Thay đổi username
    const usernameInput = screen.getByLabelText(/Tên hiển thị \/ Bút danh tác giả/i);
    fireEvent.change(usernameInput, { target: { value: 'Fujimoto Editor' } });

    // Bấm Lưu thay đổi
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledWith('user-001', {
        username: 'Fujimoto Editor',
        phoneNumber: '+84901234567',
        avatar: 'https://example.com/avatar.jpg',
      });
      expect(screen.getByText(/Hồ sơ tác giả đã được cập nhật thành công/i)).toBeInTheDocument();
    });
  });

  it('báo lỗi khi bỏ trống username trong form chỉnh sửa', async () => {
    render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i });
    fireEvent.click(editBtn);

    const usernameInput = screen.getByLabelText(/Tên hiển thị \/ Bút danh tác giả/i);
    fireEvent.change(usernameInput, { target: { value: '   ' } });

    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tên hiển thị \/ bút danh là bắt buộc/i)).toBeInTheDocument();
      expect(userService.updateProfile).not.toHaveBeenCalled();
    });
  });

  it('hủy bỏ chỉnh sửa thì khôi phục lại dữ liệu ban đầu', async () => {
    render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i });
    fireEvent.click(editBtn);

    const usernameInput = screen.getByLabelText(/Tên hiển thị \/ Bút danh tác giả/i);
    fireEvent.change(usernameInput, { target: { value: 'New Temporary Name' } });

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('CHẾ ĐỘ XEM')).toBeInTheDocument();
    expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
  });

  it('hiển thị tên tác giả với hiệu ứng mực in loang mép (pf-ink-bleed-title) và nét cọ cam quệt qua', async () => {
    const { container } = render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tatsuki Fujimoto').length).toBeGreaterThan(0);
    });

    // Tiêu đề tên hiển thị có class hiệu ứng mực loang
    const nameHeading = screen.getByRole('heading', { name: 'Tatsuki Fujimoto', level: 2 });
    expect(nameHeading).toHaveClass('pf-ink-bleed-title');

    // Bộ lọc SVG filter #pf-manuscript-ink-bleed hiện diện trong DOM
    const filterDef = container.querySelector('#pf-manuscript-ink-bleed');
    expect(filterDef).toBeInTheDocument();
    expect(filterDef?.querySelector('feTurbulence')).toBeInTheDocument();
    expect(filterDef?.querySelector('feDisplacementMap')).toBeInTheDocument();

    // Nét cọ cam SVG (#F97316) hiện diện ngay bên dưới tên
    const brushSvg = container.querySelector('svg.pointer-events-none path[fill="#F97316"]');
    expect(brushSvg).toBeInTheDocument();
  });

  it('hỗ trợ tên tiếng Việt có dấu phức tạp với đầy đủ cấu trúc nhận diện và hiệu ứng', async () => {
    const vietnameseUser = {
      ...mockUser,
      username: 'Nguyễn Đắc Thắng Long',
    };
    vi.spyOn(userService, 'getMyProfile').mockResolvedValue(vietnameseUser);

    render(
      <MemoryRouter>
        <UserProfileView onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Nguyễn Đắc Thắng Long').length).toBeGreaterThan(0);
    });

    const heading = screen.getByRole('heading', { name: 'Nguyễn Đắc Thắng Long', level: 2 });
    expect(heading).toHaveClass('pf-ink-bleed-title');
    expect(heading).toBeInTheDocument();
  });
});

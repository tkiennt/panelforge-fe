import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import App from './App';
import { workspaceService } from './services/workspace.service';
import { seriesService } from './services/series.service';
import { WorkspaceDto, readCachedWorkspace, writeCachedWorkspace } from './types';
import axiosClient from './api/axiosClient';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Mặc định mọi request HTTP trả 404 (các service tự rơi vào nhánh fallback) để test không phụ thuộc
// vào backend thật đang chạy ở localhost:5044
const notFoundAdapter = async (config: InternalAxiosRequestConfig) => {
  throw new AxiosError('Not Found', 'ERR_BAD_REQUEST', config, null, {
    data: '',
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config,
  });
};

// Mock Firebase module
vi.mock('@/config/firebase', () => ({
  signInWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Return null user initially
    callback(null);
    return () => {};
  }),
  auth: { signOut: vi.fn(() => Promise.resolve()) },
  googleProvider: {},
}));

describe('App Integration Smoke Test', () => {
  beforeEach(() => {
    localStorage.clear();
    axiosClient.defaults.adapter = notFoundAdapter;
    // Mỗi test giả lập "tải lại trang trong cùng phiên": bắt đầu từ "/" và bỏ qua bước dọn phiên mới
    // (App xoá token khi mở tab/phiên mới nếu không ghi nhớ thiết bị).
    sessionStorage.clear();
    sessionStorage.setItem('pf_app_session_started', 'true');
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('khởi chạy ứng dụng thành công và render landing page / header chính', () => {
    render(<App />);

    // Kiểm tra thương hiệu PanelForge được hiển thị
    const brandElements = screen.getAllByText(/PANELFORGE/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
  });

  it('chuyển đổi giữa 2 Workspace: vào Workspace A (Producer) -> quay lại danh sách -> vào Workspace B (Artist) -> reset sạch quyền Producer và chỉ hiển thị quyền Artist', async () => {
    // 1. Setup authenticated user in localStorage
    localStorage.setItem('token', 'mock-user-token');
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u-123',
        fullName: 'Test User',
        email: 'user@panelforge.com',
        role: 'User',
      }),
    );

    // 2. Mock 2 workspaces: Workspace A với role PRODUCER, Workspace B với role ARTIST
    const mockWorkspaces: WorkspaceDto[] = [
      {
        id: 'ws-a',
        name: 'Workspace Alpha (Producer)',
        ownerId: 'u-123',
        ownerName: 'Test User',
        ownerEmail: 'user@panelforge.com',
        storageQuotaBytes: 1000000000,
        usedStorageBytes: 100000,
        createdAt: '2026-01-01T00:00:00Z',
        isOwner: true,
        currentUserRole: 'PRODUCER',
        memberCount: 3,
        pendingTasks: 2,
      },
      {
        id: 'ws-b',
        name: 'Workspace Beta (Artist)',
        ownerId: 'u-456',
        ownerName: 'Other Owner',
        ownerEmail: 'owner@panelforge.com',
        storageQuotaBytes: 1000000000,
        usedStorageBytes: 50000,
        createdAt: '2026-01-02T00:00:00Z',
        isOwner: false,
        currentUserRole: 'ARTIST',
        memberCount: 5,
        pendingTasks: 1,
      },
    ];

    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue(mockWorkspaces as any);
    vi.spyOn(seriesService, 'getSeriesList').mockResolvedValue([
      { id: 's-1', title: 'Series One', createdAt: '2026-01-01T00:00:00Z' } as any,
    ]);

    render(<App />);

    // 3. Đợi WorkspaceListView hiển thị danh sách 2 workspace (App nạp lười nhiều route: cho thời gian khi máy bận)
    await waitFor(
      () => {
        expect(screen.getByText('Workspace Alpha (Producer)')).toBeInTheDocument();
        expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // 4. User chọn vào Workspace Alpha (Producer)
    fireEvent.click(screen.getByRole('button', { name: 'Vào studio: Workspace Alpha (Producer)' }));

    // 5. Xác nhận giao diện Studio hiển thị menu / hành động dành riêng cho Producer
    await waitFor(
      () => {
        // Menu Members & Roles đã gộp vào ProducerWorkspaceView, chỉ cần kiểm tra nút của Producer
        expect(screen.getByText('Tạo bộ truyện')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // 6. User mở Studio Switcher và chọn "Xem tất cả Studio" để rời khỏi Workspace
    fireEvent.click(screen.getByTestId('studio-switcher-trigger'));
    fireEvent.click(await screen.findByTestId('studio-switcher-view-all-btn'));

    // 7. Xác nhận đã quay lại WorkspaceListView và currentWorkspaceRole đã được reset
    await waitFor(
      () => {
        // Alpha xuất hiện cả ở card và dòng "Truy cập gần đây"
        expect(
          screen.getByRole('button', { name: /Workspace Alpha \(Producer\)/ }),
        ).toBeInTheDocument();
        expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
        // Menu / hành động của Producer đã biến mất hoàn toàn
        expect(screen.queryByText('Tạo bộ truyện')).not.toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // 8. User chọn vào Workspace Beta (Artist)
    fireEvent.click(screen.getByRole('button', { name: 'Vào studio: Workspace Beta (Artist)' }));

    // 9. Xác nhận chuyển vào màn chọn Series của Workspace B (/workspaces/ws-b/series)
    // và không có quyền / nút tạo của Producer
    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/workspaces/ws-b/series');
        expect(screen.getByText('Series One')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
    expect(screen.queryByText('Tạo bộ truyện')).not.toBeInTheDocument();

    // 10. User chọn Series One để vào môi trường làm việc chính của Artist
    fireEvent.click(screen.getByRole('button', { name: /Xem việc của tôi/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/workspaces/ws-b/series/s-1/my-work');
    });
    // Menu / hành động dành riêng cho Producer TUYỆT ĐỐI KHÔNG xuất hiện
    expect(screen.queryByText('Members & Roles')).not.toBeInTheDocument();
    expect(screen.queryByText('Tạo bộ truyện')).not.toBeInTheDocument();
  }, 30000);

  it('đăng nhập ADMINISTRATOR -> điều hướng tới /admin và render AdminDashboardView, TUYỆT ĐỐI KHÔNG bị đẩy về /workspaces', async () => {
    localStorage.setItem('token', 'mock-admin-token');
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u-admin-01',
        fullName: 'Global System Administrator',
        email: 'sysadmin@panelforge.com',
        role: 'ADMINISTRATOR',
      }),
    );

    render(<App />);

    // Phải render Admin Console và System Admin Zone
    await waitFor(
      () => {
        expect(screen.getByText('PanelForge // Cổng Quản Trị')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument();
        // Menu của Admin phải hiện đầy đủ
        expect(screen.getAllByText('Tổng quan').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Người dùng & quyền').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Cấu hình AI').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Nhật ký hệ thống').length).toBeGreaterThan(0);
        // TUYỆT ĐỐI KHÔNG bị redirect về màn hình danh sách Workspace
        expect(screen.queryByText('Active Studio Workspaces')).not.toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('đăng nhập USER -> điều hướng tới /workspaces và render WorkspaceListView', async () => {
    localStorage.setItem('token', 'mock-user-token');
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u-std-user',
        fullName: 'Standard Studio User',
        email: 'member@panelforge.com',
        role: 'USER',
      }),
    );

    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);

    render(<App />);

    // Phải render Workspace Catalog
    await waitFor(() => {
      expect(screen.getByText('Chào mừng đến với PanelForge')).toBeInTheDocument();
      // TUYỆT ĐỐI KHÔNG hiển thị System Admin Zone
      expect(screen.queryByText('System Admin Zone')).not.toBeInTheDocument();
      expect(
        screen.queryByText('PanelForge System Administration Console'),
      ).not.toBeInTheDocument();
    });
  });

  it('BẢO MẬT: Giả mạo localStorage userRole = ADMINISTRATOR khi JWT token là USER -> Không bị đánh lừa, KHÔNG vào /admin', async () => {
    // 1. JWT Token thật từ backend có claim role là "User"
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: 'u-attacker',
        email: 'attacker@panelforge.com',
        role: 'User',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const validUserJwt = `${header}.${payload}.signature`;

    localStorage.setItem('token', validUserJwt);
    // 2. Kẻ gian cố tình gõ console setItem userRole = 'ADMINISTRATOR' để qua mặt guard
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u-attacker',
        fullName: 'Malicious User',
        email: 'attacker@panelforge.com',
        role: 'User',
      }),
    );

    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);

    render(<App />);

    // Sau khi đã vá: Hệ thống giải mã token JWT thật ra claim USER,
    // TUYỆT ĐỐI KHÔNG render Admin Console, tự động chuyển về /workspaces và ghi đè lại userRole = 'USER'
    await waitFor(() => {
      expect(
        screen.queryByText('PanelForge System Administration Console'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('System Admin Zone')).not.toBeInTheDocument();
      expect(screen.getByText('Chào mừng đến với PanelForge')).toBeInTheDocument();
      expect(localStorage.getItem('userRole')).toBe('USER');
    });
  });

  it('BƯỚC 5.1 & 5.2: Đăng nhập bằng tài khoản Admin thật với JWT hợp lệ -> ở lại /admin, gọi system-stats 200, KHÔNG bị bật ngược về /workspaces', async () => {
    // 1. Tạo JWT thật có đúng 3 phần header.payload.signature do backend ký với claim Admin
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '11111111-1111-1111-1111-111111111111',
        email: 'admin@panelforge.com',
        role: 'Admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const validAdminJwt = `${header}.${payload}.real_signature_hash`;

    // Xác nhận token có đúng 2 dấu chấm (3 phần)
    expect(validAdminJwt.split('.').length).toBe(3);

    localStorage.setItem('token', validAdminJwt);
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@panelforge.com',
        role: 'Admin',
      }),
    );

    // Mock fetch cho GET /api/Admin/system-stats trả về 200 OK
    const mockStats = {
      totalUsers: 11,
      admins: 1,
      registeredUsers: 10,
      totalWorkspaces: 2,
      totalWorkspaceMembers: 6,
      serverTimeUtc: new Date().toISOString(),
    };

    // Service dùng axiosClient → giả lập ở tầng adapter để vẫn kiểm tra header Authorization do interceptor gắn
    const adapterMock = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const respond = (status: number, data: unknown) => ({
        data,
        status,
        statusText: '',
        headers: {},
        config,
      });
      if (config.url?.includes('/Admin/system-stats')) {
        // Kiểm tra header Authorization nhận đúng Bearer token có 2 dấu chấm
        if (config.headers.Authorization === `Bearer ${validAdminJwt}`) {
          return respond(200, mockStats);
        }
        throw new AxiosError('IDX14100: JWT is not well formed', 'ERR_BAD_REQUEST', config, null, {
          ...respond(401, { message: 'IDX14100: JWT is not well formed' }),
        });
      }
      return respond(200, []);
    });
    axiosClient.defaults.adapter = adapterMock;

    render(<App />);

    // Kiểm tra: ở lại /admin, render Admin Dashboard, KHÔNG bị bật ngược về /workspaces
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument();
      expect(screen.queryByText('Không gian sáng tạo')).not.toBeInTheDocument();
    });

    // Xác nhận gọi thành công system-stats với đúng JWT thật
    const systemStatsCall = adapterMock.mock.calls.find(([config]) =>
      config.url?.includes('/Admin/system-stats'),
    );
    expect(systemStatsCall).toBeDefined();
    expect(systemStatsCall![0].headers.Authorization).toBe(`Bearer ${validAdminJwt}`);
  });

  it('BƯỚC 5.3: Sau khi logout, localStorage không còn bất kỳ giá trị token cũ (thật hoặc mock) nào sót lại', async () => {
    localStorage.setItem('token', 'mock-admin-token');
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    localStorage.setItem('demoRole', 'administrator');
    localStorage.setItem('isDemoMode', 'true');
    localStorage.setItem('user', JSON.stringify({ email: 'admin@panelforge.com' }));
    localStorage.setItem('pf_remember_device', 'remember-token-xyz');
    localStorage.setItem('refreshToken', 'refresh-token-xyz');

    render(<App />);

    // Tìm và nhấn nút Đăng xuất trong App shell
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument();
    });

    // Admin Portal dùng AppShell chung: đăng xuất qua menu người dùng trên header
    fireEvent.click(screen.getByTestId('header-user-menu-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    // Xác nhận toàn bộ localStorage liên quan đến auth đã được dọn sạch 100%
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('demoRole')).toBeNull();
      expect(localStorage.getItem('isDemoMode')).toBeNull();
      expect(localStorage.getItem('pf_remember_device')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    // Xác nhận hiển thị đúng toast đăng xuất chủ động
    await waitFor(() => {
      expect(screen.getByText('Đã đăng xuất')).toBeInTheDocument();
      expect(screen.getByText('Bạn đã đăng xuất khỏi PanelForge.')).toBeInTheDocument();
      expect(screen.getByTestId('toast-icon-logout')).toBeInTheDocument();
    });
  });

  it('sự kiện auth:unauthorized hiển thị toast "Phiên đăng nhập đã hết hạn" và deduplicate khi nhiều lỗi đồng thời', async () => {
    localStorage.setItem('token', 'mock-user-token');
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u-123',
        fullName: 'Test User',
        email: 'user@panelforge.com',
      }),
    );

    render(<App />);

    // Giả lập 3 request đồng thời cùng nhận lỗi hết phiên và phát auth:unauthorized
    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
      window.dispatchEvent(new Event('auth:unauthorized'));
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    // Kiểm tra: Chỉ có duy nhất 1 toast xuất hiện, không bị nhân bản
    await waitFor(() => {
      const toasts = screen.getAllByText('Phiên đăng nhập đã hết hạn');
      expect(toasts).toHaveLength(1);
      expect(screen.getByText('Vui lòng đăng nhập lại để tiếp tục.')).toBeInTheDocument();
      expect(screen.getByTestId('toast-icon-warning')).toBeInTheDocument();
    });
  });

  it('khách chưa từng có phiên đăng nhập (chưa lưu user/token/cờ) TUYỆT ĐỐI KHÔNG hiện toast "Phiên đăng nhập đã hết hạn"', async () => {
    localStorage.clear();

    render(<App />);

    // Giả lập backend trả 401 khi kiểm tra me/refresh và phát auth:unauthorized
    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    // Xác nhận tuyệt đối không có toast cảnh báo hết phiên
    expect(screen.queryByText('Phiên đăng nhập đã hết hạn')).not.toBeInTheDocument();
  });

  it('LỖI 1: bỏ bản cache activeWorkspace thuộc user trước và luôn gọi lại API lấy currentUserRole khi vào /workspaces/:id/...', async () => {
    // Giả lập Artist (user-artist) đã để lại cache activeWorkspace với currentUserRole = Artist
    writeCachedWorkspace(
      {
        id: 'ws-shared',
        name: 'Studio Chung',
        ownerId: 'user-producer',
        ownerName: 'Producer A',
        ownerEmail: 'producer@panelforge.com',
        storageQuotaBytes: 1024,
        usedStorageBytes: 0,
        createdAt: '2026-11-14T00:00:00Z',
        isOwner: false,
        currentUserRole: 'ARTIST',
        memberCount: 4,
      },
      'user-artist',
    );
    localStorage.setItem('workspaceRole', 'ARTIST');

    // Nay Producer (user-producer) đăng nhập và F5 thẳng tại /workspaces/ws-shared/series
    localStorage.setItem('token', 'mock-user-token');
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'user-producer',
        fullName: 'Producer A',
        email: 'producer@panelforge.com',
      }),
    );

    // readCachedWorkspace phát hiện lệch user -> xoá sạch cache của Artist
    expect(readCachedWorkspace()).toBeNull();
    expect(localStorage.getItem('activeWorkspace')).toBeNull();
    expect(localStorage.getItem('workspaceRole')).toBeNull();

    // Kể cả khi còn cache cũ chưa gắn user trong localStorage và Producer F5 vào /workspaces/ws-shared/series:
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({
        id: 'ws-shared',
        name: 'Studio Chung',
        isOwner: false,
        currentUserRole: 'ARTIST',
      }),
    );
    localStorage.setItem('workspaceRole', 'ARTIST');
    window.history.pushState({}, '', '/workspaces/ws-shared/series');

    const producerWs: WorkspaceDto = {
      id: 'ws-shared',
      name: 'Studio Chung',
      ownerId: 'user-producer',
      ownerName: 'Producer A',
      ownerEmail: 'producer@panelforge.com',
      storageQuotaBytes: 1024,
      usedStorageBytes: 0,
      createdAt: '2026-11-14T00:00:00Z',
      isOwner: true,
      currentUserRole: 'PRODUCER',
      memberCount: 4,
    };
    const getWsByIdSpy = vi
      .spyOn(workspaceService, 'getWorkspaceById')
      .mockResolvedValue(producerWs);
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([producerWs]);
    vi.spyOn(workspaceService, 'getMembers').mockResolvedValue([]);
    vi.spyOn(seriesService, 'getSeriesList').mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(getWsByIdSpy).toHaveBeenCalledWith('ws-shared');
      expect(localStorage.getItem('workspaceRole')).toBe('PRODUCER');
    });

    const syncedCache = JSON.parse(localStorage.getItem('activeWorkspace') || '{}');
    expect(syncedCache.currentUserRole).toBe('PRODUCER');
    expect(syncedCache.cachedForUserId).toBe('user-producer');
  });
});

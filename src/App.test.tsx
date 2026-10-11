import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { workspaceService } from './services/workspace.service';
import { seriesService } from './services/series.service';
import { WorkspaceDto } from './types';
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

    // 3. Đợi WorkspaceListView hiển thị danh sách 2 workspace
    await waitFor(() => {
      expect(screen.getByText('Workspace Alpha (Producer)')).toBeInTheDocument();
      expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
    });

    // 4. User chọn vào Workspace Alpha (Producer)
    fireEvent.click(screen.getByText('Workspace Alpha (Producer)'));

    // 5. Xác nhận giao diện Studio hiển thị menu / hành động dành riêng cho Producer
    await waitFor(() => {
      // Menu Members & Roles đã gộp vào ProducerWorkspaceView, chỉ cần kiểm tra nút của Producer
      expect(screen.getByText('Tạo Series Mới')).toBeInTheDocument();
    });

    // 6. User bấm nút "Workspaces" trên breadcrumb để rời khỏi Workspace
    const backBtn = screen.getByTestId('back-to-workspaces-breadcrumb');
    fireEvent.click(backBtn);

    // 7. Xác nhận đã quay lại WorkspaceListView và currentWorkspaceRole đã được reset
    await waitFor(() => {
      expect(screen.getByText('Workspace Alpha (Producer)')).toBeInTheDocument();
      expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
      // Menu / hành động của Producer đã biến mất hoàn toàn
      expect(screen.queryByText('Tạo Series Mới')).not.toBeInTheDocument();
    });

    // 8. User chọn vào Workspace Beta (Artist)
    fireEvent.click(screen.getByText('Workspace Beta (Artist)'));

    // 9. Xác nhận Workspace B (Artist) KHÔNG còn menu / hành động của Producer
    // Artist vào thẳng bàn làm việc thật "Công việc của tôi" của Series đầu tiên (không bị rơi vào màn mock hay bị đẩy về danh sách)
    await waitFor(() => {
      expect(window.location.pathname).toBe('/workspaces/ws-b/series/s-1/my-work');
    });
    // Menu / hành động dành riêng cho Producer TUYỆT ĐỐI KHÔNG xuất hiện
    expect(screen.queryByText('Members & Roles')).not.toBeInTheDocument();
    expect(screen.queryByText('Tạo Series Mới')).not.toBeInTheDocument();
  });

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
    await waitFor(() => {
      expect(screen.getByText('Global System Admin')).toBeInTheDocument();
      expect(screen.getByText('PanelForge System Administration Console')).toBeInTheDocument();
      // Menu của Admin phải hiện đầy đủ
      expect(screen.getByText('Overview & Health')).toBeInTheDocument();
      expect(screen.getByText('Global User Management')).toBeInTheDocument();
      expect(screen.getByText('AI Credentials & Quotas')).toBeInTheDocument();
      expect(screen.getByText('System Audit Log')).toBeInTheDocument();
      // TUYỆT ĐỐI KHÔNG bị redirect về màn hình danh sách Workspace
      expect(screen.queryByText('Active Studio Workspaces')).not.toBeInTheDocument();
    });
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
      expect(screen.getByText('Production Workspace Catalog')).toBeInTheDocument();
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
      expect(screen.getByText('Production Workspace Catalog')).toBeInTheDocument();
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
      expect(screen.getByText('PanelForge System Administration Console')).toBeInTheDocument();
      expect(screen.queryByText('Production Workspace Catalog')).not.toBeInTheDocument();
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
      expect(screen.getByText('PanelForge System Administration Console')).toBeInTheDocument();
    });

    // Trang Admin có nút Đăng xuất riêng ở chân sidebar
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất System Root/i }));

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
  });
});

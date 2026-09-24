import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { workspaceService } from './services/workspace.service';
import { WorkspaceDto } from './types';

// Mock Firebase module
vi.mock('./firebase', () => ({
  signInWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Return null user initially
    callback(null);
    return () => {};
  }),
  auth: { signOut: vi.fn() },
  googleProvider: {},
}));

describe('App Integration Smoke Test', () => {
  beforeEach(() => {
    localStorage.clear();
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

    render(<App />);

    // 3. Đợi WorkspaceListView hiển thị danh sách 2 workspace
    await waitFor(() => {
      expect(screen.getByText('Workspace Alpha (Producer)')).toBeInTheDocument();
      expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
    });

    // 4. User chọn vào Workspace Alpha (Producer)
    fireEvent.click(screen.getByText('Workspace Alpha (Producer)'));

    // 5. Xác nhận giao diện hiển thị đúng vai trò PRODUCER và các menu đặc thù Producer
    await waitFor(() => {
      expect(screen.getAllByText('PRODUCER').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Production Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Release Calendar')).toBeInTheDocument();
      // Menu của Artist không được xuất hiện
      expect(screen.queryByText('My Task Queue')).not.toBeInTheDocument();
      expect(screen.queryByText('Layout & Thumbnail')).not.toBeInTheDocument();
      expect(screen.queryByText('ARTIST')).not.toBeInTheDocument();
    });

    // 6. User bấm nút "Workspaces" trên breadcrumb để rời khỏi Workspace
    const backBtn = screen.getByTestId('back-to-workspaces-breadcrumb');
    fireEvent.click(backBtn);

    // 7. Xác nhận đã quay lại WorkspaceListView và currentWorkspaceRole đã được reset
    await waitFor(() => {
      expect(screen.getByText('Workspace Alpha (Producer)')).toBeInTheDocument();
      expect(screen.getByText('Workspace Beta (Artist)')).toBeInTheDocument();
      // Các menu của Producer đã biến mất hoàn toàn
      expect(screen.queryByText('Production Pipeline')).not.toBeInTheDocument();
      expect(screen.queryByText('Release Calendar')).not.toBeInTheDocument();
    });

    // 8. User chọn vào Workspace Beta (Artist)
    fireEvent.click(screen.getByText('Workspace Beta (Artist)'));

    // 9. Xác nhận giao diện Workspace B hiển thị chuẩn vai trò ARTIST
    await waitFor(() => {
      // Role badge hiển thị ARTIST
      expect(screen.getAllByText('ARTIST').length).toBeGreaterThanOrEqual(1);
      // Menu dành riêng cho Artist xuất hiện
      expect(screen.getByText('My Task Queue')).toBeInTheDocument();
      expect(screen.getByText('Layout & Thumbnail')).toBeInTheDocument();
      expect(screen.getByText('Upload Artwork')).toBeInTheDocument();
      // Menu và vai trò dành riêng cho Producer TUYỆT ĐỐI KHÔNG xuất hiện
      expect(screen.queryByText('PRODUCER')).not.toBeInTheDocument();
      expect(screen.queryByText('Production Pipeline')).not.toBeInTheDocument();
      expect(screen.queryByText('Release Calendar')).not.toBeInTheDocument();
      expect(screen.queryByText('Provenance / Restore')).not.toBeInTheDocument();
      expect(screen.queryByText('B5 Pre-Press Specs')).not.toBeInTheDocument();
    });
  });
});


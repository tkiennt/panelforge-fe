import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminAuditLogView } from './AdminAuditLogView';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getAuditLogs: vi.fn(),
    exportAuditLogs: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));

describe('AdminAuditLogView Component', () => {
  const mockLogs = [
    {
      id: 'log-1',
      action: 'LOGIN',
      entityName: 'Session',
      entityId: 'sess-123',
      userId: 'user-1',
      userEmail: 'artist@studio.com',
      workspaceName: 'Manga Studio',
      ipAddress: '192.168.1.1',
      details: 'Đăng nhập (Chrome / Windows).',
      timestampUtc: '2026-11-03T10:00:00Z',
    },
    {
      id: 'log-2',
      action: 'SESSIONS_REVOKED',
      entityName: 'Session',
      entityId: 'sess-456',
      userId: 'user-2',
      userEmail: 'producer@studio.com',
      workspaceName: 'Manga Studio',
      ipAddress: '192.168.1.2',
      details: 'Thu hồi 2 phiên đăng nhập: đổi mật khẩu.',
      timestampUtc: '2026-11-03T10:05:00Z',
    },
    {
      id: 'log-3',
      action: 'CREATE_REFRESHTOKEN',
      entityName: 'RefreshToken',
      entityId: 'rt-789',
      userId: null,
      userEmail: null,
      workspaceName: null,
      details: 'Cấp mã phiên hệ thống.',
      timestampUtc: '2026-11-03T09:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getAuditLogs).mockResolvedValue({
      items: mockLogs,
      totalCount: 3,
      page: 1,
      pageSize: 25,
    });
  });

  it('nạp nhật ký từ adminService và hiển thị nhãn tiếng Việt cho các action mới & legacy', async () => {
    render(<AdminAuditLogView />);

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalled();
      // Nhãn tiếng Việt
      expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
      expect(screen.getByText('Thu hồi phiên hàng loạt')).toBeInTheDocument();
      expect(screen.getByText('Cấp mã phiên (cũ)')).toBeInTheDocument();

      // Entity nhãn tiếng Việt
      expect(screen.getAllByText('Phiên đăng nhập').length).toBeGreaterThan(0);
      expect(screen.getByText('Mã phiên (cũ)')).toBeInTheDocument();
    });
  });

  it('hỗ trợ lọc theo đối tượng Phiên đăng nhập (Session)', async () => {
    render(<AdminAuditLogView />);

    await waitFor(() => {
      expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    });

    const entitySelect = screen.getByLabelText(/^Đối tượng$/i);
    fireEvent.change(entitySelect, { target: { value: 'Session' } });

    const submitBtn = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ entityName: 'Session' }),
      );
    });
  });

  it('hỗ trợ checkbox Ẩn hoạt động hệ thống', async () => {
    render(<AdminAuditLogView />);

    await waitFor(() => {
      expect(screen.getByText('Cấp mã phiên (cũ)')).toBeInTheDocument();
    });

    const hideSystemCheckbox = screen.getByLabelText(/Ẩn hoạt động hệ thống/i);
    fireEvent.click(hideSystemCheckbox);

    // Bản ghi hệ thống (CREATE_REFRESHTOKEN không có userId/userEmail) bị ẩn
    expect(screen.queryByText('Cấp mã phiên (cũ)')).not.toBeInTheDocument();
    // Bản ghi có user vẫn hiển thị
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Thu hồi phiên hàng loạt')).toBeInTheDocument();
  });

  it('mở modal chi tiết khi bấm Xem', async () => {
    render(<AdminAuditLogView />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Xem' }).length).toBe(3);
    });

    const viewButtons = screen.getAllByRole('button', { name: 'Xem' });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết bản ghi')).toBeInTheDocument();
      expect(screen.getAllByText(/Đăng nhập \(LOGIN\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Phiên đăng nhập (Session)').length).toBeGreaterThan(1);
    });
  });
});

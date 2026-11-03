import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogModal } from './AuditLogModal';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getWorkspaceAuditLogs: vi.fn(),
  },
}));

describe('AuditLogModal Component', () => {
  const mockLogs = [
    {
      id: 'log-1',
      action: 'CREATE_SERIES',
      entityName: 'Series',
      entityId: 'ser-12345678',
      userEmail: 'producer@studio.com',
      details: 'Khởi tạo bộ truyện mới Cyberpunk Red',
      timestampUtc: '2026-10-19T10:00:00Z',
    },
    {
      id: 'log-2',
      action: 'DELETE_STAGE',
      entityName: 'PipelineStage',
      entityId: 'stage-87654321',
      userEmail: 'admin@studio.com',
      details: 'Xóa công đoạn nháp',
      timestampUtc: '2026-10-19T11:00:00Z',
    },
    {
      id: 'log-3',
      action: 'LOGIN',
      entityName: 'Session',
      entityId: 'sess-11112222',
      userEmail: 'artist@studio.com',
      details: 'Đăng nhập (Chrome / Windows).',
      timestampUtc: '2026-11-03T08:00:00Z',
    },
    {
      id: 'log-4',
      action: 'SESSIONS_REVOKED',
      entityName: 'Session',
      entityId: 'sess-33334444',
      userEmail: 'admin@studio.com',
      details: 'Thu hồi 3 phiên đăng nhập: đổi mật khẩu.',
      timestampUtc: '2026-11-03T09:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspaceService.getWorkspaceAuditLogs).mockResolvedValue({
      items: mockLogs,
      totalCount: 4,
      page: 1,
      pageSize: 50,
    });
  });

  it('gọi API workspaceService.getWorkspaceAuditLogs khi mở modal với workspaceId và hiển thị nhãn tiếng Việt', async () => {
    render(
      <AuditLogModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId='ws-1'
        workspaceName='Test Studio'
        onShowToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(workspaceService.getWorkspaceAuditLogs).toHaveBeenCalledWith('ws-1', {
        page: 1,
        pageSize: 50,
      });
      // Nhãn tiếng Việt cho action và entity
      expect(screen.getByText('Tạo Bộ truyện')).toBeInTheDocument();
      expect(screen.getByText('Xóa Công đoạn sản xuất')).toBeInTheDocument();
      expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
      expect(screen.getByText('Thu hồi phiên hàng loạt')).toBeInTheDocument();

      // Title kỹ thuật giữ lại để tra cứu
      expect(screen.getByTitle('CREATE_SERIES')).toBeInTheDocument();
      expect(screen.getByTitle('LOGIN')).toBeInTheDocument();

      expect(screen.getByText(/producer@studio.com/i)).toBeInTheDocument();
      expect(screen.getByText(/Khởi tạo bộ truyện mới Cyberpunk Red/i)).toBeInTheDocument();
    });
  });

  it('lọc danh sách audit logs theo từ khóa tìm kiếm', async () => {
    render(
      <AuditLogModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId='ws-1'
        workspaceName='Test Studio'
        onShowToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Tạo Bộ truyện')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo người thực hiện/i);
    fireEvent.change(searchInput, { target: { value: 'Cyberpunk' } });

    expect(screen.getByText('Tạo Bộ truyện')).toBeInTheDocument();
    expect(screen.queryByText('Xóa Công đoạn sản xuất')).not.toBeInTheDocument();
  });

  it('lọc nhóm bảo mật (Session & User)', async () => {
    render(
      <AuditLogModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId='ws-1'
        workspaceName='Test Studio'
        onShowToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'SECURITY' } });

    // Chỉ còn các sự kiện bảo mật / Session
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Thu hồi phiên hàng loạt')).toBeInTheDocument();
    expect(screen.queryByText('Tạo Bộ truyện')).not.toBeInTheDocument();
    expect(screen.queryByText('Xóa Công đoạn sản xuất')).not.toBeInTheDocument();
  });
});

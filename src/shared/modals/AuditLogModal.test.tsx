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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspaceService.getWorkspaceAuditLogs).mockResolvedValue({
      items: mockLogs,
      totalCount: 2,
      page: 1,
      pageSize: 50,
    });
  });

  it('gọi API workspaceService.getWorkspaceAuditLogs khi mở modal với workspaceId', async () => {
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
      expect(screen.getByText('CREATE_SERIES')).toBeInTheDocument();
      expect(screen.getByText('DELETE_STAGE')).toBeInTheDocument();
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
      expect(screen.getByText('CREATE_SERIES')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo người thực hiện/i);
    fireEvent.change(searchInput, { target: { value: 'Cyberpunk' } });

    expect(screen.getByText('CREATE_SERIES')).toBeInTheDocument();
    expect(screen.queryByText('DELETE_STAGE')).not.toBeInTheDocument();
  });
});

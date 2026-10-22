import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriesMembersModal } from './SeriesMembersModal';
import { seriesService } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesMembers: vi.fn(),
    addSeriesMember: vi.fn(),
    updateSeriesMember: vi.fn(),
    removeSeriesMember: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/shared/context/ConfirmContext', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('@/shared/context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

describe('SeriesMembersModal - Phân quyền và gán nhân sự 2 cấp', () => {
  const mockSeriesMembers = [
    {
      id: 'sm-1',
      seriesId: 'series-123',
      userId: 'user-writer',
      fullName: 'Aka Akasaka',
      email: 'aka@studio.com',
      avatarUrl: null,
      seriesRole: 'Writer',
      joinedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockWorkspaceMembers = [
    {
      userId: 'user-writer',
      fullName: 'Aka Akasaka',
      email: 'aka@studio.com',
      role: 'Member',
      isOwner: false,
      status: 'Active' as const,
      joinedAt: '2026-09-01T00:00:00Z',
    },
    {
      userId: 'user-artist',
      fullName: 'Tatsuki Fujimoto',
      email: 'tatsuki@studio.com',
      role: 'Member',
      isOwner: false,
      status: 'Active' as const,
      joinedAt: '2026-09-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(seriesService.getSeriesMembers).mockResolvedValue([...mockSeriesMembers]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([...mockWorkspaceMembers]);
    vi.mocked(seriesService.addSeriesMember).mockResolvedValue({
      id: 'sm-2',
      seriesId: 'series-123',
      userId: 'user-artist',
      fullName: 'Tatsuki Fujimoto',
      email: 'tatsuki@studio.com',
      avatarUrl: null,
      seriesRole: 'Artist',
      joinedAt: '2026-10-21T00:00:00Z',
    });
    vi.mocked(seriesService.removeSeriesMember).mockResolvedValue();
  });

  it('render danh sách thành viên hiện có của bộ truyện', async () => {
    render(
      <SeriesMembersModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-123'
        seriesTitle='Chainsaw Man'
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Aka Akasaka')).toBeInTheDocument();
      expect(screen.getByText('aka@studio.com')).toBeInTheDocument();
      expect(screen.getAllByText('Writer (Biên kịch)').length).toBeGreaterThan(0);
    });
  });

  it('chỉ hiển thị thành viên workspace chưa có trong series để thêm', async () => {
    render(
      <SeriesMembersModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-123'
        seriesTitle='Chainsaw Man'
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/1 người sẵn sàng/i)).toBeInTheDocument();
    });

    // Check Tatsuki Fujimoto hiển thị trực quan trong danh sách sẵn sàng
    expect(screen.getByText('Tatsuki Fujimoto')).toBeInTheDocument();
  });

  it('gọi seriesService.addSeriesMember khi bấm nút Thêm vào truyện của ứng viên', async () => {
    render(
      <SeriesMembersModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-123'
        seriesTitle='Chainsaw Man'
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Aka Akasaka')).toBeInTheDocument();
      expect(screen.getByText('Tatsuki Fujimoto')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Thêm vào truyện/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(seriesService.addSeriesMember).toHaveBeenCalledWith('ws-1', 'series-123', {
        userId: 'user-artist',
        seriesRole: 'Artist',
      });
    });
  });

  it('gọi seriesService.removeSeriesMember khi bấm nút xóa thành viên', async () => {
    render(
      <SeriesMembersModal
        isOpen={true}
        workspaceId='ws-1'
        seriesId='series-123'
        seriesTitle='Chainsaw Man'
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Aka Akasaka')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Xóa khỏi bộ truyện');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(seriesService.removeSeriesMember).toHaveBeenCalledWith(
        'ws-1',
        'series-123',
        'user-writer',
      );
    });
  });
});

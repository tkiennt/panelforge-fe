import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioOverviewView } from './StudioOverviewView';
import { workspaceService } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';

const mockWorkspace = {
  id: 'ws-test',
  name: 'Panelforge Manga Studio',
  ownerId: 'u-1',
  ownerName: 'Studio Lead',
  ownerEmail: 'lead@panelforge.com',
  storageQuotaBytes: 10000000000,
  usedStorageBytes: 2500000000,
  createdAt: '2026-01-01T00:00:00Z',
  isOwner: true,
  currentUserRole: 'PRODUCER',
  memberCount: 4,
  pendingTasks: 3,
};

const mockSeriesList = [
  {
    id: 'series-1',
    title: 'Hành Trình Bất Tận',
    synopsis: 'Câu chuyện phiêu lưu kỳ ảo của nhóm thiếu niên.',
    storyArc: 'Arc 1: Khởi đầu',
    readingDirection: 1, // RTL
    genre: 'Action',
    format: 'Manga',
    chaptersCount: 12,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'series-2',
    title: 'Thành Phố Hoàng Hôn',
    synopsis: 'Trinh thám đô thị với các vụ án ly kỳ.',
    storyArc: 'Arc 2: Bóng đêm',
    readingDirection: 2, // Vertical
    genre: 'Mystery',
    format: 'Webtoon',
    chaptersCount: 5,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

const mockUsage = {
  workspaceId: 'ws-test',
  storage: {
    used: 2500000000,
    quota: 10000000000,
    percentUsed: 25,
    isUnlimited: false,
  },
  aiTokens: {
    used: 120000,
    quota: -1,
    percentUsed: 0,
    isUnlimited: true,
  },
  aiEnabled: true,
  images: {
    used: 15,
    quota: 100,
    percentUsed: 15,
    isUnlimited: false,
  },
  activeSessions: {
    used: 2,
    quota: 5,
    percentUsed: 40,
    isUnlimited: false,
  },
};

const renderWithRouter = (workspaceId = 'ws-test') => {
  return render(
    <MemoryRouter initialEntries={[`/workspaces/${workspaceId}/series`]}>
      <Routes>
        <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('StudioOverviewView Library UX/UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem('activeWorkspace', JSON.stringify(mockWorkspace));

    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([mockWorkspace as any]);
    vi.spyOn(workspaceService, 'getMembers').mockResolvedValue([]);
    vi.spyOn(workspaceService, 'getWorkspaceUsage').mockResolvedValue(mockUsage as any);
    vi.spyOn(seriesService, 'getSeriesList').mockResolvedValue(mockSeriesList as any);
    vi.spyOn(pipelineService, 'getActivePipelineTemplates').mockResolvedValue([]);
  });

  it('renders Studio Library with header, collapsible resource bar, and series cards', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Thư viện Bộ truyện')).toBeInTheDocument();
      expect(screen.getByText('Panelforge Manga Studio')).toBeInTheDocument();
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
    });

    // Check primary actions
    const openButtons = screen.getAllByRole('button', { name: /Mở bộ truyện/i });
    expect(openButtons.length).toBe(2);

    // Check chapters button
    expect(screen.getByText('Chương (12)')).toBeInTheDocument();
    expect(screen.getByText('Chương (5)')).toBeInTheDocument();

    // Check reading direction labels
    expect(screen.getByText('Đọc phải → trái')).toBeInTheDocument();
    expect(screen.getByText('Cuộn dọc')).toBeInTheDocument();

    // Check CTA Tạo bộ truyện
    expect(screen.getAllByRole('button', { name: /Tạo bộ truyện/i }).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('filters series by title search keyword', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm bộ truyện theo tên, tóm tắt...');
    fireEvent.change(searchInput, { target: { value: 'Hoàng Hôn' } });

    await waitFor(() => {
      expect(screen.queryByText('Hành Trình Bất Tận')).not.toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Clear filter
    const clearBtn = screen.getByRole('button', { name: /Xóa bộ lọc/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
    });
  });

  it('filters series by genre and reading direction', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    });

    const genreSelect = screen.getByLabelText('Lọc theo thể loại');
    fireEvent.change(genreSelect, { target: { value: 'Action' } });

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.queryByText('Thành Phố Hoàng Hôn')).not.toBeInTheDocument();
    });

    // Change direction to VERTICAL while genre is Action (should be empty)
    const dirSelect = screen.getByLabelText('Lọc theo định dạng đọc');
    fireEvent.change(dirSelect, { target: { value: 'VERTICAL' } });

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy bộ truyện phù hợp')).toBeInTheDocument();
    });
  });

  it('toggles collapsible Studio resource governance metrics', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText(/Tài nguyên Studio/i)).toBeInTheDocument();
      expect(screen.getByText('Không giới hạn')).toBeInTheDocument();
    });

    // Toggle expand
    const toggleBtn = screen.getByRole('button', { name: /Chi tiết tài nguyên/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Dung Lượng Lưu Trữ')).toBeInTheDocument();
      expect(screen.getByText('Hạn Mức AI Tokens')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thu gọn/i })).toBeInTheDocument();
    });
  });

  it('displays empty state when studio has no series', async () => {
    vi.spyOn(seriesService, 'getSeriesList').mockResolvedValue([]);
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Chưa có bộ truyện nào trong Studio này')).toBeInTheDocument();
      expect(screen.getByText('Tạo bộ truyện ngay')).toBeInTheDocument();
    });
  });

  it('displays error banner with retry button on network failure', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockRejectedValueOnce(
      new Error('Mạng bị gián đoạn'),
    );
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByText('Mạng bị gián đoạn').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });
  });
});

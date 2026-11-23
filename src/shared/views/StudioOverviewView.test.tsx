import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioOverviewView } from './StudioOverviewView';
import { workspaceService } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import axiosClient from '@/api/axiosClient';

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
    vi.spyOn(workspaceService, 'getReaderStats').mockResolvedValue({
      totalViews: 1280,
      totalUniqueReaders: 450,
      series: [],
    });
    vi.spyOn(seriesService, 'getSeriesList').mockResolvedValue(mockSeriesList as any);
    vi.spyOn(pipelineService, 'getActivePipelineTemplates').mockResolvedValue([]);
  });

  it('renders Studio Library with header, metrics strip, and series cards', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Danh sách Bộ truyện')).toBeInTheDocument();
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
    });

    // Check primary actions (cover + CTA open buttons for the 2 series)
    expect(screen.getAllByRole('article')).toHaveLength(2);
    const openButtons = screen.getAllByRole('button', { name: /^Mở bộ truyện: /i });
    expect(openButtons.length).toBe(4);

    // Thẻ tối giản: bìa là nút mở bộ truyện
    expect(openButtons[0]).toHaveAccessibleName(/Mở bộ truyện: /);
    expect(screen.queryByRole('button', { name: /^Chương \(/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Đội ngũ$/ })).not.toBeInTheDocument();

    // Check reading direction labels
    expect(screen.getAllByText(/Đọc phải → trái/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cuộn dọc/).length).toBeGreaterThan(0);

    // Check studio metrics strip
    expect(screen.getByLabelText('Chỉ số vận hành Studio')).toBeInTheDocument();
    expect(screen.getByText('Dung lượng lưu trữ')).toBeInTheDocument();
  });

  it('filters series by title search keyword', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm tên bộ truyện...');
    fireEvent.change(searchInput, { target: { value: 'Hoàng Hôn' } });

    await waitFor(() => {
      expect(screen.queryByText('Hành Trình Bất Tận')).not.toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
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

    const genreSelect = screen.getByLabelText('Tất cả thể loại');
    fireEvent.change(genreSelect, { target: { value: 'Action' } });

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.queryByText('Thành Phố Hoàng Hôn')).not.toBeInTheDocument();
    });

    // Change direction to VERTICAL while genre is Action (should be empty)
    const dirSelect = screen.getByLabelText('Tất cả định dạng đọc');
    fireEvent.change(dirSelect, { target: { value: 'VERTICAL' } });

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy bộ truyện phù hợp')).toBeInTheDocument();
    });
  });

  it('renders Studio resource governance metrics strip with storage usage', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Dung lượng lưu trữ')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
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

  it('does not call getWorkspaceUsage when current role in workspace is not Producer', async () => {
    const artistWorkspace = {
      ...mockWorkspace,
      isOwner: false,
      currentUserRole: 'Artist',
    };
    localStorage.setItem('activeWorkspace', JSON.stringify(artistWorkspace));
    localStorage.setItem('workspaceRole', 'ARTIST');
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([artistWorkspace as any]);
    const usageSpy = vi.spyOn(workspaceService, 'getWorkspaceUsage');

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    });

    expect(usageSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tài nguyên Studio/i)).not.toBeInTheDocument();
  });

  it('calls getWorkspaceUsage only once for Producer even under StrictMode and when activeWorkspace updates', async () => {
    localStorage.removeItem('activeWorkspace');
    const usageSpy = vi.spyOn(workspaceService, 'getWorkspaceUsage');

    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/workspaces/ws-test/series']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Dung lượng lưu trữ')).toBeInTheDocument();
    });

    expect(usageSpy).toHaveBeenCalledTimes(1);
    expect(usageSpy).toHaveBeenCalledWith('ws-test');
  });

  it('shows exact 409 Conflict message inline when changing role of member with unfinished work (TASK-345)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'u-1', email: 'lead@panelforge.com', canCreateStudio: true }),
    );
    const conflictMsg =
      'Thành viên còn 3 việc chưa xong theo vai trò Writer. Hãy giao lại hoặc hoàn tất các việc đó trước khi đổi vai trò.';
    vi.spyOn(workspaceService, 'getMembers').mockResolvedValue([
      {
        userId: 'u-2',
        fullName: 'Minh Writer',
        email: 'minh@panelforge.com',
        role: 'Writer',
        isOwner: false,
        joinedAt: '2026-01-02T00:00:00Z',
        isEmailConfirmed: true,
        status: 'Active',
      },
    ]);
    vi.spyOn(axiosClient, 'put').mockRejectedValueOnce({
      response: { status: 409, data: { message: conflictMsg } },
    });

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=members']}>
        <Routes>
          <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
        </Routes>
      </MemoryRouter>,
    );

    const adjustBtn = await screen.findByRole('button', { name: 'Điều chỉnh' });
    fireEvent.click(adjustBtn);

    const artistOption = screen.getByLabelText('ARTIST');
    fireEvent.click(artistOption);
    fireEvent.click(screen.getByRole('button', { name: 'Save Policies' }));

    const alert = await screen.findByTestId('edit-member-role-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent(conflictMsg);

    // Changing role clears the previous conflict alert; happy path closes modal
    vi.spyOn(axiosClient, 'put').mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByLabelText('EDITOR'));
    expect(screen.queryByTestId('edit-member-role-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Policies' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Save Policies' })).not.toBeInTheDocument();
    });
  });

  it('displays Pending badge for re-invited member even when isEmailConfirmed is true (TASK-345)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'u-1', email: 'lead@panelforge.com', canCreateStudio: true }),
    );
    vi.spyOn(workspaceService, 'getMembers').mockResolvedValue([
      {
        userId: 'u-3',
        fullName: 'Reinvited Artist',
        email: 'reinvited@panelforge.com',
        role: 'Artist',
        isOwner: false,
        joinedAt: '2026-01-03T00:00:00Z',
        isEmailConfirmed: true,
        status: 'Pending',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=members']}>
        <Routes>
          <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Reinvited Artist')).toBeInTheDocument();
      expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument();
    });
  });
});

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
    readingDirection: 0, // RTL (enum BE: 0 RightToLeft)
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
      expect(screen.getByRole('heading', { name: 'Bộ truyện' })).toBeInTheDocument();
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByText('Thành Phố Hoàng Hôn')).toBeInTheDocument();
    });

    // Cover-first card: the cover is the single open control per series
    expect(screen.getAllByRole('article')).toHaveLength(2);
    const openButtons = screen.getAllByRole('button', { name: /^Mở bộ truyện: /i });
    expect(openButtons.length).toBe(2);

    // Thẻ tối giản: bìa là nút mở bộ truyện
    expect(openButtons[0]).toHaveAccessibleName(/Mở bộ truyện: /);
    expect(screen.queryByRole('button', { name: /^Chương \(/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Đội ngũ$/ })).not.toBeInTheDocument();

    // Check reading direction labels
    expect(screen.getAllByText(/Đọc phải → trái/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cuộn dọc/).length).toBeGreaterThan(0);

    // Header meta line replaces the old metrics strip (series, chapters, members, storage)
    expect(screen.getByText(/2 bộ · 17 chương/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Chỉ số vận hành Studio')).not.toBeInTheDocument();

    // Check PageHeader primary CTA + clean unified SeriesCardItem (TASK-369)
    const createBtn = screen.getByTestId('studio-hub-create-series');
    expect(createBtn).toHaveTextContent('Tạo bộ truyện');
    // Không còn ô "Tạo bộ truyện" dashed khi đã có bộ truyện
    expect(screen.queryByTestId('series-create-tile')).not.toBeInTheDocument();
    // Bỏ thông tin lặp & avatar PD/ED giả
    expect(screen.queryByText('PD')).not.toBeInTheDocument();
    expect(screen.queryByText('ED')).not.toBeInTheDocument();

    // Menu 3 chấm trên thẻ bộ truyện dùng Popover API cho Producer
    const optionsBtn = screen.getByTestId('series-options-btn-series-1');
    const optionsMenu = screen.getByTestId('series-options-menu-series-1');
    expect(optionsMenu).toHaveAttribute('popover', 'auto');
    fireEvent.click(optionsBtn);
    expect(optionsMenu).toHaveTextContent('Cấu hình Pipeline');
    expect(optionsMenu).toHaveTextContent('Đội ngũ Series');
    expect(optionsMenu).toHaveTextContent('Chỉnh sửa thông tin');
    expect(optionsMenu).toHaveTextContent('Xóa bộ truyện');

    // Bấm nút Tạo bộ truyện trong PageHeader mở modal tạo series
    fireEvent.click(createBtn);
    expect(await screen.findByText('Khởi tạo Dự án Series mới')).toBeInTheDocument();
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

    // Clear the search via the search box's own clear button
    const clearBtn = screen.getByRole('button', { name: 'Xoá tìm kiếm' });
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

    const genreSelect = screen.getByLabelText('Thể loại');
    fireEvent.change(genreSelect, { target: { value: 'Action' } });

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.queryByText('Thành Phố Hoàng Hôn')).not.toBeInTheDocument();
    });

    // Change direction to VERTICAL while genre is Action (should be empty)
    const dirSelect = screen.getByLabelText('Định dạng đọc');
    fireEvent.change(dirSelect, { target: { value: 'VERTICAL' } });

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy bộ truyện phù hợp')).toBeInTheDocument();
    });
  });

  it('shows storage and AI usage in the resource strip (existing usage DTO fields only)', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
      expect(screen.getByTestId('series-resource-storage')).toHaveTextContent('2.33 GB / 9.31 GB');
    });
    const strip = screen.getByTestId('series-resource-strip');
    expect(strip).toHaveTextContent('Token AI');
    expect(strip).toHaveTextContent('Không giới hạn');
    expect(screen.queryByTestId('series-resource-ai-images')).not.toBeInTheDocument();
  });

  it('shows <1% low storage usage, omits AI images meter, and navigates to members tab via header link', async () => {
    // Mọi lần gọi đều trả số liệu này: view có thể nạp usage hơn một lần, `Once` làm lần sau rơi về mockUsage.
    vi.spyOn(workspaceService, 'getWorkspaceUsage').mockResolvedValue({
      ...mockUsage,
      storage: { used: 22334669, quota: 10737418240, percentUsed: 0.21, isUnlimited: false },
      aiTokens: { used: 91118, quota: 1000000, percentUsed: 9.1, isUnlimited: false },
      images: { used: 3, quota: -1, percentUsed: null, isUnlimited: true },
    } as any);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('series-resource-storage')).toHaveTextContent('<1%');
    });
    expect(screen.getByTestId('series-resource-ai-tokens')).toHaveTextContent('9.1%');
    expect(screen.queryByTestId('series-resource-ai-images')).not.toBeInTheDocument();

    const membersLink = screen.getByTestId('studio-hub-members-link');
    fireEvent.click(membersLink);
    expect(await screen.findByText(/Danh sách Nhân sự Studio/i)).toBeInTheDocument();
  });

  it('switches between list and grid views and remembers the choice', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Hành Trình Bất Tận')).toBeInTheDocument();
    });
    // Mặc định là danh sách (thẻ ngang)
    expect(screen.getByTestId('series-view-list')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')[0]).toHaveAttribute('data-variant', 'list');

    fireEvent.click(screen.getByTestId('series-view-grid'));

    expect(screen.getByTestId('series-view-grid')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')[0]).toHaveAttribute('data-variant', 'grid');
    expect(localStorage.getItem('pf.studioSeriesView')).toBe('grid');
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
      expect(screen.getByTestId('series-resource-storage')).toHaveTextContent('2.33 GB / 9.31 GB');
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

    const adjustBtn = await screen.findByRole('button', { name: 'Sửa quyền' });
    fireEvent.click(adjustBtn);

    const artistOption = screen.getByLabelText(/Họa sĩ chính/);
    fireEvent.click(artistOption);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu vai trò' }));

    const alert = await screen.findByTestId('edit-member-role-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent(conflictMsg);

    // Changing role clears the previous conflict alert; happy path closes modal
    vi.spyOn(axiosClient, 'put').mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByLabelText(/Biên tập viên/));
    expect(screen.queryByTestId('edit-member-role-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu vai trò' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Lưu vai trò' })).not.toBeInTheDocument();
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

  describe('Assign Automation Tab (TASK-359)', () => {
    const defaultAutomationSettings = {
      workspaceId: 'ws-test',
      autoNextStage: false,
      assignMode: 'KeepPageOwner' as const,
      autoRouteReview: false,
      leadHours: 24,
      escalationHours: null,
      rowVersion: null,
    };

    beforeEach(() => {
      vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/automation-activity')) {
          return {
            data: {
              last7Days: { autoAssigned: 0, skipped: 0, escalated: 0 },
              items: [],
            },
          } as any;
        }
        return { data: [] } as any;
      });
    });

    it('loads default automation settings with active R1/R2/R3 hints and no config-only notes (TASK-359 / TASK-361 / TASK-362)', async () => {
      const getSpy = vi
        .spyOn(workspaceService, 'getAutomationSettings')
        .mockResolvedValue(defaultAutomationSettings);

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByTestId('studio-automation-tab')).toBeInTheDocument();
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith('ws-test');
      });

      expect(screen.queryByText(/chỉ lưu cấu hình/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('automation-step5-note')).not.toBeInTheDocument();
      expect(screen.getByText(/Ai làm trang ở công đoạn trước thì làm tiếp/i)).toBeInTheDocument();
      expect(screen.getByText(/Giao người đúng vai trò đang ít việc nhất/i)).toBeInTheDocument();

      const autoNextSwitch = screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' });
      const autoRouteSwitch = screen.getByRole('switch', { name: 'Gợi ý người duyệt' });
      const escalationSwitch = screen.getByRole('switch', {
        name: 'Báo Producer khi trễ quá hạn',
      });
      const keepOwnerRadio = screen.getByRole('radio', { name: /Giữ người cũ/i });
      const balanceRadio = screen.getByRole('radio', { name: /Chia theo tải/i });
      const leadInput = screen.getByLabelText('Nhắc trước hạn (giờ)') as HTMLInputElement;
      const escalationInput = screen.getByLabelText(
        'Báo Producer sau khi trễ (giờ)',
      ) as HTMLInputElement;

      expect(autoNextSwitch).not.toBeChecked();
      expect(autoRouteSwitch).not.toBeChecked();
      expect(escalationSwitch).not.toBeChecked();
      expect(keepOwnerRadio).toBeChecked();
      expect(balanceRadio).not.toBeChecked();
      expect(leadInput.value).toBe('24');
      expect(escalationInput.value).toBe('');
      expect(screen.getByTestId('automation-save-btn')).not.toBeDisabled();
    });

    it('saves automation settings for Producer/Owner and forwards updated rowVersion (BR-11)', async () => {
      vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue(
        defaultAutomationSettings,
      );
      const putSpy = vi
        .spyOn(axiosClient, 'put')
        .mockReset()
        .mockResolvedValueOnce({
          data: {
            workspaceId: 'ws-test',
            autoNextStage: true,
            assignMode: 'BalanceOnly',
            autoRouteReview: true,
            leadHours: 12,
            escalationHours: 48,
            rowVersion: 7,
          },
        })
        .mockResolvedValueOnce({
          data: {
            workspaceId: 'ws-test',
            autoNextStage: true,
            assignMode: 'BalanceOnly',
            autoRouteReview: true,
            leadHours: 12,
            escalationHours: null,
            rowVersion: 8,
          },
        });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      await screen.findByLabelText('Nhắc trước hạn (giờ)');

      // Client validation blocks invalid leadHours (1-168)
      fireEvent.change(screen.getByLabelText('Nhắc trước hạn (giờ)'), { target: { value: '0' } });
      fireEvent.click(screen.getByTestId('automation-save-btn'));
      expect(await screen.findByTestId('automation-save-error')).toHaveTextContent('1 đến 168');
      expect(putSpy).not.toHaveBeenCalled();

      // Valid save #1 (rowVersion: null -> 7)
      fireEvent.click(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' }));
      fireEvent.click(screen.getByRole('radio', { name: /Chia theo tải/i }));
      fireEvent.click(screen.getByRole('switch', { name: 'Gợi ý người duyệt' }));
      fireEvent.change(screen.getByLabelText('Nhắc trước hạn (giờ)'), { target: { value: '12' } });
      fireEvent.change(screen.getByLabelText('Báo Producer sau khi trễ (giờ)'), {
        target: { value: '48' },
      });
      fireEvent.click(screen.getByTestId('automation-save-btn'));

      await waitFor(() => {
        expect(putSpy).toHaveBeenCalledWith('/workspaces/ws-test/automation-settings', {
          autoNextStage: true,
          assignMode: 'BalanceOnly',
          autoRouteReview: true,
          leadHours: 12,
          escalationHours: 48,
          rowVersion: null,
        });
      });

      // Valid save #2 clears escalationHours -> null and sends rowVersion: 7
      fireEvent.change(screen.getByLabelText('Báo Producer sau khi trễ (giờ)'), {
        target: { value: '' },
      });
      fireEvent.click(screen.getByTestId('automation-save-btn'));

      await waitFor(() => {
        expect(putSpy).toHaveBeenLastCalledWith('/workspaces/ws-test/automation-settings', {
          autoNextStage: true,
          assignMode: 'BalanceOnly',
          autoRouteReview: true,
          leadHours: 12,
          escalationHours: null,
          rowVersion: 7,
        });
      });
    });

    it('handles 409 Conflict on stale rowVersion with reload action (BR-11)', async () => {
      const getSpy = vi
        .spyOn(workspaceService, 'getAutomationSettings')
        .mockResolvedValueOnce(defaultAutomationSettings)
        .mockResolvedValueOnce({
          ...defaultAutomationSettings,
          autoNextStage: true,
          leadHours: 36,
          rowVersion: 5,
        });

      vi.spyOn(axiosClient, 'put')
        .mockReset()
        .mockRejectedValueOnce({
          response: {
            status: 409,
            data: {
              error: 'Cấu hình Automation vừa được người khác thay đổi. Tải lại rồi thử lại.',
              code: 'Conflict',
            },
          },
        });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      await screen.findByLabelText('Nhắc trước hạn (giờ)');
      fireEvent.click(screen.getByTestId('automation-save-btn'));

      const conflictAlert = await screen.findByTestId('automation-save-error');
      expect(conflictAlert).toHaveAttribute('role', 'alert');
      expect(conflictAlert).toHaveTextContent(/người khác thay đổi/i);

      const reloadBtn = screen.getByTestId('automation-reload-btn');
      fireEvent.click(reloadBtn);

      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledTimes(2);
        expect((screen.getByLabelText('Nhắc trước hạn (giờ)') as HTMLInputElement).value).toBe(
          '36',
        );
      });
      expect(screen.queryByTestId('automation-save-error')).not.toBeInTheDocument();
    });

    it('renders read-only disabled controls for Editor and blocks non-Editor/Producer roles (BR-07)', async () => {
      const editorWorkspace = {
        ...mockWorkspace,
        isOwner: false,
        currentUserRole: 'Editor',
      };
      localStorage.setItem('activeWorkspace', JSON.stringify(editorWorkspace));
      localStorage.setItem('workspaceRole', 'EDITOR');
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([editorWorkspace as any]);
      const getSpy = vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue({
        ...defaultAutomationSettings,
        autoNextStage: true,
        escalationHours: 24,
        rowVersion: 2,
      });
      const putSpy = vi.spyOn(workspaceService, 'updateAutomationSettings');

      const { unmount } = render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByTestId('automation-readonly-badge')).toHaveTextContent('Chỉ xem');
      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith('ws-test');
      });

      expect(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: /Giữ người cũ/i })).toBeDisabled();
      expect(screen.getByRole('radio', { name: /Chia theo tải/i })).toBeDisabled();
      expect(screen.getByRole('switch', { name: 'Gợi ý người duyệt' })).toBeDisabled();
      expect(screen.getByRole('switch', { name: 'Báo Producer khi trễ quá hạn' })).toBeDisabled();
      expect(screen.getByLabelText('Nhắc trước hạn (giờ)')).toBeDisabled();
      expect(screen.getByLabelText('Báo Producer sau khi trễ (giờ)')).toBeDisabled();
      expect(screen.getByTestId('automation-save-btn')).toBeDisabled();
      expect(putSpy).not.toHaveBeenCalled();

      unmount();

      // Artist must NOT access automation tab (BR-07)
      getSpy.mockClear();
      const artistWorkspace = {
        ...mockWorkspace,
        isOwner: false,
        currentUserRole: 'Artist',
      };
      localStorage.setItem('activeWorkspace', JSON.stringify(artistWorkspace));
      localStorage.setItem('workspaceRole', 'ARTIST');
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([artistWorkspace as any]);

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Chọn Bộ truyện để làm việc')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('studio-automation-tab')).not.toBeInTheDocument();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('renders How It Works block with saved rule statuses that only update after saving (TASK-364 / BR-11)', async () => {
      vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue(
        defaultAutomationSettings,
      );
      vi.spyOn(axiosClient, 'put')
        .mockReset()
        .mockResolvedValueOnce({
          data: {
            workspaceId: 'ws-test',
            autoNextStage: true,
            assignMode: 'BalanceOnly',
            autoRouteReview: true,
            leadHours: 24,
            escalationHours: 12,
            rowVersion: 3,
          },
        });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      const howItWorks = await screen.findByTestId('automation-how-it-works');
      expect(howItWorks).toHaveTextContent('Cách hoạt động');
      expect(howItWorks).toHaveTextContent(/Duyệt ô/i);
      expect(howItWorks).toHaveTextContent(/giữ người làm trang hoặc cân tải/i);
      expect(howItWorks).toHaveTextContent(/gợi ý 1 Editor/i);
      expect(howItWorks).toHaveTextContent(/quá hạn báo Producer/i);

      // Initially all 3 saved rules are OFF
      expect(screen.getByTestId('automation-rule-status-r1')).toHaveTextContent('Đang tắt');
      expect(screen.getByTestId('automation-rule-status-r2')).toHaveTextContent('Đang tắt');
      expect(screen.getByTestId('automation-rule-status-r3')).toHaveTextContent('Đang tắt');

      // Toggling draft form controls before clicking Save must NOT flip saved status badges
      fireEvent.click(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' }));
      fireEvent.click(screen.getByRole('radio', { name: /Chia theo tải/i }));
      fireEvent.click(screen.getByRole('switch', { name: 'Gợi ý người duyệt' }));
      fireEvent.change(screen.getByLabelText('Báo Producer sau khi trễ (giờ)'), {
        target: { value: '12' },
      });

      expect(screen.getByTestId('automation-rule-status-r1')).toHaveTextContent('Đang tắt');
      expect(screen.getByTestId('automation-rule-status-r2')).toHaveTextContent('Đang tắt');
      expect(screen.getByTestId('automation-rule-status-r3')).toHaveTextContent('Đang tắt');

      // Saving updates saved rule statuses
      fireEvent.click(screen.getByTestId('automation-save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('automation-rule-status-r1')).toHaveTextContent('Đang bật');
        expect(screen.getByTestId('automation-rule-status-r2')).toHaveTextContent('Đang bật');
        expect(screen.getByTestId('automation-rule-status-r3')).toHaveTextContent('Đang bật');
      });
    });

    it('loads Recent Activity (take=20), renders 7-day counts and AutoAssigned/Skipped/Escalated items, and opens Grid V3 on click (TASK-364)', async () => {
      vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue({
        ...defaultAutomationSettings,
        autoNextStage: true,
        rowVersion: 1,
      });
      const axiosGetSpy = vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/automation-activity')) {
          return {
            data: {
              last7Days: { autoAssigned: 4, skipped: 2, escalated: 1 },
              items: [
                {
                  kind: 'AutoAssigned',
                  occurredAt: '2026-11-26T12:00:00Z',
                  seriesId: 'series-1',
                  seriesTitle: 'Hành Trình Bất Tận',
                  chapterId: 'chap-10',
                  chapterNumber: 1,
                  stageName: 'Ink',
                  pageNumbers: [3],
                  assigneeUserId: 'u-artist',
                  assigneeName: 'Artist A',
                  reason: 'Giữ người đã làm trang này',
                },
                {
                  kind: 'Skipped',
                  occurredAt: '2026-11-26T11:00:00Z',
                  seriesId: 'series-1',
                  seriesTitle: 'Hành Trình Bất Tận',
                  chapterId: 'chap-10',
                  chapterNumber: 1,
                  stageName: null,
                  pageNumbers: [],
                  assigneeUserId: null,
                  assigneeName: null,
                  reason: 'Không có Inker.',
                },
                {
                  kind: 'Escalated',
                  occurredAt: '2026-11-26T10:00:00Z',
                  seriesId: 'series-2',
                  seriesTitle: 'Thành Phố Hoàng Hôn',
                  chapterId: 'chap-22',
                  chapterNumber: 5,
                  stageName: null,
                  pageNumbers: [],
                  assigneeUserId: null,
                  assigneeName: null,
                  reason:
                    'Hạn 2026-11-25 10:00 UTC · lô abc. Gia hạn, chia lại hoặc nhắc người làm.',
                },
              ],
            },
          } as any;
        }
        return { data: [] } as any;
      });

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/workspace'
              element={<div data-testid='grid-v3-destination'>Grid V3 Loaded</div>}
            />
          </Routes>
        </MemoryRouter>,
      );

      const activityBlock = await screen.findByTestId('automation-recent-activity');
      await waitFor(() => {
        expect(axiosGetSpy).toHaveBeenCalledWith('/workspaces/ws-test/automation-activity', {
          params: { take: 20 },
        });
      });

      expect(screen.getByTestId('automation-stat-assigned')).toHaveTextContent('4');
      expect(screen.getByTestId('automation-stat-skipped')).toHaveTextContent('2');
      expect(screen.getByTestId('automation-stat-escalated')).toHaveTextContent('1');

      expect(activityBlock).toHaveTextContent(
        /Chương 1.*Ink.*Trang 3.*Artist A.*Giữ người đã làm trang này/,
      );
      expect(activityBlock).toHaveTextContent(/Không có Inker\./);
      expect(activityBlock).toHaveTextContent(/Gia hạn, chia lại hoặc nhắc người làm\./);

      const links = screen.getAllByTestId('automation-activity-item');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute(
        'href',
        '/workspaces/ws-test/series/series-1/workspace?chapterId=chap-10&board=grid-v3',
      );
      expect(links[2]).toHaveAttribute(
        'href',
        '/workspaces/ws-test/series/series-2/workspace?chapterId=chap-22&board=grid-v3',
      );

      // Click stat tile to filter recent activity by kind, then reset to all
      fireEvent.click(screen.getByTestId('automation-stat-skipped'));
      expect(screen.getAllByTestId('automation-activity-item')).toHaveLength(1);
      expect(screen.getByTestId('automation-activity-item')).toHaveTextContent(/Không có Inker\./);
      fireEvent.click(screen.getByTestId('automation-activity-filter-clear'));
      const restoredLinks = screen.getAllByTestId('automation-activity-item');
      expect(restoredLinks).toHaveLength(3);

      fireEvent.click(restoredLinks[0]);
      expect(await screen.findByTestId('grid-v3-destination')).toBeInTheDocument();
    });

    it('renders empty message for Recent Activity, allows Editor read access, and blocks Artist from fetching activity (TASK-364 / BR-07)', async () => {
      const editorWorkspace = {
        ...mockWorkspace,
        isOwner: false,
        currentUserRole: 'Editor',
      };
      localStorage.setItem('activeWorkspace', JSON.stringify(editorWorkspace));
      localStorage.setItem('workspaceRole', 'EDITOR');
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([editorWorkspace as any]);
      vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue(
        defaultAutomationSettings,
      );
      let failActivityOnce = true;
      const axiosGetSpy = vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/automation-activity')) {
          if (failActivityOnce) {
            failActivityOnce = false;
            throw { response: { status: 500, data: { error: 'Lỗi tải hoạt động' } } };
          }
          return {
            data: {
              last7Days: { autoAssigned: 0, skipped: 0, escalated: 0 },
              items: [],
            },
          } as any;
        }
        return { data: [] } as any;
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByText('Lỗi tải hoạt động')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

      expect(await screen.findByText('Chưa có hoạt động tự động nào')).toBeInTheDocument();
      expect(axiosGetSpy).toHaveBeenCalledWith('/workspaces/ws-test/automation-activity', {
        params: { take: 20 },
      });

      unmount();
      axiosGetSpy.mockClear();

      const artistWorkspace = {
        ...mockWorkspace,
        isOwner: false,
        currentUserRole: 'Artist',
      };
      localStorage.setItem('activeWorkspace', JSON.stringify(artistWorkspace));
      localStorage.setItem('workspaceRole', 'ARTIST');
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([artistWorkspace as any]);

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Chọn Bộ truyện để làm việc')).toBeInTheDocument();
      });
      expect(axiosGetSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/automation-activity'),
        expect.anything(),
      );
    });

    it('supports muted inactive mode cards, escalation switch + quick hour chips, recommended preset, and undo dirty changes', async () => {
      vi.spyOn(workspaceService, 'getAutomationSettings').mockResolvedValue(
        defaultAutomationSettings,
      );

      render(
        <MemoryRouter initialEntries={['/workspaces/ws-test/series?tab=automation']}>
          <Routes>
            <Route path='/workspaces/:workspaceId/series' element={<StudioOverviewView />} />
          </Routes>
        </MemoryRouter>,
      );

      await screen.findByTestId('studio-automation-tab');

      // 1) Concrete plain-language examples are shown
      expect(screen.getByText(/Ví dụ: Trang 3 vừa duyệt xong/i)).toBeInTheDocument();

      // 2) When autoNextStage is OFF, mode card does NOT glow orange and shows inactive hint
      const keepOwnerCard = screen.getByTestId('assign-mode-card-KeepPageOwner');
      expect(keepOwnerCard.className).not.toContain('border-orange-500');
      expect(screen.getByText(/Bật tự giao để áp dụng chế độ này/i)).toBeInTheDocument();
      expect(screen.queryByTestId('automation-dirty-indicator')).not.toBeInTheDocument();

      // Turning autoNextStage ON lights up the selected mode card and marks form dirty
      fireEvent.click(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' }));
      expect(keepOwnerCard.className).toContain('border-orange-500');
      expect(screen.getByTestId('automation-dirty-indicator')).toHaveTextContent(
        /Có thay đổi chưa lưu/i,
      );

      // 3) Escalation switch toggles default 24h -> quick chip 48h (≈ 2 ngày) -> OFF ('')
      const escalationSwitch = screen.getByRole('switch', {
        name: 'Báo Producer khi trễ quá hạn',
      });
      const escalationInput = screen.getByLabelText(
        'Báo Producer sau khi trễ (giờ)',
      ) as HTMLInputElement;
      expect(escalationSwitch).not.toBeChecked();

      fireEvent.click(escalationSwitch);
      expect(escalationSwitch).toBeChecked();
      expect(escalationInput.value).toBe('24');

      fireEvent.click(screen.getByTestId('escalation-quick-chip-48'));
      expect(escalationInput.value).toBe('48');
      expect(screen.getByTestId('escalation-duration-preview')).toHaveTextContent(/2 ngày/i);
      expect(screen.getByTestId('automation-deadline-timeline')).toHaveTextContent('-24h');
      expect(screen.getByTestId('automation-deadline-timeline')).toHaveTextContent('+48h');

      fireEvent.click(escalationSwitch);
      expect(escalationSwitch).not.toBeChecked();
      expect(escalationInput.value).toBe('');

      // 4) Undo reverts everything back to savedSettings and clears dirty indicator
      fireEvent.click(screen.getByTestId('automation-reset-btn'));
      expect(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' })).not.toBeChecked();
      expect(screen.queryByTestId('automation-dirty-indicator')).not.toBeInTheDocument();

      // 5) Recommended preset fills optimal Studio configuration in one click
      fireEvent.click(screen.getByTestId('automation-recommended-preset-btn'));
      expect(screen.getByRole('switch', { name: 'Tự giao công đoạn kế tiếp' })).toBeChecked();
      expect(screen.getByRole('switch', { name: 'Gợi ý người duyệt' })).toBeChecked();
      expect(escalationSwitch).toBeChecked();
      expect(escalationInput.value).toBe('24');
      expect(screen.getByTestId('automation-dirty-indicator')).toBeInTheDocument();
    });
  });
});

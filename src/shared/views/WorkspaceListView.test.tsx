import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceListView } from './WorkspaceListView';
import { workspaceService } from '@/services/workspace.service';
import { assignmentService } from '@/services/assignment.service';
import { WorkspaceDto } from '@/types';

const ws = (over: Partial<WorkspaceDto> = {}): WorkspaceDto => ({
  id: 'ws-1',
  name: 'Alpha Studio',
  ownerId: 'u-1',
  ownerName: 'Alice',
  ownerEmail: 'alice@example.com',
  storageQuotaBytes: 1000000000,
  usedStorageBytes: 200000000,
  createdAt: '2026-01-01T00:00:00Z',
  isOwner: true,
  currentUserRole: 'PRODUCER',
  memberCount: 5,
  pendingTasks: 2,
  ...over,
});

const renderView = (props: Partial<React.ComponentProps<typeof WorkspaceListView>> = {}) =>
  render(
    <MemoryRouter>
      <WorkspaceListView onSelectWorkspace={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe('WorkspaceListView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([]);
    vi.spyOn(assignmentService, 'getMyAssignments').mockResolvedValue([]);
  });

  it('renders loading state initially and then displays real workspace cards', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([ws()] as any);
    const onSelectMock = vi.fn();
    renderView({ onSelectWorkspace: onSelectMock });

    expect(
      screen.getByText(/Loading Workspaces|Đang tải danh sách Workspace/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alpha Studio')).toBeInTheDocument();
    });
    expect(screen.getByText(/^(Producer|Nhà sản xuất)$/i)).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'Alpha Studio' })).getByText(
        /2 (tasks waiting|việc đang chờ)/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/5\s+(Members|Thành viên)/i)).toBeInTheDocument();
    // Không còn nhãn "Hoàn tất" gây hiểu nhầm
    expect(screen.queryByText(/Hoàn tất|Completed/i)).not.toBeInTheDocument();

    // Card là một button duy nhất
    fireEvent.click(screen.getByRole('button', { name: /Alpha Studio/ }));
    expect(onSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ws-1', name: 'Alpha Studio', currentUserRole: 'PRODUCER' }),
    );
  });

  it('shows the real total in the heading and a recent-studio row only for an accessible id', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws(),
      ws({ id: 'ws-2', name: 'Beta Studio', pendingTasks: 0 }),
    ] as any);
    const onSelectMock = vi.fn();
    const { unmount } = renderView({ onSelectWorkspace: onSelectMock, recentWorkspaceId: 'ws-2' });

    await waitFor(() => expect(screen.getByTestId('ws-summary')).toHaveTextContent('2'));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục|Continue/i }));
    expect(onSelectMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'ws-2' }));
    unmount();

    renderView({ recentWorkspaceId: 'not-mine' });
    await waitFor(() => expect(screen.getByText('Beta Studio')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Tiếp tục|Continue/i })).not.toBeInTheDocument();
  });

  it('shows an error with retry instead of the empty state when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const spy = vi
      .spyOn(workspaceService, 'getMyWorkspaces')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([ws()] as any);
    renderView();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Chào mừng đến với PanelForge/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại|Retry/i }));
    expect(await screen.findByText('Alpha Studio')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('renders empty state with create CTA when user can create studios', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
    const onCreateMock = vi.fn();
    renderView({
      onCreateWorkspace: onCreateMock,
      currentUser: { name: 'Alex', email: 'p@x.com', role: 'USER', canCreateStudio: true },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Welcome to PanelForge|Chào mừng đến với PanelForge/i),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Create studio|Tạo studio/i }));
    expect(onCreateMock).toHaveBeenCalled();
  });

  it('BR-22: user chưa được cấp canCreateStudio không thấy CTA tạo Studio, chỉ thấy hướng dẫn lời mời', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
    renderView({
      onCreateWorkspace: vi.fn(),
      currentUser: { name: 'Brian', email: 'w@x.com', role: 'USER', canCreateStudio: false },
    });

    await waitFor(() => {
      expect(screen.getByText(/lời mời|invitation/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Create studio|Tạo studio/i }),
    ).not.toBeInTheDocument();
  });

  it('shows change cover button for Producer/Owner and hides it for Artist', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({ id: 'ws-owner', name: 'Owner Studio', currentUserRole: 'PRODUCER', isOwner: true }),
      ws({ id: 'ws-artist', name: 'Artist Studio', currentUserRole: 'ARTIST', isOwner: false }),
    ] as any);

    renderView();
    await waitFor(() => {
      expect(screen.getByText('Owner Studio')).toBeInTheDocument();
      expect(screen.getByText('Artist Studio')).toBeInTheDocument();
    });

    // Owner/Producer has change cover button
    const changeCoverBtns = screen.getAllByRole('button', {
      name: /Đổi ảnh bìa Studio|Change studio cover/i,
    });
    expect(changeCoverBtns.length).toBe(1);
  });

  it('renders member previews and +N badge when more members exist', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({
        id: 'ws-previews',
        name: 'Preview Studio',
        memberCount: 6,
        description: 'Mô tả studio thử nghiệm',
        memberPreviews: [
          {
            userId: 'u-1',
            fullName: 'Alice Wonderland',
            avatarUrl: 'https://example.com/alice.png',
          },
          { userId: 'u-2', fullName: 'Bob Builder', avatarUrl: null },
        ],
      }),
    ] as any);

    renderView();
    await waitFor(() => {
      expect(screen.getByText('Preview Studio')).toBeInTheDocument();
    });

    expect(screen.getByText('Mô tả studio thử nghiệm')).toBeInTheDocument();
    expect(screen.getByTitle('Alice Wonderland')).toBeInTheDocument();
    expect(screen.getByTitle('Bob Builder')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument();
  });

  it('opens WorkspaceCoverPickerDialog, uploads file, calls setWorkspaceCover, and updates card', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({ id: 'ws-cov', name: 'Cover Studio', currentUserRole: 'PRODUCER', isOwner: true }),
    ] as any);
    const setCoverSpy = vi
      .spyOn(workspaceService, 'setWorkspaceCover')
      .mockResolvedValue('/api/workspaces/ws-cov/cover?v=newhash123');

    renderView();
    await waitFor(() => {
      expect(screen.getByText('Cover Studio')).toBeInTheDocument();
    });

    // Click change cover
    const changeCoverBtn = screen.getByRole('button', {
      name: /Đổi ảnh bìa Studio|Change studio cover/i,
    });
    fireEvent.click(changeCoverBtn);

    // Modal dialog is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Select a file
    const file = new File(['dummy-content'], 'cover.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Apply button is enabled, click apply
    const applyBtn = screen.getByRole('button', { name: /Áp dụng|Apply/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(setCoverSpy).toHaveBeenCalledWith('ws-cov', file);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows error in cover dialog and preserves existing cover on failure', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({ id: 'ws-err', name: 'Error Studio', currentUserRole: 'PRODUCER', isOwner: true }),
    ] as any);
    vi.spyOn(workspaceService, 'setWorkspaceCover').mockRejectedValue(
      new Error('R2 upload failed'),
    );

    renderView();
    await waitFor(() => {
      expect(screen.getByText('Error Studio')).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Đổi ảnh bìa Studio|Change studio cover/i }),
    );

    const file = new File(['dummy-content'], 'cover.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Áp dụng|Apply/i }));

    expect(await screen.findByText('R2 upload failed')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders avatar image in header when currentUser has avatarUrl', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
    renderView({
      currentUser: {
        name: 'Alex Producer',
        email: 'producer@panelforge.com',
        role: 'USER',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        canCreateStudio: true,
      },
    });

    await waitFor(() => {
      const avatarImg = document.querySelector('header img');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg).toHaveAttribute(
        'src',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      );
    });
  });

  it('falls back to initials when avatarUrl fails to load in header', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
    renderView({
      currentUser: {
        name: 'Alex Producer',
        email: 'producer@panelforge.com',
        role: 'USER',
        avatarUrl: 'https://invalid-avatar-url.jpg',
        canCreateStudio: true,
      },
    });

    await waitFor(() => {
      const avatarImg = document.querySelector('header img');
      expect(avatarImg).toBeInTheDocument();
      fireEvent.error(avatarImg!);
    });

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(document.querySelector('header img')).not.toBeInTheDocument();
  });

  it('renders Editor role styling, review queue badge and enter button for Editor', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({
        id: 'ws-editor',
        name: 'Mappa Japan Studio',
        currentUserRole: 'EDITOR',
        pendingEditorReviews: 4,
      }),
    ] as any);
    const onSelectMock = vi.fn();
    renderView({ onSelectWorkspace: onSelectMock });

    await waitFor(() => {
      expect(screen.getByText('Mappa Japan Studio')).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole('article', { name: 'Mappa Japan Studio' })).getByText(
        '4 bài chờ duyệt',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Chọn bộ truyện để duyệt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mappa Japan Studio/ }));
    expect(onSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ws-editor', currentUserRole: 'EDITOR' }),
    );
  });

  it('hero header shows real KPI totals and filters owned vs invited studios', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({
        id: 'ws-own',
        name: 'Own Studio',
        isOwner: true,
        pendingTasks: 2,
        pendingEditorReviews: 1,
      }),
      ws({
        id: 'ws-inv',
        name: 'Invited Studio',
        isOwner: false,
        currentUserRole: 'ARTIST',
        pendingTasks: 3,
      }),
    ] as any);
    renderView();

    await waitFor(() => expect(screen.getByText('Invited Studio')).toBeInTheDocument());
    expect(screen.getByTestId('ws-summary').textContent).toMatch(
      /2 studio.*1 studio|2 studios and own 1/,
    );
    expect(screen.getByTestId('ws-chip-pending').textContent).toMatch(/5/);
    expect(screen.getByTestId('ws-chip-reviews').textContent).toMatch(/1/);

    fireEvent.click(screen.getByRole('button', { name: /^(Được mời tham gia|Invited) *[0-9]/ }));
    expect(screen.queryByText('Own Studio')).not.toBeInTheDocument();
    expect(screen.getByText('Invited Studio')).toBeInTheDocument();
  });

  it('hides the filter when every studio is owned', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([ws()] as any);
    renderView();

    await waitFor(() => expect(screen.getByText('Alpha Studio')).toBeInTheDocument());
    expect(
      screen.queryByRole('group', { name: /Lọc studio|Filter studios/ }),
    ).not.toBeInTheDocument();
  });

  it('lists pending invitations and accepting one adds the studio', async () => {
    vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([
      {
        workspaceId: 'ws-new',
        workspaceName: 'Nova Studio',
        ownerName: 'Minh',
        ownerEmail: 'm@x.com',
        role: 'Artist',
        invitedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const getMine = vi
      .spyOn(workspaceService, 'getMyWorkspaces')
      .mockResolvedValueOnce([ws()] as any)
      .mockResolvedValueOnce([
        ws(),
        ws({ id: 'ws-new', name: 'Nova Studio', isOwner: false, currentUserRole: 'ARTIST' }),
      ] as any);
    const accept = vi.spyOn(workspaceService, 'acceptInvitation').mockResolvedValue({} as any);
    renderView();

    expect(
      await screen.findByText(/Minh mời bạn làm Họa sĩ|Minh invited you as Artist/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^(Chấp nhận|Accept): Nova Studio/ }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith('ws-new'));
    await waitFor(() => expect(getMine).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('button', { name: /(Vào studio|Enter studio): Nova Studio/ }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('ws-invitations')).not.toBeInTheDocument();
  });

  it('declining an invitation asks for confirmation first', async () => {
    vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([
      {
        workspaceId: 'ws-x',
        workspaceName: 'X Studio',
        ownerName: 'Lan',
        ownerEmail: 'l@x.com',
        role: 'Writer',
        invitedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([ws()] as any);
    const reject = vi.spyOn(workspaceService, 'rejectInvitation').mockResolvedValue();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderView();

    fireEvent.click(await screen.findByRole('button', { name: /^(Từ chối|Decline): X Studio/ }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(reject).not.toHaveBeenCalled();
    expect(screen.getByTestId('ws-invitations')).toBeInTheDocument();
  });

  it('shows unfinished tasks across studios, nearest deadline first, only for studios with work', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({ id: 'ws-a', name: 'Alpha Studio', pendingTasks: 2 }),
      ws({ id: 'ws-b', name: 'Idle Studio', pendingTasks: 0 }),
    ] as any);
    const base = { seriesTitle: 'Mưa', chapterNumber: 3, brief: '', stageOrder: 1 } as any;
    const mine = vi.spyOn(assignmentService, 'getMyAssignments').mockResolvedValue([
      {
        ...base,
        id: 'a1',
        stageName: 'Ink',
        status: 'InProgress',
        dueDate: '2099-01-01T00:00:00Z',
      },
      {
        ...base,
        id: 'a2',
        stageName: 'Pencil',
        status: 'Assigned',
        dueDate: '2000-01-01T00:00:00Z',
      },
      { ...base, id: 'a3', stageName: 'Letter', status: 'Approved', dueDate: null },
    ]);
    renderView();

    const today = await screen.findByTestId('ws-today');
    expect(mine).toHaveBeenCalledTimes(1);
    expect(mine).toHaveBeenCalledWith('ws-a');
    const rows = today.querySelectorAll('li');
    expect(rows).toHaveLength(2); // việc đã duyệt bị loại
    expect(rows[0].textContent).toContain('Pencil');
    expect(rows[0].textContent).toMatch(/Quá hạn|Overdue/);
  });

  it('shows series, storage (owner only) and latest activity on the card', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({
        id: 'ws-own',
        name: 'Own Studio',
        seriesCount: 4,
        seriesPreviews: [{ id: 's1', title: 'Mưa', coverUrl: null }],
        lastActivityAt: new Date().toISOString(),
        storageQuotaBytes: 1000,
        usedStorageBytes: 500,
      }),
      ws({
        id: 'ws-art',
        name: 'Art Studio',
        isOwner: false,
        currentUserRole: 'ARTIST',
        seriesCount: 0,
      }),
    ] as any);
    renderView();

    await waitFor(() => expect(screen.getByText('Art Studio')).toBeInTheDocument());
    expect(screen.getByText('4 series')).toBeInTheDocument();
    expect(screen.getByTitle('Mưa')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có series|No series yet/)).toBeInTheDocument();
    expect(screen.getAllByTestId('ws-card-storage')).toHaveLength(1);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText(/Cập nhật hôm nay|Updated today/)).toBeInTheDocument();
  });

  it('search and sort appear only from 6 studios and filter by name or owner', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue(
      ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map((n, i) =>
        ws({ id: 'ws-' + i, name: n + ' Studio', ownerName: i === 5 ? 'Khoa' : 'Alice' }),
      ) as any,
    );
    renderView();

    const search = await screen.findByRole('searchbox');
    fireEvent.change(search, { target: { value: 'khoa' } });
    expect(screen.getByText('Zeta Studio')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Studio')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'không có' } });
    expect(screen.getByText(/Không có studio khớp|No studio matches/)).toBeInTheDocument();
  });

  it('shows series as volumes on a shelf when the studio has no own cover, and hides empty work chips', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([
      ws({
        id: 'ws-shelf',
        name: 'Shelf Studio',
        coverUrl: null,
        seriesCount: 5,
        seriesPreviews: [
          { id: 's1', title: 'Mưa', coverUrl: null },
          { id: 's2', title: 'Nắng', coverUrl: null },
        ],
        pendingTasks: 0,
      }),
    ] as any);
    renderView();

    const shelf = await screen.findByTestId('ws-series-shelf');
    expect(shelf.textContent).toContain('Mưa');
    expect(shelf.textContent).toContain('+3');
    expect(screen.getByTestId('ws-summary').textContent).toMatch(/cả 1 studio|all 1 studios/);
    expect(screen.queryByTestId('ws-chip-pending')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ws-chip-reviews')).not.toBeInTheDocument();
  });
});

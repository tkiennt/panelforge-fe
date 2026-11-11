import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceListView } from './WorkspaceListView';
import { workspaceService } from '@/services/workspace.service';
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
    expect(screen.getByText(/2 (tasks waiting|việc đang chờ)/i)).toBeInTheDocument();
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

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2'));
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

  describe('Lời mời đang chờ (BR-23: Pending chưa có quyền tới khi chấp nhận)', () => {
    const invitation = {
      workspaceId: 'ws-inv',
      workspaceName: 'Gamma Studio',
      ownerName: 'Bob',
      ownerEmail: 'bob@example.com',
      role: 'Artist',
      invitedAt: '2026-01-01T00:00:00Z',
    };

    it('chấp nhận lời mời → gọi API, ẩn lời mời và tải lại danh sách Studio', async () => {
      const getMine = vi
        .spyOn(workspaceService, 'getMyWorkspaces')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          ws({ id: 'ws-inv', name: 'Gamma Studio', isOwner: false, currentUserRole: 'ARTIST' }),
        ] as any);
      vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([invitation]);
      const accept = vi.spyOn(workspaceService, 'acceptInvitation').mockResolvedValue({} as any);
      renderView();

      fireEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));

      await waitFor(() => expect(accept).toHaveBeenCalledWith('ws-inv'));
      await waitFor(() => expect(screen.queryByText(/Lời mời đang chờ/)).not.toBeInTheDocument());
      expect(getMine).toHaveBeenCalledTimes(2);
      expect(await screen.findByRole('button', { name: /Gamma Studio/ })).toBeInTheDocument();
    });

    it('từ chối cần xác nhận; huỷ xác nhận thì không gọi API', async () => {
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
      vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([invitation]);
      const reject = vi.spyOn(workspaceService, 'rejectInvitation').mockResolvedValue();
      const confirmSpy = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      renderView();

      const btn = await screen.findByRole('button', { name: 'Từ chối' });
      fireEvent.click(btn);
      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
      expect(reject).not.toHaveBeenCalled();

      fireEvent.click(btn);
      await waitFor(() => expect(reject).toHaveBeenCalledWith('ws-inv'));
      await waitFor(() => expect(screen.queryByText('Gamma Studio')).not.toBeInTheDocument());
    });

    it('lỗi khi chấp nhận → hiện thông báo, giữ lời mời để thử lại', async () => {
      vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);
      vi.spyOn(workspaceService, 'getPendingInvitations').mockResolvedValue([invitation]);
      vi.spyOn(workspaceService, 'acceptInvitation').mockRejectedValue(
        new Error('Lời mời đã hết hiệu lực.'),
      );
      renderView();

      fireEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Lời mời đã hết hiệu lực.');
      expect(screen.getByRole('button', { name: 'Chấp nhận' })).toBeEnabled();
    });
  });
});

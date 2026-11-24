import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StudioSwitcher } from './StudioSwitcher';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMyWorkspaces: vi.fn(),
  },
}));

const mockWorkspaces: WorkspaceDto[] = [
  {
    id: 'ws-1',
    name: 'Studio MAPPA',
    ownerId: 'user-1',
    ownerName: 'Tatsuki F.',
    ownerEmail: 'producer@mappa.co.jp',
    storageQuotaBytes: 500 * 1024 * 1024 * 1024,
    usedStorageBytes: 142 * 1024 * 1024 * 1024,
    createdAt: '2026-01-01T00:00:00Z',
    isOwner: true,
    currentUserRole: 'PRODUCER',
    memberCount: 14,
  },
  {
    id: 'ws-2',
    name: 'Crimson Ink Studio',
    ownerId: 'user-2',
    ownerName: 'Ken A.',
    ownerEmail: 'ken@crimson.com',
    storageQuotaBytes: 100 * 1024 * 1024 * 1024,
    usedStorageBytes: 25 * 1024 * 1024 * 1024,
    createdAt: '2026-02-01T00:00:00Z',
    isOwner: false,
    currentUserRole: 'EDITOR',
    memberCount: 8,
  },
];

describe('StudioSwitcher component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (workspaceService.getMyWorkspaces as any).mockResolvedValue(mockWorkspaces);
  });

  it('renders trigger button with active workspace name', () => {
    render(
      <BrowserRouter>
        <StudioSwitcher activeWorkspaceId='ws-1' activeWorkspaceName='Studio MAPPA' />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('studio-switcher-trigger')).toBeInTheDocument();
    expect(screen.getByText('Studio MAPPA')).toBeInTheDocument();
  });

  it('opens dropdown and displays studio list on click', async () => {
    render(
      <BrowserRouter>
        <StudioSwitcher activeWorkspaceId='ws-1' activeWorkspaceName='Studio MAPPA' />
      </BrowserRouter>,
    );

    const trigger = screen.getByTestId('studio-switcher-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('studio-switcher-dropdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Không gian Studio của bạn')).toBeInTheDocument();
    expect(screen.getByText('Crimson Ink Studio')).toBeInTheDocument();
  });

  it('calls onSelectStudio and closes dropdown when an option is selected', async () => {
    const handleSelect = vi.fn();
    render(
      <BrowserRouter>
        <StudioSwitcher
          activeWorkspaceId='ws-1'
          activeWorkspaceName='Studio MAPPA'
          onSelectStudio={handleSelect}
        />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('studio-switcher-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('studio-option-ws-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('studio-option-ws-2'));
    expect(handleSelect).toHaveBeenCalledWith(mockWorkspaces[1]);
    expect(screen.queryByTestId('studio-switcher-dropdown')).not.toBeInTheDocument();
  });

  it('calls onCreateNewStudio when create button is clicked', async () => {
    const handleCreate = vi.fn();
    render(
      <BrowserRouter>
        <StudioSwitcher
          activeWorkspaceId='ws-1'
          activeWorkspaceName='Studio MAPPA'
          onCreateNewStudio={handleCreate}
        />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('studio-switcher-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('studio-switcher-create-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('studio-switcher-create-btn'));
    expect(handleCreate).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkspaceListView } from './WorkspaceListView';
import { workspaceService } from '../services/workspace.service';
import { WorkspaceDto } from '../types';

describe('WorkspaceListView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then displays real workspace cards', async () => {
    const mockWorkspaces: WorkspaceDto[] = [
      {
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
      },
    ];

    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue(mockWorkspaces as any);

    const onSelectMock = vi.fn();
    render(<WorkspaceListView onSelectWorkspace={onSelectMock} />);

    expect(screen.getByText(/Loading Workspaces/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alpha Studio')).toBeInTheDocument();
      expect(screen.getByText('Producer')).toBeInTheDocument();
      expect(screen.getByText('2 Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('5 Members')).toBeInTheDocument();
    });

    // Click on workspace card
    fireEvent.click(screen.getByText('Alpha Studio'));
    expect(onSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ws-1',
        name: 'Alpha Studio',
        currentUserRole: 'PRODUCER',
      }),
    );
  });

  it('renders empty state when user has no workspaces', async () => {
    vi.spyOn(workspaceService, 'getMyWorkspaces').mockResolvedValue([]);

    const onSelectMock = vi.fn();
    const onCreateMock = vi.fn();
    render(<WorkspaceListView onSelectWorkspace={onSelectMock} onCreateWorkspace={onCreateMock} />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to PanelForge')).toBeInTheDocument();
      expect(
        screen.getByText(/You currently don't belong to any active Workspaces/i),
      ).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(createBtn);
    expect(onCreateMock).toHaveBeenCalled();
  });
});

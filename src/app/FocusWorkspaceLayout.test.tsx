import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FocusWorkspaceLayout } from './FocusWorkspaceLayout';
import { CurrentUser } from './AppShell';

describe('FocusWorkspaceLayout Component', () => {
  const dummyUser: CurrentUser = {
    name: 'Kishimoto M.',
    role: 'USER',
    workspaceRole: 'ARTIST' as any,
    activeRoles: ['ARTIST'],
    avatarInitials: 'KM',
  };

  const renderLayout = (route = '/workspaces/ws-1/series/ser-1/artist') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            element={
              <FocusWorkspaceLayout
                currentUser={dummyUser}
                activeWorkspace={{ id: 'ws-1', name: 'Manga Studio X' }}
                activeSeries={{ title: 'Chainsaw Blade', subtitle: 'Arc 1' }}
              />
            }
          >
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/artist'
              element={<div data-testid='artist-desk-content'>Artist Desk Screen</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders FocusWorkspaceLayout with compact header and without AppShellSidebar', () => {
    renderLayout();

    // Compact Studio Header exists
    expect(screen.getByTestId('focus-studio-header')).toBeInTheDocument();
    expect(screen.getByTestId('focus-back-btn')).toBeInTheDocument();

    // Breadcrumb displays correct workspace and desk title
    expect(screen.getByText('Bàn vẽ Artist (Manga B5 Desk)')).toBeInTheDocument();
    expect(screen.getByText('Auto-saved (SHA-256 CAS)')).toBeInTheDocument();
    expect(screen.getByText('B5 Master (600 DPI)')).toBeInTheDocument();

    // Content is rendered
    expect(screen.getByTestId('artist-desk-content')).toBeInTheDocument();

    // AppShellSidebar is NOT present (preventing the 2-sidebar conflict!)
    expect(screen.queryByTestId('app-shell-sidebar')).not.toBeInTheDocument();
  });

  it('supports toggling Zen Mode on via button or key and off via floating pill', () => {
    renderLayout();

    // Click Zen mode button
    const zenBtn = screen.getByTestId('focus-zen-toggle-btn');
    fireEvent.click(zenBtn);

    // Header collapses, floating pill appears
    expect(screen.queryByTestId('focus-studio-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('focus-zen-pill')).toBeInTheDocument();

    // Exit Zen mode
    fireEvent.click(screen.getByText(/Thoát Zen Mode/i));
    expect(screen.getByTestId('focus-studio-header')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-zen-pill')).not.toBeInTheDocument();
  });
});

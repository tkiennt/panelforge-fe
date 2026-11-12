import React from 'react';
import { describe, it, expect } from 'vitest';
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

  const renderLayout = (route = '/workspaces/ws-1/series/ser-1/artist?chapterId=01') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            element={
              <FocusWorkspaceLayout
                currentUser={dummyUser}
                activeWorkspace={{ id: 'ws-1', name: 'Manga Studio X' }}
                activeSeries={{ id: 'ser-1', title: 'Chainsaw Blade', subtitle: 'Arc 1' }}
              />
            }
          >
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/artist'
              element={<div data-testid='artist-desk-content'>Artist Desk Screen</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders FocusWorkspaceLayout with system warm-paper header colors, series/chapter links, and no technical jargon', () => {
    renderLayout();

    const layout = screen.getByTestId('focus-workspace-layout');
    expect(layout).toHaveClass('bg-[#F3F0E9]', 'text-[#1C1917]');

    const header = screen.getByTestId('focus-studio-header');
    expect(header).toHaveClass('bg-[#FCFBF8]/95', 'border-[#D8D2C5]');
    expect(screen.getByTestId('focus-back-btn')).toBeInTheDocument();

    // Series link points directly to ARTIST role series path
    const seriesLink = screen.getByTestId('focus-series-link');
    expect(seriesLink).toHaveTextContent('Chainsaw Blade');
    expect(seriesLink).toHaveAttribute('href', '/workspaces/ws-1/series/ser-1/my-work');

    // Chapter breadcrumb points directly to chapter workspace
    const chapterBreadcrumb = screen.getByTestId('focus-chapter-breadcrumb');
    expect(chapterBreadcrumb).toHaveTextContent('Chương 01');
    expect(screen.getByTestId('focus-chapter-link')).toHaveAttribute(
      'href',
      '/workspaces/ws-1/series/ser-1/workspace?chapterId=01',
    );

    // No technical jargon visible
    expect(
      screen.queryByText(/SHA-256|CAS|DPI|B5 Master|Zen Mode|Manga B5 Desk/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Đã lưu tự động')).toBeInTheDocument();

    // Content is rendered and AppShellSidebar is NOT present
    expect(screen.getByTestId('artist-desk-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-shell-sidebar')).not.toBeInTheDocument();
  });

  it('supports toggling full focus mode on and off cleanly', () => {
    renderLayout();

    const focusBtn = screen.getByTestId('focus-zen-toggle-btn');
    expect(focusBtn).toHaveTextContent('Tập trung');
    fireEvent.click(focusBtn);

    expect(screen.queryByTestId('focus-studio-header')).not.toBeInTheDocument();
    const exitPill = screen.getByTestId('focus-zen-pill');
    expect(exitPill).toHaveTextContent('Thoát toàn màn hình (F)');

    fireEvent.click(screen.getByText(/Thoát toàn màn hình/i));
    expect(screen.getByTestId('focus-studio-header')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-zen-pill')).not.toBeInTheDocument();
  });
});

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
    expect(layout).toHaveClass('bg-[#FAF9F5]', 'text-stone-900');

    const header = screen.getByTestId('focus-studio-header');
    expect(header).toHaveClass('bg-white', 'border-stone-200');
    expect(screen.queryByTestId('focus-back-btn')).not.toBeInTheDocument();

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

    // Content is rendered and AppShellSidebar is present in Writer Studio design
    expect(screen.getByTestId('artist-desk-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-sidebar')).toBeInTheDocument();
  });

  it('supports toggling full focus mode on and off cleanly for artist desk', () => {
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

  it('reuses and updates the persisted sidebar theme in focus routes', () => {
    localStorage.setItem('pf.sidebar.theme', 'ocean');
    renderLayout();

    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar).toHaveAttribute('data-sb-theme', 'ocean');

    fireEvent.click(screen.getByTestId('sidebar-theme-btn'));
    fireEvent.click(screen.getByTestId('sidebar-theme-paper'));

    expect(sidebar).toHaveAttribute('data-sb-theme', 'paper');
    expect(localStorage.getItem('pf.sidebar.theme')).toBe('paper');
    localStorage.removeItem('pf.sidebar.theme');
  });

  it('hides focus mode button and zen toggle UI for writer script editor, and renders clean breadcrumb with suffix', () => {
    const writerUser: CurrentUser = {
      name: 'Arata K.',
      role: 'USER',
      workspaceRole: 'WRITER' as any,
      activeRoles: ['WRITER'],
      avatarInitials: 'AK',
    };

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/script/editor?chapterId=05']}>
        <Routes>
          <Route
            element={
              <FocusWorkspaceLayout
                currentUser={writerUser}
                activeWorkspace={{ id: 'ws-1', name: 'Studio MAPPA' }}
                activeSeries={{ id: 'ser-1', title: 'Shibuya Overdrive' }}
              />
            }
          >
            <Route
              path='/workspaces/:workspaceId/series/:seriesId/script/editor'
              element={<div data-testid='script-editor-content'>Script Editor Screen</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Focus mode toggle button is NOT present in writer editor
    expect(screen.queryByTestId('focus-zen-toggle-btn')).not.toBeInTheDocument();

    // Pressing 'F' does NOT enter zen mode
    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByTestId('focus-studio-header')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-zen-pill')).not.toBeInTheDocument();

    // Topbar omits redundant Studio back crumb (sidebar already has "Về Sảnh Studio")
    expect(screen.queryByTestId('focus-back-btn')).not.toBeInTheDocument();

    // Series link
    expect(screen.getByTestId('focus-series-link')).toHaveTextContent('Shibuya Overdrive');

    // Chapter breadcrumb has (Kịch bản) suffix
    const chapterBreadcrumb = screen.getByTestId('focus-chapter-breadcrumb');
    expect(chapterBreadcrumb).toHaveTextContent(/Chương 05.*\(Kịch bản\)/);

    // No stage stepper when stages is empty
    expect(screen.queryByTestId('focus-stage-stepper')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';

describe('ArtistDeskView - Canva-style Manga Desk', () => {
  it('renders artist desk initially focused on blank paper sheet with Canva left dock', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Main desk container
    expect(screen.getByTestId('artist-desk')).toBeInTheDocument();

    // Canva Primary Dock with 3 tabs
    expect(screen.getByTestId('canva-primary-dock')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-pages')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();

    // Canva Secondary Drawer is closed initially (w-0) for clean blank paper focus
    expect(screen.getByTestId('canva-secondary-drawer')).toHaveClass('w-0');

    // Canvas Shell
    expect(screen.getByTestId('artist-canvas-shell')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 01');

    // Blank Manga B5 Paper Sheet is clearly visible and centered
    expect(screen.getByTestId('artist-blank-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('artist-canvas-surface')).toBeInTheDocument();
  });

  it('switches between Canva tabs (Pages -> Script -> Bible) when opened by user', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>
    );

    // 1. User opens Pages drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(screen.getByTestId('canva-secondary-drawer')).toHaveClass('w-[330px]');
    expect(screen.getByTestId('canva-drawer-pages')).toBeInTheDocument();

    // 2. Click Script tab
    fireEvent.click(screen.getByTestId('canva-tab-script'));
    expect(screen.getByTestId('canva-drawer-script')).toBeInTheDocument();

    // 3. Click Bible tab
    fireEvent.click(screen.getByTestId('canva-tab-bible'));
    expect(screen.getByTestId('canva-drawer-bible')).toBeInTheDocument();
  });

  it('selects and adds pages via Canva sidebar when opened', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Open pages drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));

    // Select Page 2
    fireEvent.click(screen.getByTestId('canva-page-card-2'));
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 02');

    // Add new page
    fireEvent.click(screen.getByTestId('canva-btn-add-page-header'));
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 05');
  });

  it('shows hidden notice when page visibility eye icon is toggled off', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Open pages drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));

    // Toggle eye on Page 1
    fireEvent.click(screen.getByTestId('canva-btn-eye-1'));
    expect(screen.getByTestId('page-hidden-notice')).toHaveTextContent('Trang 1 đang tạm ẩn');
  });
});

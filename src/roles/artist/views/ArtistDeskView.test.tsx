import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';

describe('ArtistDeskView - Photoshop-inspired Manga Desk', () => {
  it('renders artist desk with left Photoshop page sidebar and center canvas', () => {
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

    // Photoshop Left Page Management Sidebar
    expect(screen.getByTestId('artist-page-sidebar')).toBeInTheDocument();
    expect(screen.getByText('QUẢN LÝ TRANG')).toBeInTheDocument();

    // Canvas Shell
    expect(screen.getByTestId('artist-canvas-shell')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 01');

    // Blank Manga B5 Paper Sheet
    expect(screen.getByTestId('artist-blank-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('artist-canvas-surface')).toBeInTheDocument();
  });

  it('switches selected page when clicking on sidebar page card', () => {
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

    // Select Page 2
    fireEvent.click(screen.getByTestId('page-card-2'));

    // Canvas page header updates to TRANG 02
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 02');
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('Cơn Bão Cát Nổi Lên');
  });

  it('adds a new page and selects it', () => {
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

    // Click Add Page button in sidebar footer
    fireEvent.click(screen.getByTestId('btn-footer-add-page'));

    // Page 5 should now exist and be selected
    expect(screen.getByTestId('canvas-page-header')).toHaveTextContent('TRANG 05');
    expect(screen.getByTestId('page-card-5')).toBeInTheDocument();
  });

  it('collapses and expands left sidebar on button click', () => {
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

    // Collapse
    fireEvent.click(screen.getByTestId('btn-collapse-sidebar'));
    expect(screen.queryByTestId('artist-page-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('artist-page-sidebar-collapsed')).toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByTestId('btn-expand-sidebar'));
    expect(screen.getByTestId('artist-page-sidebar')).toBeInTheDocument();
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

    // Page 1 is active, toggle visibility eye
    fireEvent.click(screen.getByTestId('btn-eye-1'));

    // Notice should appear on canvas
    expect(screen.getByTestId('page-hidden-notice')).toHaveTextContent('Trang 1 đang tạm ẩn');
  });
});

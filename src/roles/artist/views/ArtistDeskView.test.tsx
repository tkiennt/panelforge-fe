import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';

describe('ArtistDeskView - Canva-Style Bottom Page Manager', () => {
  it('renders artist desk with centered clean manga canvas and Canva bottom page dock', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Main desk container
    expect(screen.getByTestId('artist-desk')).toBeInTheDocument();

    // Canvas Shell & Clean Blank Manga Paper without technical text
    expect(screen.getByTestId('artist-canvas-shell')).toBeInTheDocument();
    expect(screen.getByTestId('artist-blank-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('artist-canvas-surface')).toBeInTheDocument();

    // Canva Bottom Page Manager exists
    expect(screen.getByTestId('canva-bottom-page-manager')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-filmstrip')).toBeInTheDocument();
    expect(screen.getByTestId('canva-bottom-bar')).toBeInTheDocument();

    // Page thumbnails are rendered
    expect(screen.getByTestId('canva-page-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('1 / 6');
  });

  it('selects a different page when clicking on thumbnail card', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Click on page 2 thumbnail
    const card2 = screen.getByTestId('canva-page-card-2');
    fireEvent.click(card2.querySelector('[role="button"]')!);

    // Counter updates to 2 / 6
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('2 / 6');
  });

  it('adds a new page when clicking Add Page button', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const addBtn = screen.getByTestId('canva-add-page-btn');
    fireEvent.click(addBtn);

    // New page 7 is created and active
    expect(screen.getByTestId('canva-page-card-7')).toBeInTheDocument();
    expect(screen.getByTestId('canva-page-counter')).toHaveTextContent('7 / 7');
  });

  it('toggles page filmstrip visibility when clicking Trang button', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('canva-page-filmstrip')).toBeInTheDocument();

    const toggleBtn = screen.getByTestId('canva-toggle-pages-btn');
    fireEvent.click(toggleBtn);

    // Filmstrip is hidden
    expect(screen.queryByTestId('canva-page-filmstrip')).not.toBeInTheDocument();
  });
});

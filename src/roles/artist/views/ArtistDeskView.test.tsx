import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';

describe('ArtistDeskView - Primitive Shell', () => {
  it('renders the minimal artist desk shell without header, sidetabs, or bottom dock', () => {
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

    // Main shell desk container exists
    const desk = screen.getByTestId('artist-desk');
    expect(desk).toBeInTheDocument();

    // Canvas shell exists
    const shell = screen.getByTestId('artist-canvas-shell');
    expect(shell).toBeInTheDocument();

    // Pristine blank sheet of paper exists
    const sheet = screen.getByTestId('artist-blank-sheet');
    expect(sheet).toBeInTheDocument();
    expect(sheet).toHaveClass('bg-white');

    // Canvas surface exists
    const surface = screen.getByTestId('artist-canvas-surface');
    expect(surface).toBeInTheDocument();

    // Header, sidetabs, bottom dock must NOT be present
    expect(screen.queryByTestId('global-pipeline-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-left-column')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-right-column')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-bottom-dock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('layout-edit-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-radial-menu')).not.toBeInTheDocument();
  });
});

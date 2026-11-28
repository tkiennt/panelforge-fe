import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EditorChapterDashboardView } from './EditorChapterDashboardView';

const LocationConsumer: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid='pathname'>{location.pathname}</div>
      <div data-testid='search'>{location.search}</div>
    </div>
  );
};

describe('EditorChapterDashboardView redirect', () => {
  it('redirects /workspaces/:wId/series/:sId/editor/dashboard/:chapterId to editor/dashboard?chapter=:chapterId', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/w1/series/s1/editor/dashboard/c42']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard/:chapterId'
            element={<EditorChapterDashboardView />}
          />
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/editor/dashboard'
            element={<LocationConsumer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pathname').textContent).toBe(
      '/workspaces/w1/series/s1/editor/dashboard',
    );
    expect(screen.getByTestId('search').textContent).toBe('?chapter=c42');
  });
});

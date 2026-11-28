import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { isReaderLanding, readerPathFor } from './readerAccount';
import { ReaderGate } from './routes';

const renderGate = (path: string, isReader: boolean | null) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/catalog/*' element={<p>reader area</p>} />
        <Route
          path='*'
          element={
            <ReaderGate isReader={isReader}>
              <p>studio area</p>
            </ReaderGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('reader account', () => {
  it('treats only the PublicCatalog landing as a reader', () => {
    expect(isReaderLanding({ suggestedLanding: 'PublicCatalog' })).toBe(true);
    expect(isReaderLanding({ suggestedLanding: 'YourWorkspaces' })).toBe(false);
    expect(isReaderLanding({ suggestedLanding: 'StudioCreation' })).toBe(false);
    expect(isReaderLanding(null)).toBe(false);
  });

  it('maps studio routes to the matching reader page', () => {
    expect(readerPathFor('/profile')).toBe('/catalog/profile');
    expect(readerPathFor('/notifications')).toBe('/catalog/notifications');
    expect(readerPathFor('/workspaces')).toBe('/catalog');
    expect(readerPathFor('/my-work')).toBe('/catalog');
    expect(readerPathFor('/workspaces/ws-1/series/s-1/chapters')).toBe('/catalog');
    expect(readerPathFor('/publisher/desk')).toBe('/catalog');
  });

  it('sends a reader away from studio routes', () => {
    renderGate('/workspaces', true);
    expect(screen.getByText('reader area')).toBeInTheDocument();
    expect(screen.queryByText('studio area')).not.toBeInTheDocument();
  });

  it('lets studio members through and shows nothing while still checking', () => {
    renderGate('/my-work', false);
    expect(screen.getByText('studio area')).toBeInTheDocument();
    renderGate('/my-work', null);
    expect(screen.getAllByText('studio area')).toHaveLength(1);
  });
});

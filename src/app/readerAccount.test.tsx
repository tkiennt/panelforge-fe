import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { isReaderLanding, readerPathFor, useReaderAccount } from './readerAccount';
import { ReaderGate } from './routes';

vi.mock('@/services/auth.service', () => ({
  authService: { getLandingContext: vi.fn() },
}));

const landing = (suggestedLanding: string) => ({ suggestedLanding }) as never;

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

  it('lets studio members through', () => {
    renderGate('/my-work', false);
    expect(screen.getByText('studio area')).toBeInTheDocument();
  });

  it('shows neither area while still checking', () => {
    renderGate('/my-work', null);
    expect(screen.queryByText('studio area')).not.toBeInTheDocument();
    expect(screen.queryByText('reader area')).not.toBeInTheDocument();
  });
});

describe('useReaderAccount', () => {
  beforeEach(() => {
    vi.mocked(authService.getLandingContext).mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is never a reader for non-User roles and does not ask the server', () => {
    const { result } = renderHook(() => useReaderAccount(true, 'ADMIN' as never, 'u-1'));
    expect(result.current.isReader).toBe(false);
    expect(authService.getLandingContext).not.toHaveBeenCalled();
  });

  it('drops the previous account result when the account changes', async () => {
    vi.mocked(authService.getLandingContext).mockResolvedValueOnce(landing('PublicCatalog'));
    const { result, rerender } = renderHook(
      ({ id }) => useReaderAccount(true, 'USER' as never, id),
      { initialProps: { id: 'reader-1' } },
    );
    await waitFor(() => expect(result.current.isReader).toBe(true));

    let resolveSecond: (v: unknown) => void = () => undefined;
    vi.mocked(authService.getLandingContext).mockReturnValueOnce(
      new Promise((r) => (resolveSecond = r)) as never,
    );
    rerender({ id: 'member-2' });
    expect(result.current.isReader).toBeNull();
    await act(async () => resolveSecond(landing('YourWorkspaces')));
    expect(result.current.isReader).toBe(false);
  });

  it('keeps waiting and retries on a network error instead of guessing', async () => {
    vi.useFakeTimers();
    vi.mocked(authService.getLandingContext)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(landing('PublicCatalog'));
    const { result } = renderHook(() => useReaderAccount(true, 'USER' as never, 'u-1'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isReader).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(authService.getLandingContext).toHaveBeenCalledTimes(2);
    expect(result.current.isReader).toBe(true);
  });

  it('opens the studio area right after joining a studio', async () => {
    vi.mocked(authService.getLandingContext).mockResolvedValueOnce(landing('PublicCatalog'));
    const { result } = renderHook(() => useReaderAccount(true, 'USER' as never, 'u-1'));
    await waitFor(() => expect(result.current.isReader).toBe(true));
    act(() => result.current.markStudioMember());
    expect(result.current.isReader).toBe(false);
  });
});

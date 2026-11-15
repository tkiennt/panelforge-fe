import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BibleReviewView } from './BibleReviewView';
import { bibleService } from '@/services/bible.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
    getEntryHistory: vi.fn().mockResolvedValue([]),
    confirmRevision: vi.fn().mockResolvedValue({ reviewStatus: 'CanonLocked' }),
    requestReworkRevision: vi.fn().mockResolvedValue({ reviewStatus: 'ReworkRequired' }),
  },
}));

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const conceptEntry = {
  id: 'entry-1',
  seriesBibleId: 'bible-1',
  category: 'Character' as const,
  code: 'CHR-01',
  name: 'Tần Mục',
  description: 'Nhân vật chính',
  detailsJson: '{}',
  priority: 'Standard' as const,
  strictCheck: false,
  isActive: true,
  createdAt: '2026-11-15T00:00:00Z',
  effectiveRevision: {
    id: 'rev-1',
    bibleEntryId: 'entry-1',
    versionNumber: 1,
    summary: 'Model sheet',
    snapshotJson: '{}',
    contentHash: 'hash',
    isInitialVersion: true,
    createdAt: '2026-11-15T00:00:00Z',
    variantLabel: 'Mặc định',
    reviewStatus: 'ConceptSubmitted' as const,
    conceptImageUrl: '/concept.png',
  },
};

const renderView = (workspaceRole: string) =>
  render(
    <MemoryRouter initialEntries={['/series/series-1/bible-review']}>
      <Routes>
        <Route
          path='/series/:seriesId/bible-review'
          element={<BibleReviewView workspaceRole={workspaceRole} />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('BibleReviewView lifecycle permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bibleService.getEntryHistory).mockResolvedValue([]);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-1',
      workspaceId: 'workspace-1',
      name: 'Series Bible',
      version: 1,
      entries: [conceptEntry],
    });
  });

  it('lets Editor confirm and lock the submitted revision directly', async () => {
    renderView('EDITOR');

    const lockButton = await screen.findByRole('button', { name: /Xác nhận & Khoá Canon/i });
    fireEvent.click(lockButton);

    await waitFor(() =>
      expect(bibleService.confirmRevision).toHaveBeenCalledWith('series-1', 'entry-1', 'rev-1'),
    );
    expect(screen.queryByText(/Chờ Producer/i)).toBeNull();
  });

  it('keeps Producer read-only except for requesting redraw', async () => {
    renderView('PRODUCER');

    expect(await screen.findByRole('button', { name: /Yêu cầu vẽ lại/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Xác nhận & Khoá Canon/i })).toBeNull();
  });
});

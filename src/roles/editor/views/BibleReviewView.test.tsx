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
    endorseRevision: vi.fn().mockResolvedValue({
      reviewStatus: 'ConceptSubmitted',
      writerEndorsement: { endorsed: true, conceptVersion: 1 },
    }),
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

    const reworkBtn = await screen.findByRole('button', { name: /Yêu cầu vẽ lại/i });
    expect(reworkBtn).toBeDefined();
    expect(screen.queryByRole('button', { name: /Xác nhận & Khoá Canon/i })).toBeNull();

    // Producer opens production-reason modal on Yêu cầu vẽ lại
    fireEvent.click(reworkBtn);
    const textbox = await screen.findByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Giảm chi tiết áo giáp để kịp tiến độ' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/i }));

    await waitFor(() =>
      expect(bibleService.requestReworkRevision).toHaveBeenCalledWith(
        'series-1',
        'entry-1',
        'rev-1',
        {
          reason: 'Giảm chi tiết áo giáp để kịp tiến độ',
        },
      ),
    );
  });

  it('shows non-blocking Amber warning when Writer has not endorsed and keeps Lock Canon enabled, and shows Emerald badge once endorsed', async () => {
    renderView('EDITOR');

    const amberBanner = await screen.findByTestId('writer-not-endorsed-banner');
    expect(amberBanner).toHaveTextContent(/Writer chưa xác nhận bản vẽ v1/i);
    const lockButton = screen.getByRole('button', { name: /Xác nhận & Khoá Canon/i });
    expect(lockButton).toBeEnabled();

    // Now return an endorsed concept for v1
    vi.mocked(bibleService.getSeriesBible).mockResolvedValueOnce({
      id: 'bible-1',
      seriesId: 'series-1',
      workspaceId: 'workspace-1',
      name: 'Series Bible',
      version: 1,
      entries: [
        {
          ...conceptEntry,
          effectiveRevision: {
            ...conceptEntry.effectiveRevision,
            currentConceptVersionNumber: 1,
            writerEndorsement: {
              endorsed: true,
              endorsedByName: 'Writer Minh',
              endorsedAt: '2026-11-26T00:00:00Z',
              conceptVersion: 1,
            },
          },
        },
      ],
    });

    renderView('EDITOR');
    const emeraldBadge = await screen.findByTestId('writer-endorsed-badge');
    expect(emeraldBadge).toHaveTextContent(/Writer đã xác nhận bản v1/i);
  });

  it('lets Writer toggle soft endorsement on ConceptSubmitted revision', async () => {
    renderView('WRITER');

    const endorseBtn = await screen.findByTestId('writer-endorse-btn');
    expect(endorseBtn).toHaveTextContent(/Xác nhận tạo hình \(Endorse\)/i);
    fireEvent.click(endorseBtn);

    await waitFor(() =>
      expect(bibleService.endorseRevision).toHaveBeenCalledWith('series-1', 'rev-1', true),
    );
  });
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistChapterSelectionView } from './ArtistChapterSelectionView';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';

const chapters = [
  {
    id: 'pre-production',
    seriesId: 'ser-1',
    chapterNumber: 1,
    title: 'Chưa chốt',
    versionVector: 1,
    createdAt: '2026-01-01T00:00:00Z',
    scenesCount: 1,
    pagesCount: 1,
    status: 'PreProduction',
    isScriptFrozen: false,
  },
  {
    id: 'approved',
    seriesId: 'ser-1',
    chapterNumber: 2,
    title: 'Đã nghiệm thu',
    versionVector: 1,
    createdAt: '2026-01-02T00:00:00Z',
    scenesCount: 1,
    pagesCount: 1,
    status: 'ChapterApproved',
    isScriptFrozen: true,
  },
] as unknown as ChapterDto[];

const series = {
  id: 'ser-1',
  workspaceId: 'ws-1',
  title: 'Bộ truyện thử nghiệm',
  readingDirection: 0,
  genre: 'Action',
  format: 'Manga',
  createdAt: '2026-01-01T00:00:00Z',
  chaptersCount: 2,
  chapters: [],
};

afterEach(() => vi.restoreAllMocks());

describe('artist and letterer chapter stage gates', () => {
  it('disables pre-production chapters and uses the Gate 3 state wording', async () => {
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue(series);
    vi.spyOn(chapterService, 'getChaptersBySeries').mockResolvedValue({
      items: chapters,
      totalCount: chapters.length,
      pageIndex: 1,
      pageSize: 100,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/ser-1']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId'
            element={<ArtistChapterSelectionView />}
          />
          <Route path='*' element={<div>desk opened</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Chưa chốt');
    const blockedCard = screen
      .getAllByTitle(/giai đoạn tiền kỳ/i)
      .find((element) => element.getAttribute('aria-disabled') === 'true');
    expect(blockedCard).toBeDefined();
    expect(blockedCard).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(blockedCard!);
    expect(screen.queryByText('desk opened')).not.toBeInTheDocument();
    expect(screen.getByText('Nghiệm thu hoàn tất (Gate 3)')).toBeInTheDocument();
  });
});

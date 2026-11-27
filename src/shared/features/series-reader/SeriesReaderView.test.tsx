import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SeriesReaderView } from './SeriesReaderView';
import { seriesService } from '@/services/series.service';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { workspaceService } from '@/services/workspace.service';
import { pageCommentService, type PageCommentDto } from '@/services/pageComment.service';

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    reopenChapter: vi.fn(),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getTaskGrid: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn(),
    getArtworkAccessLink: vi.fn(),
  },
  resolveArtworkUrl: (url: string) => `https://cdn.test${url}`,
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/services/pageComment.service', () => ({
  pageCommentService: {
    listBySeries: vi.fn(),
    create: vi.fn(),
    resolve: vi.fn(),
    reopen: vi.fn(),
    convertToRework: vi.fn(),
  },
}));

function renderView(workspaceRole = 'PRODUCER') {
  const onShowToast = vi.fn();
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/read']}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/read'
          element={<SeriesReaderView workspaceRole={workspaceRole} onShowToast={onShowToast} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  return { onShowToast };
}

describe('SeriesReaderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(seriesService.getSeriesById).mockResolvedValue({
      id: 'series-1',
      workspaceId: 'ws-1',
      title: 'Blade of Dawn',
      format: 'Manga',
    } as never);

    vi.mocked(workspaceService.getMembers).mockResolvedValue([]);

    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-1',
          seriesId: 'series-1',
          chapterNumber: 1,
          title: 'Awakening',
          versionVector: 1,
          createdAt: '2026-11-20T00:00:00Z',
          scenesCount: 1,
          pagesCount: 1,
          status: 'InProduction',
        },
        {
          id: 'chap-2',
          seriesId: 'series-1',
          chapterNumber: 2,
          title: 'Locked Chapter',
          versionVector: 1,
          createdAt: '2026-11-21T00:00:00Z',
          scenesCount: 1,
          pagesCount: 1,
          status: 'ChapterApproved',
        },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 200,
    } as never);

    vi.mocked(pageService.getPagesByChapter).mockImplementation(async (chapId) => [
      {
        id: `page-${chapId}`,
        chapterId: chapId,
        pageNumber: 1,
        layoutFormat: 'B5',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 300,
        elementsCount: 0,
      },
    ]);

    vi.mocked(assignmentService.getTaskGrid).mockResolvedValue({
      chapterId: 'chap-1',
      stages: [],
      pages: [],
      tasks: [],
      lots: [],
    });

    vi.mocked(artworkService.getArtworks).mockResolvedValue([]);
  });

  it('renders table of contents and chapter sections from services', async () => {
    vi.mocked(pageCommentService.listBySeries).mockResolvedValue([]);

    renderView('PRODUCER');

    expect(await screen.findByTestId('toc-chapter-chap-1')).toBeInTheDocument();
    expect(screen.getByTestId('toc-chapter-chap-2')).toBeInTheDocument();
    expect(screen.getByTestId('reader-chapter-section-chap-1')).toBeInTheDocument();
    expect(screen.getByTestId('reader-chapter-section-chap-2')).toBeInTheDocument();
  });

  it('submitting a new comment calls pageCommentService.create with chapterId and message', async () => {
    vi.mocked(pageCommentService.listBySeries).mockResolvedValue([]);
    const created: PageCommentDto = {
      id: 'comment-new',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      chapterNumber: 1,
      chapterTitle: 'Awakening',
      pageId: null,
      pageNumber: null,
      panelId: null,
      panelNumber: null,
      assetReferenceId: null,
      pinX: null,
      pinY: null,
      message: 'Tighten the speech balloon',
      authorUserId: 'user-1',
      authorName: 'Producer A',
      status: 'Open',
      createdAt: '2026-11-27T09:00:00Z',
    };
    vi.mocked(pageCommentService.create).mockResolvedValue(created);

    renderView('PRODUCER');

    const input = await screen.findByTestId('series-reader-comment-input');
    fireEvent.change(input, { target: { value: 'Tighten the speech balloon' } });
    fireEvent.click(screen.getByTestId('series-reader-comment-submit'));

    await waitFor(() => {
      expect(pageCommentService.create).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          message: 'Tighten the speech balloon',
        }),
      );
    });

    expect(await screen.findByTestId('page-comment-card-comment-new')).toBeInTheDocument();
  });

  it('disables convert-to-rework button when chapter is not InProduction', async () => {
    const approvedChapterComment: PageCommentDto = {
      id: 'comment-locked',
      seriesId: 'series-1',
      chapterId: 'chap-2',
      chapterNumber: 2,
      chapterTitle: 'Locked Chapter',
      pageId: 'page-chap-2',
      pageNumber: 1,
      panelId: null,
      panelNumber: null,
      assetReferenceId: null,
      pinX: 0.5,
      pinY: 0.5,
      message: 'Fix typo in chapter 2',
      authorUserId: 'user-1',
      authorName: 'Producer A',
      status: 'Open',
      createdAt: '2026-11-27T09:00:00Z',
    };
    vi.mocked(pageCommentService.listBySeries).mockResolvedValue([approvedChapterComment]);

    renderView('PRODUCER');

    const convertBtn = await screen.findByTestId('convert-rework-btn-comment-locked');
    expect(convertBtn).toBeDisabled();
    expect(screen.getByTestId('reopen-chapter-btn-chap-2')).toBeInTheDocument();
  });
});

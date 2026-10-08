import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LettererWorkspace from './LettererWorkspace';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { elementService } from '@/services/element.service';

vi.mock('@/services/chapter.service');
vi.mock('@/services/page.service');
vi.mock('@/services/element.service');

describe('LettererWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-1',
          seriesId: 'series-1',
          chapterNumber: 1,
          title: 'Khởi đầu',
          status: 'InProduction',
          versionVector: 1,
          scenesCount: 1,
          pagesCount: 1,
          createdAt: '2026-10-08T00:00:00Z',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });

    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      {
        id: 'page-1',
        chapterId: 'chap-1',
        pageNumber: 1,
        layoutFormat: 'StandardPage',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        elementsCount: 0,
      },
    ]);

    vi.mocked(pageService.getPageById).mockResolvedValue({
      id: 'page-1',
      chapterId: 'chap-1',
      pageNumber: 1,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      version: 1,
      activeElementsCount: 0,
    });

    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 1,
      pageNumber: 1,
      elements: [],
    });
  });

  it('render bàn làm việc Letterer với dropdown chọn chương và trang', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/canvas']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/canvas'
            element={<LettererWorkspace />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Letterer Desk/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Khởi đầu/i)).toBeInTheDocument();
      expect(screen.getByText(/Trang 1 \(1200x1800\)/i)).toBeInTheDocument();
    });
  });
});

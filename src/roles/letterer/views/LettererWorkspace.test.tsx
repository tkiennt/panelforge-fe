import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LettererWorkspace from './LettererWorkspace';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { elementService } from '@/services/element.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { panelService } from '@/services/panel.service';
import { artworkService } from '@/services/artwork.service';
import { assignmentService } from '@/services/assignment.service';

vi.mock('@/services/chapter.service');
vi.mock('@/services/page.service');
vi.mock('@/services/element.service');
vi.mock('@/services/scriptLine.service');
vi.mock('@/services/panel.service');
vi.mock('@/services/artwork.service');
vi.mock('@/services/assignment.service');
vi.mock('@/shared/utils/compositePageRenderer', () => ({
  buildPageComposite: vi.fn().mockResolvedValue({ dataUrl: '', failedImages: 0, mode: 'empty' }),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  });
});

describe('LettererWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([]);
    vi.mocked(artworkService.getArtworks).mockResolvedValue([]);
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssignments).mockResolvedValue({
      items: [],
      totalCount: 0,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    } as any);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);

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

    expect(screen.getByTestId('artist-desk')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Khởi đầu/i)).toBeInTheDocument();
      expect(screen.getByTestId('canva-page-card-1')).toBeInTheDocument();
    });
  });
});

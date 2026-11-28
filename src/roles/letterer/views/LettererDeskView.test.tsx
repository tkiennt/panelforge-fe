import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LettererDeskView from './LettererDeskView';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { elementService } from '@/services/element.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { panelService } from '@/services/panel.service';
import { artworkService } from '@/services/artwork.service';
import { assignmentService } from '@/services/assignment.service';
import { aiAgentsService, AiApiError } from '@/services/aiAgents.service';

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

describe('LettererDeskView', () => {
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
            element={<LettererDeskView />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('artist-desk')).toBeInTheDocument();

    await waitFor(() => {
      // Tên chương hiện ở bộ chọn chương và ở đầu cột "Script truyện" của tab Letter
      expect(screen.getAllByText(/Chương 1: Khởi đầu/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('canva-page-card-1')).toBeInTheDocument();
    });
  });

  it('khi chọn bóng thoại trên chương Frozen: Letterer nhập maxChars, bấm "Rút gọn bằng AI", xem SuggestionCard và tải lại trang sau Accept', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          id: 'chap-1',
          seriesId: 'series-1',
          chapterNumber: 1,
          title: 'Khởi đầu',
          status: 'InProduction',
          isScriptFrozen: true,
          scriptStatus: 'Frozen',
          versionVector: 3,
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

    const initialElement = {
      elementId: 'el-bubble-1',
      elementType: 'SPEECH_BALLOON',
      x: 100,
      y: 120,
      width: 260,
      height: 160,
      zIndex: 1,
      readingOrder: 1,
      content: 'Chúng ta không thể đứng nhìn họ gặp nguy hiểm thêm một giây nào nữa!',
      renderedText: 'Chúng ta không thể đứng nhìn họ gặp nguy hiểm thêm một giây nào nữa!',
      scriptLineId: 'line-1',
      version: 2,
      isRemoved: false,
    };

    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 2,
      pageNumber: 1,
      elements: [initialElement as any],
    });

    const runCopilotSpy = vi.spyOn(aiAgentsService, 'runCopilot').mockResolvedValueOnce({
      id: 'sug-short-1',
      runId: 'run-short-1',
      stepId: 'step-short-1',
      sceneId: 'sc-1',
      kind: 'Lettering',
      status: 'Pending',
      summary: 'Rút gọn thoại còn 20/25 ký tự',
      payload: {
        pageId: 'page-1',
        elementId: 'el-bubble-1',
        elementVersion: 2,
        originalText: initialElement.content,
        suggestedText: 'Không thể đứng nhìn!',
        reason: 'Ngắn gọn vừa bóng thoại',
        maxChars: 25,
      },
      payloadHash: 'hash-short-1',
      baseChapterVersion: 3,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '2026-11-18T10:00:00Z',
      decisions: [],
      canDecide: true,
      canAccept: true,
    });

    const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
      suggestionId: 'sug-short-1',
      status: 'Accepted',
      decisionId: 'dec-short-1',
      resultRevisionId: null,
      chapterVersion: 3,
    });

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/canvas']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/canvas'
            element={<LettererDeskView workspaceRole='LETTERER' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const bubble = await screen.findByTestId('lettering-element-el-bubble-1');
    fireEvent.click(bubble);

    const maxCharsInput = await screen.findByLabelText(/Số ký tự tối đa/i);
    fireEvent.change(maxCharsInput, { target: { value: '25' } });

    const shortenBtn = screen.getByRole('button', { name: /Rút gọn bằng AI/i });
    expect(shortenBtn).toBeEnabled();
    fireEvent.click(shortenBtn);

    await waitFor(() => {
      expect(runCopilotSpy).toHaveBeenCalledWith('series-1', {
        task: 'letterer.shorten',
        pageId: 'page-1',
        elementId: 'el-bubble-1',
        maxChars: 25,
      });
    });

    expect(await screen.findByText('Không thể đứng nhìn!')).toBeInTheDocument();

    const snapshotCallsBeforeAccept = vi.mocked(elementService.getPageSnapshot).mock.calls.length;
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 3,
      pageNumber: 1,
      elements: [
        {
          ...initialElement,
          content: 'Không thể đứng nhìn!',
          renderedText: 'Không thể đứng nhìn!',
          version: 3,
        } as any,
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /Accept \(áp dụng rút gọn thoại\)/i }));

    await waitFor(() => {
      expect(reviewSpy).toHaveBeenCalledWith('series-1', 'sug-short-1', 'accept', {});
      expect(vi.mocked(elementService.getPageSnapshot).mock.calls.length).toBeGreaterThan(
        snapshotCallsBeforeAccept,
      );
    });
    expect(await screen.findByDisplayValue('Không thể đứng nhìn!')).toBeInTheDocument();
  });

  it('ẩn nút "Rút gọn bằng AI" khi người dùng không phải Letterer (ví dụ ARTIST)', async () => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'el-bubble-1',
          elementType: 'SPEECH_BALLOON',
          x: 100,
          y: 120,
          width: 260,
          height: 160,
          zIndex: 1,
          readingOrder: 1,
          content: 'Thoại cần kiểm tra quyền',
          renderedText: 'Thoại cần kiểm tra quyền',
          scriptLineId: 'line-1',
          version: 1,
          isRemoved: false,
        } as any,
      ],
    });

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/canvas']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/canvas'
            element={<LettererDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId('lettering-element-el-bubble-1'));
    expect(await screen.findByTestId('lettering-property-panel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rút gọn bằng AI/i })).not.toBeInTheDocument();
  });

  it('hiển thị đúng message lỗi 403 và 409 từ Backend trên LettererDeskView', async () => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'el-bubble-1',
          elementType: 'SPEECH_BALLOON',
          x: 100,
          y: 120,
          width: 260,
          height: 160,
          zIndex: 1,
          readingOrder: 1,
          content: 'Thoại khá dài cần rút gọn cho vừa bóng thoại',
          renderedText: 'Thoại khá dài cần rút gọn cho vừa bóng thoại',
          scriptLineId: 'line-1',
          version: 1,
          isRemoved: false,
        } as any,
      ],
    });

    vi.spyOn(aiAgentsService, 'runCopilot')
      .mockRejectedValueOnce(
        new AiApiError('Bạn không giữ ô Letter của trang này.', 'FORBIDDEN', 403),
      )
      .mockRejectedValueOnce(
        new AiApiError('Chapter đang ở trạng thái ChapterApproved (chỉ đọc).', 'CONFLICT', 409),
      );

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/canvas']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/canvas'
            element={<LettererDeskView workspaceRole='LETTERER' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId('lettering-element-el-bubble-1'));
    const shortenBtn = await screen.findByRole('button', { name: /Rút gọn bằng AI/i });

    fireEvent.click(shortenBtn);
    expect(await screen.findByText('Bạn không giữ ô Letter của trang này.')).toBeInTheDocument();

    fireEvent.click(shortenBtn);
    expect(
      await screen.findByText('Chapter đang ở trạng thái ChapterApproved (chỉ đọc).'),
    ).toBeInTheDocument();
  });
});

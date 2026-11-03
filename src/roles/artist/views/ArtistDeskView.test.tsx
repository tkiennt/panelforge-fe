import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ArtistDeskView } from './ArtistDeskView';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { frameTemplateService } from '@/services/frameTemplate.service';

import { elementService } from '@/services/element.service';
import { bibleService } from '@/services/bible.service';
import {
  artworkService,
  computeFileSha256,
  resolveArtworkUrl,
  toThumbnailUrl,
} from '@/services/artwork.service';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import { aiAgentsService } from '@/services/aiAgents.service';

vi.mock('@/services/chapter.service');
vi.mock('@/services/page.service');
vi.mock('@/services/panel.service');
vi.mock('@/services/scriptLine.service');
vi.mock('@/services/frameTemplate.service');
vi.mock('@/services/pipeline.service');
vi.mock('@/services/element.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/element.service')>();
  return {
    ...actual,
    elementService: {
      getPageSnapshot: vi.fn(),
      addElement: vi.fn(),
      moveElement: vi.fn(),
      removeElement: vi.fn(),
      updateElementText: vi.fn(),
      setReadingOrder: vi.fn(),
      acknowledgeOverflow: vi.fn(),
    },
  };
});
vi.mock('@/services/bible.service');
vi.mock('@/services/artwork.service');
vi.mock('@/services/assignment.service');
vi.mock('@/services/aiAgents.service');

describe('ArtistDeskView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'elem-char-1',
          elementType: 'CHARACTER_INSTANCE',
          zIndex: 1,
          x: 100,
          y: 100,
          width: 300,
          height: 400,
          content: 'Hero Character',
          assetId: 'art-1',
          isRemoved: false,
          version: 1,
          rotation: 0,
          panelId: 'panel-1',
          bibleEntryId: 'bible-char-1',
        },
      ],
    });

    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      id: 'bible-1',
      workspaceId: 'ws-1',
      seriesId: 'series-1',
      name: 'Series Bible',
      version: 1,
      entries: [
        {
          id: 'bible-char-1',
          seriesId: 'series-1',
          name: 'Kiếm Sĩ Ren',
          category: 'Character',
          status: 'Active',
          referenceImageUrl: 'https://example.com/ren.png',
        } as any,
      ],
    });
    vi.mocked(bibleService.getPanelBible).mockResolvedValue([]);

    vi.mocked(artworkService.getArtworks).mockResolvedValue([]);
    vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([]);
    vi.mocked(aiAgentsService.getWorkflowAvailability).mockResolvedValue({
      canRun: true,
      missing: [],
      workflows: [
        {
          workflowType: 'Artist',
          canRun: true,
          missing: [],
        },
      ],
    } as any);
    vi.mocked(aiAgentsService.getRun).mockResolvedValue({
      id: 'run-1',
      status: 'Succeeded',
      steps: [],
      suggestions: [],
    } as any);
    vi.mocked(computeFileSha256).mockResolvedValue('sha-1');
    vi.mocked(resolveArtworkUrl).mockImplementation((u: string) => `http://localhost${u}`);
    vi.mocked(toThumbnailUrl).mockImplementation(
      (u: string) => `${u}${u.includes('?') ? '&' : '?'}size=thumb`,
    );

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

    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      {
        id: 'panel-1',
        pageId: 'page-1',
        panelNumber: 1,
        boundingBox: '{"x": 10, "y": 10, "width": 80, "height": 35}',
        readingOrder: 1,
        createdAt: '2026-10-08T00:00:00Z',
      },
    ]);

    vi.mocked(panelService.getPanelById).mockResolvedValue({
      id: 'panel-1',
      pageId: 'page-1',
      panelNumber: 1,
      boundingBox: '{"x": 10, "y": 10, "width": 80, "height": 35}',
      readingOrder: 1,
      createdAt: '2026-10-08T00:00:00Z',
      sceneId: null,
      scriptLineIds: [],
    });

    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue([
      {
        id: 'scene-1',
        chapterId: 'chap-1',
        sceneNumber: 1,
        heading: 'Cổng thành',
        summary: 'Nhân vật xuất hiện',
        createdAt: '2026-10-08T00:00:00Z',
        scriptLinesCount: 1,
        pagesCount: 1,
      },
    ]);

    vi.mocked(scriptLineService.getSceneById).mockResolvedValue({
      id: 'scene-1',
      chapterId: 'chap-1',
      sceneNumber: 1,
      heading: 'Cổng thành',
      summary: 'Nhân vật xuất hiện',
      createdAt: '2026-10-08T00:00:00Z',
      scriptLinesCount: 1,
      pagesCount: 1,
      scriptLines: [
        {
          id: 'line-1',
          sceneId: 'scene-1',
          lineOrder: 1,
          dialogueText: 'Có ai ở đó không?',
          stageDirection: 'Gió thổi qua',
          speakerCharacterId: 'bible-char-1',
        } as any,
      ],
    } as any);

    vi.mocked(pageService.createPage).mockImplementation(async (_chapId, body) => ({
      id: `page-${body.pageNumber || 99}`,
      chapterId: 'chap-1',
      pageNumber: body.pageNumber || 1,
      layoutFormat: body.layoutFormat || 'StandardPage',
      widthPx: body.widthPx || 1200,
      heightPx: body.heightPx || 1800,
      dpi: body.dpi || 600,
      elementsCount: 0,
    }));
    vi.mocked(pageService.reorderPage).mockImplementation(async (pageId, newPageNumber) => ({
      id: pageId,
      chapterId: 'chap-1',
      pageNumber: newPageNumber,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    }));

    vi.mocked(frameTemplateService.getFrameTemplates).mockResolvedValue([]);
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 'series-1',
      stages: [
        { id: 'stg-1', name: 'Thumbnail', stageOrder: 2, isEnabled: true },
        { id: 'stg-2', name: 'Pencil', stageOrder: 3, isEnabled: true },
        { id: 'stg-3', name: 'Ink', stageOrder: 4, isEnabled: true },
        { id: 'stg-4', name: 'Color', stageOrder: 5, isEnabled: false },
      ] as any,
    } as any);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/artist']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistDeskView workspaceRole='ARTIST' />}
          />
        </Routes>
      </MemoryRouter>,
    );

  // Cột Chi tiết mặc định đóng; "Sửa bố cục" mặc định tắt
  const openDetails = async (tab?: string) => {
    fireEvent.click(await screen.findByTestId('toggle-details'));
    if (tab) fireEvent.click(await screen.findByTestId(tab));
  };
  const enableLayoutEdit = async () => {
    fireEvent.click(await screen.findByTestId('toggle-layout-edit'));
  };
  const openUploadMenu = async () => {
    fireEvent.click(await screen.findByTestId('upload-menu-btn'));
  };

  it('render bàn vẽ Artist và tải danh sách Chapter, Page, Panels thành công', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-main-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-page-context')).toHaveTextContent('Trang 1');
      expect(screen.getByTestId('panel-box-panel-1')).toBeInTheDocument();
    });

    expect(panelService.getPanelsByPage).toHaveBeenCalledWith('page-1');
  });

  it('mở modal Áp Dụng Mẫu Khung khi bấm nút Áp Dụng Mẫu Khung', async () => {
    renderComponent();
    await enableLayoutEdit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Áp Dụng Mẫu Khung/i })).toBeInTheDocument();
    });

    const openTemplateBtn = screen.getByRole('button', { name: /Áp Dụng Mẫu Khung/i });
    fireEvent.click(openTemplateBtn);

    await waitFor(() => {
      expect(frameTemplateService.getFrameTemplates).toHaveBeenCalledWith('ws-1');
    });
  });

  it('gọi panelService.createPanel khi bấm nút Thêm Panel', async () => {
    vi.mocked(panelService.createPanel).mockResolvedValueOnce({
      id: 'panel-2',
      pageId: 'page-1',
      panelNumber: 2,
      boundingBox: '{"x": 10, "y": 35, "width": 80, "height": 22}',
      readingOrder: 2,
      createdAt: '2026-10-08T00:00:00Z',
    });

    renderComponent();
    await enableLayoutEdit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm Panel/i })).toBeInTheDocument();
    });

    const addPanelBtn = screen.getByRole('button', { name: /Thêm Panel/i });
    fireEvent.click(addPanelBtn);

    await waitFor(() => {
      expect(panelService.createPanel).toHaveBeenCalledWith(
        'page-1',
        expect.objectContaining({ panelNumber: 2, readingOrder: 2 }),
      );
    });
  });

  it('parseBoundingBox ưu tiên normalized và tính chuẩn tỷ lệ phần trăm (Lỗi 2)', () => {
    // 1. Dạng normalized từ Frame Template
    const templateBox = JSON.stringify({
      x: 50,
      y: 100,
      width: 900,
      height: 600,
      unit: 'px',
      pageWidthPx: 1200,
      pageHeightPx: 1800,
      normalized: { x: 0.0417, y: 0.0556, w: 0.75, h: 0.3333 },
      borderless: true,
    });
    const parsed1 = parseBoundingBox(templateBox, 1200, 1800);
    expect(parsed1.percentX).toBeCloseTo(4.17, 1);
    expect(parsed1.percentW).toBe(75);
    expect(parsed1.borderless).toBe(true);

    // 2. Dạng px thuần túy
    const pxBox = JSON.stringify({
      x: 120,
      y: 180,
      width: 600,
      height: 360,
      unit: 'px',
    });
    const parsed2 = parseBoundingBox(pxBox, 1200, 1800);
    expect(parsed2.percentX).toBe(10);
    expect(parsed2.percentY).toBe(10);
    expect(parsed2.percentW).toBe(50);
    expect(parsed2.percentH).toBe(20);
  });

  it('hiển thị layer trên canvas và chuyển sang tab Lớp Vẽ & Layer Ảnh thành công', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('canvas-layer-elem-char-1')).toBeInTheDocument();
    });

    await openDetails('tab-layers');

    await waitFor(() => {
      expect(screen.getByTestId('layers-management-view')).toBeInTheDocument();
      expect(screen.getByTestId('layer-item-elem-char-1')).toBeInTheDocument();
      expect(screen.getByText('Kiếm Sĩ Ren')).toBeInTheDocument();
    });
  });

  it('danh sách layer hiển thị thumbnail thu nhỏ bằng toThumbnailUrl', async () => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-1',
      elements: [
        {
          elementId: 'elem-art-1',
          elementType: 'ARTWORK_LAYER',
          zIndex: 1,
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          assetId: 'art-layer-1',
          isRemoved: false,
        },
      ],
    } as any);

    vi.mocked(artworkService.getArtworks).mockResolvedValue([
      {
        id: 'art-layer-1',
        chapterId: 'chap-1',
        pageId: 'page-1',
        fileName: 'layer1.png',
        versionNumber: 1,
      } as any,
    ]);

    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValue({
      url: '/assets/download?token=layer-token',
      expiresAtUtc: new Date(Date.now() + 300_000).toISOString(),
    });

    renderComponent();

    await openDetails('tab-layers');

    await waitFor(() => {
      const img = screen.getByAltText('layer1.png');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'http://localhost/assets/download?token=layer-token&size=thumb',
      );
    });
  });

  it('tạo layer ảnh mới qua modal Thêm Layer Ảnh', async () => {
    vi.mocked(elementService.addElement).mockResolvedValueOnce({
      elementId: 'elem-bg-2',
      pageId: 'page-1',
      elementType: 'BACKGROUND',
      panelId: 'panel-1',
      rotation: 0,
      bibleEntryId: null,
      assetId: null,
      replayed: false,
    });

    renderComponent();

    await openDetails('tab-layers');

    await waitFor(() => {
      expect(screen.getByTestId('open-create-layer-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('open-create-layer-modal'));

    await waitFor(() => {
      expect(screen.getByTestId('create-layer-modal')).toBeInTheDocument();
    });

    // Chọn BACKGROUND
    fireEvent.change(screen.getByTestId('select-layer-type'), {
      target: { value: 'BACKGROUND' },
    });

    // Submit
    fireEvent.click(screen.getByTestId('submit-create-layer'));

    await waitFor(() => {
      expect(elementService.addElement).toHaveBeenCalledWith(
        'page-1',
        expect.objectContaining({
          elementType: 'BACKGROUND',
        }),
      );
    });
  });

  it('xoay layer và thay đổi thứ tự zIndex thành công', async () => {
    vi.mocked(elementService.moveElement).mockResolvedValue({
      message: 'OK',
    });

    renderComponent();

    await openDetails('tab-layers');

    await waitFor(() => {
      expect(screen.getByTestId('rotate-layer-elem-char-1')).toBeInTheDocument();
    });

    // Click xoay layer
    fireEvent.click(screen.getByTestId('rotate-layer-elem-char-1'));

    await waitFor(() => {
      expect(elementService.moveElement).toHaveBeenCalledWith(
        'page-1',
        'elem-char-1',
        expect.objectContaining({
          newRotation: 15,
        }),
      );
    });

    // Click tăng zIndex (layer up)
    fireEvent.click(screen.getByTestId('layer-up-elem-char-1'));

    await waitFor(() => {
      expect(elementService.moveElement).toHaveBeenCalledWith(
        'page-1',
        'elem-char-1',
        expect.objectContaining({
          newZIndex: 2,
        }),
      );
    });
  });

  it('xoá layer ảnh thành công', async () => {
    vi.mocked(elementService.removeElement).mockResolvedValue({
      message: 'OK',
      elementId: 'elem-char-1',
      canRestore: false,
    });

    renderComponent();

    await openDetails('tab-layers');

    await waitFor(() => {
      expect(screen.getByTestId('delete-layer-elem-char-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-layer-elem-char-1'));

    await waitFor(() => {
      expect(elementService.removeElement).toHaveBeenCalledWith('page-1', 'elem-char-1', 1);
    });
  });

  describe('tải ảnh theo panel (stageId)', () => {
    const inProgress = (over: Record<string, unknown> = {}) =>
      ({
        id: 'as-1',
        chapterId: 'chap-1',
        entityType: 'Panel',
        targetEntityId: 'panel-1',
        pipelineStageId: '3f2c9a52-1d6e-4b7a-9c11-0a5d8e7f1b22',
        status: 'InProgress',
        ...over,
      }) as any;

    it('gửi stageId là GUID của việc InProgress, không phải tên stage', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([inProgress()]);
      vi.mocked(artworkService.uploadArtwork).mockResolvedValue({ versionNumber: 1 } as any);
      const { container } = renderComponent();
      await openDetails();

      const btn = await screen.findByTestId('desk-upload-panel-btn-panel-1');
      await waitFor(() => expect(btn).not.toBeDisabled());
      fireEvent.click(btn);

      const file = new File(['x'], 'p1.png', { type: 'image/png' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() =>
        expect(artworkService.uploadArtwork).toHaveBeenCalledWith(
          'chap-1',
          'page-1',
          file,
          '3f2c9a52-1d6e-4b7a-9c11-0a5d8e7f1b22',
          'sha-1',
          undefined,
          'panel-1',
        ),
      );
    });

    it('khoá nút tải ảnh và nêu lý do khi không có việc InProgress', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([
        inProgress({ status: 'Assigned' }),
      ]);
      renderComponent();
      await openDetails();

      const btn = await screen.findByTestId('desk-upload-panel-btn-panel-1');
      expect(btn).toBeDisabled();
      expect(screen.getByTestId('desk-upload-panel-blocked')).toBeInTheDocument();
      fireEvent.click(btn);
      expect(artworkService.uploadArtwork).not.toHaveBeenCalled();
    });
  });

  describe('link xem artwork hết hạn', () => {
    const art = {
      id: 'art-1',
      pageId: 'page-1',
      panelId: 'panel-1',
      versionNumber: 1,
      fileName: 'p1.png',
      sizeBytes: 2048,
    } as any;
    const link = (token: string, ms: number) => ({
      url: `/api/assets/download?token=${token}`,
      expiresAtUtc: new Date(Date.now() + ms).toISOString(),
    });

    it('ảnh lỗi tải thì xin link mới một lần rồi mới bỏ cuộc', async () => {
      vi.mocked(artworkService.getArtworks).mockResolvedValue([art]);
      vi.mocked(artworkService.getArtworkAccessLink).mockImplementation(async () =>
        link('t', 5 * 60_000),
      );
      renderComponent();

      const img = await screen.findByAltText('Panel #1');
      expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(1);

      fireEvent.error(img);
      await waitFor(() => expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(2));

      fireEvent.error(screen.getByAltText('Panel #1'));
      await act(async () => {
        await Promise.resolve();
      });
      expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(2);
    });

    it('xin lại link sắp hết hạn khi trang để mở lâu', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        vi.mocked(artworkService.getArtworks).mockResolvedValue([art]);
        vi.mocked(artworkService.getArtworkAccessLink).mockImplementation(async () =>
          link('t', 10_000),
        );
        renderComponent();
        await waitFor(() => expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(1));

        await act(async () => {
          await vi.advanceTimersByTimeAsync(31_000);
        });
        expect(
          vi.mocked(artworkService.getArtworkAccessLink).mock.calls.length,
        ).toBeGreaterThanOrEqual(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('thanh công cụ chính & chế độ Sửa bố cục', () => {
    it('Ảnh hiển thị là dropdown riêng; công cụ bố cục chỉ hiện khi bật Sửa bố cục; toạ độ nằm trong Chi tiết', async () => {
      renderComponent();

      const stageSelect = await screen.findByTestId('desk-stage-select');
      await waitFor(() =>
        expect(
          within(stageSelect).getByRole('option', { name: /5\. Color \(đã tắt\)/i }),
        ).toBeInTheDocument(),
      );
      // Mặc định chế độ xem: không có thanh bố cục
      expect(screen.queryByTestId('panel-layout-toolbar')).not.toBeInTheDocument();

      await enableLayoutEdit();
      expect(screen.getByTestId('toggle-layout-edit')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('panel-layout-toolbar').className).not.toContain('bg-stone-900');

      fireEvent.click(await screen.findByTestId('panel-box-panel-1'));
      await openDetails();
      await waitFor(() => {
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Khung #1');
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Vị trí:');
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Kích thước:');
      });
    });
  });

  describe('Bàn Tải & Khớp Nét Panel Trực Quan (Giai đoạn 1 & 2)', () => {
    it('hiển thị đầy đủ không gian làm việc 3 cột: Kịch Bản & Tham Chiếu, Canvas Bàn Vẽ, và Inspector', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('artist-left-column')).toBeInTheDocument();
        expect(screen.getByTestId('panel-canvas')).toBeInTheDocument();
      });
      // Chi tiết mặc định đóng
      expect(screen.queryByTestId('artist-details')).not.toBeInTheDocument();

      // Chọn khung panel 1 để xem thông tin ở cả 3 cột
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);
      fireEvent.click(screen.getByTestId('left-tab-script'));
      await openDetails();

      await waitFor(() => {
        // Cột 1: Có nút tham chiếu Bible theo khung và selector phân cảnh
        expect(screen.getByTestId('panel-bible-reference-btn-panel-1')).toBeInTheDocument();
        expect(screen.getAllByText('Phân Cảnh (Scene)').length).toBeGreaterThan(0);
        // Cột 3: Có Inspector toạ độ và nút tải ảnh
        expect(screen.getByTestId('panel-artwork-desk-card')).toBeInTheDocument();
        expect(screen.getByTestId('desk-upload-panel-btn-panel-1')).toBeInTheDocument();
      });
    });

    it('hỗ trợ kéo thả file ảnh trực tiếp (Drop) vào ô khung panel trên Canvas', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([
        {
          id: 'as-1',
          chapterId: 'chap-1',
          entityType: 'Panel',
          targetEntityId: 'panel-1',
          pipelineStageId: 'stage-guid-lineart',
          status: 'InProgress',
        } as any,
      ]);
      vi.mocked(artworkService.uploadArtwork).mockResolvedValue({
        id: 'art-drop-1',
        chapterId: 'chap-1',
        pageId: 'page-1',
        panelId: 'panel-1',
        pipelineStageId: 'stage-guid-lineart',
        versionNumber: 2,
        fileName: 'dropped-sketch.png',
        fileSha256: 'dummy-sha256',
        sizeBytes: 1024,
        createdAtUtc: '2026-03-31T00:00:00Z',
      } as any);

      renderComponent();

      const panelBox = await screen.findByTestId('panel-box-panel-1');

      const mockFile = new File(['mock-image-content'], 'dropped-sketch.png', {
        type: 'image/png',
      });

      // Kéo vào ô khung
      fireEvent.dragOver(panelBox, {
        dataTransfer: { files: [mockFile] },
      });

      // Thả vào ô khung
      fireEvent.drop(panelBox, {
        dataTransfer: { files: [mockFile] },
      });

      await waitFor(() => {
        expect(artworkService.uploadArtwork).toHaveBeenCalledWith(
          'chap-1',
          'page-1',
          mockFile,
          'stage-guid-lineart',
          expect.any(String),
          undefined,
          'panel-1',
        );
      });
    });

    it('hỗ trợ dán ảnh từ Clipboard (Ctrl+V) khi đang chọn panel', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([
        {
          id: 'as-1',
          chapterId: 'chap-1',
          entityType: 'Panel',
          targetEntityId: 'panel-1',
          pipelineStageId: 'stage-guid-lineart',
          status: 'InProgress',
        } as any,
      ]);
      vi.mocked(artworkService.uploadArtwork).mockResolvedValue({
        id: 'art-paste-1',
        chapterId: 'chap-1',
        pageId: 'page-1',
        panelId: 'panel-1',
        pipelineStageId: 'stage-guid-lineart',
        versionNumber: 3,
        fileName: 'clipboard-image.png',
        fileSha256: 'dummy-sha256',
        sizeBytes: 2048,
        createdAtUtc: '2026-03-31T00:00:00Z',
      } as any);

      renderComponent();

      // Click chọn panel-1
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);

      const mockFile = new File(['clipboard-data'], 'clipboard-image.png', {
        type: 'image/png',
      });

      // Bắn sự kiện paste trên window
      fireEvent.paste(window, {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => mockFile,
            },
          ],
        },
      });

      await waitFor(() => {
        expect(artworkService.uploadArtwork).toHaveBeenCalledWith(
          'chap-1',
          'page-1',
          mockFile,
          'stage-guid-lineart',
          expect.any(String),
          undefined,
          'panel-1',
        );
      });
    });
  });

  describe('Bàn Tải & Khớp Nét Panel Trực Quan (Giai đoạn 3: Floating Toolbar & Assignment Gateway CTA)', () => {
    it('công cụ của khung đang chọn nằm trên thanh Sửa bố cục, không đè lên tranh', async () => {
      renderComponent();
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);
      expect(screen.queryByTestId('floating-split-v-panel-1')).not.toBeInTheDocument();

      await enableLayoutEdit();
      const bar = await screen.findByTestId('layout-edit-bar');
      expect(within(bar).getByTestId('floating-split-v-panel-1')).toBeInTheDocument();
      expect(within(bar).getByTestId('floating-split-h-panel-1')).toBeInTheDocument();
      expect(within(bar).getByTestId('floating-delete-panel-1')).toBeInTheDocument();
      expect(within(panelBox).queryByTestId('floating-delete-panel-1')).not.toBeInTheDocument();

      // Tham chiếu Bible qua menu Trang ⋯
      fireEvent.click(screen.getByTestId('page-menu-btn'));
      fireEvent.click(screen.getByTestId('artist-desk-bible-reference-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('bible-reference-drawer')).toBeInTheDocument();
      });
    });

    it('hiển thị Assignment Gateway CTA chủ động khi có việc Assigned và tự động startAssignment khi bấm nút', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockImplementation(
        async (_workspaceId, filter) => {
          if (filter?.status === 'Assigned') {
            return [
              {
                id: 'as-assigned-101',
                chapterId: 'chap-1',
                entityType: 'Panel',
                targetEntityId: 'panel-1',
                pipelineStageId: 'stage-guid-lineart',
                status: 'Assigned',
              } as any,
            ];
          }
          return [];
        },
      );
      vi.mocked(assignmentService.startAssignment).mockResolvedValue({
        id: 'as-assigned-101',
        status: 'InProgress',
      } as any);

      renderComponent();

      // Click chọn panel-1
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);

      // CTA chính trên toolbar là "Bắt đầu việc"; trạng thái việc hiện đúng dữ liệu
      await waitFor(() => {
        expect(screen.getByTestId('cta-start-work')).toHaveTextContent(/Bắt đầu việc/i);
      });
      expect(screen.getByTestId('artist-work-status')).toHaveTextContent('Được giao');
      await openDetails();

      // Cột Inspector hiển thị nút "Bắt đầu việc & Tải ảnh ngay" trong khối blocked
      await waitFor(() => {
        expect(screen.getByTestId('desk-upload-panel-blocked')).toBeInTheDocument();
        expect(screen.getByTestId('desk-start-and-upload-btn-panel-1')).toHaveTextContent(
          /Bắt đầu việc & tải ảnh/i,
        );
      });

      // Bấm nút CTA
      fireEvent.click(screen.getByTestId('desk-start-and-upload-btn-panel-1'));

      await waitFor(() => {
        expect(assignmentService.startAssignment).toHaveBeenCalledWith('chap-1', 'as-assigned-101');
      });
    });
  });

  describe('Bàn Tải & Khớp Nét Panel Trực Quan (Giai đoạn 4: Hỗ trợ 2 Chế Độ Tải & Chuẩn Hóa UX Copy)', () => {
    it('chuyển đổi giữa Chế độ Tải từng khung và Tải cả trang (Full-page Composite)', async () => {
      renderComponent();
      await openUploadMenu();

      // Kiểm tra sự xuất hiện của toggle chuyển chế độ
      await waitFor(() => {
        expect(screen.getByTestId('upload-mode-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('mode-panel-slice')).toBeInTheDocument();
        expect(screen.getByTestId('mode-full-page')).toBeInTheDocument();
      });

      // Mặc định ở chế độ tải từng khung, không có full-page-empty-banner
      expect(screen.queryByTestId('full-page-empty-banner')).not.toBeInTheDocument();

      // Chuyển sang chế độ Tải cả trang
      fireEvent.click(screen.getByTestId('mode-full-page'));

      // Xuất hiện banner hướng dẫn tải ảnh toàn trang
      await waitFor(() => {
        expect(screen.getByTestId('full-page-empty-banner')).toBeInTheDocument();
        expect(screen.getByTestId('desk-upload-page-btn')).toBeInTheDocument();
      });

      // Chuyển lại về chế độ Tải từng khung
      await openUploadMenu();
      fireEvent.click(screen.getByTestId('mode-panel-slice'));
      expect(screen.queryByTestId('full-page-empty-banner')).not.toBeInTheDocument();
    });

    it('khi artist chỉ có việc theo khung trên trang, ẩn nút tải ảnh cả trang và chỉ cho phép tải theo khung', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([
        {
          id: 'asg-panel-1',
          chapterId: 'chap-1',
          entityType: 'Panel',
          targetEntityId: 'panel-1',
          pipelineStageId: 'stage-guid-lineart',
          status: 'InProgress',
        } as any,
      ]);

      renderComponent();
      await openUploadMenu();

      // Trong menu chuyển chế độ tải, không có lựa chọn "Cả trang"
      await waitFor(() => {
        expect(screen.getByTestId('upload-mode-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('mode-panel-slice')).toBeInTheDocument();
        expect(screen.queryByTestId('mode-full-page')).not.toBeInTheDocument();
      });

      // Nút tải ảnh cả trang không hiển thị
      expect(screen.queryByTestId('desk-upload-page-btn')).not.toBeInTheDocument();
    });

    it('hiển thị backdrop layer khi trang đã có ảnh toàn trang và hỗ trợ tải ảnh trang', async () => {
      vi.mocked(artworkService.getArtworks).mockResolvedValue([
        {
          id: 'art-full-page-1',
          chapterId: 'chap-1',
          pageId: 'page-1',
          panelId: null, // Không gắn panelId -> Artwork của cả trang
          pipelineStageId: 'stage-guid-lineart',
          versionNumber: 1,
          storagePath: 'path/fullpage.png',
          fileName: 'full-page-sketch.png',
          fileSha256: 'sha-page-1',
          sizeBytes: 8192,
          createdAtUtc: '2026-03-31T00:00:00Z',
        } as any,
      ]);
      vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValue({
        url: '/api/assets/download?token=fullpage-token',
        expiresAtUtc: new Date(Date.now() + 300_000).toISOString(),
      });

      renderComponent();

      // Backdrop layer hiển thị trên canvas
      await waitFor(() => {
        expect(screen.getByTestId('canvas-full-page-backdrop')).toBeInTheDocument();
      });

      // Chế độ cả trang: tải/nhận diện nằm ở thanh workflow, không lặp CTA trên toolbar
      await openUploadMenu();
      fireEvent.click(screen.getByTestId('mode-full-page'));

      await waitFor(() => {
        expect(screen.getByTestId('workflow-new-version-btn')).toHaveTextContent(
          /Tải phiên bản mới/i,
        );
      });
      expect(screen.queryByTestId('cta-upload-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('page-artwork-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-detect-btn')).toBeInTheDocument();
    });

    it('khoá trang đã tách việc cho người khác khi artist đang giữ việc cả chương', async () => {
      vi.mocked(assignmentService.getMyAssignments).mockResolvedValue([
        {
          id: 'asg-chap-1',
          chapterId: 'chap-1',
          entityType: 'Chapter',
          targetEntityId: 'chap-1',
          pipelineStageId: 'stg-1',
          status: 'InProgress',
        } as any,
      ]);
      vi.mocked(assignmentService.getAssignments).mockResolvedValue([
        {
          id: 'asg-chap-1',
          chapterId: 'chap-1',
          entityType: 'Chapter',
          targetEntityId: 'chap-1',
          pipelineStageId: 'stg-1',
          status: 'InProgress',
          assigneeUserId: 'user-me',
        } as any,
        {
          id: 'asg-carved-page',
          chapterId: 'chap-1',
          entityType: 'Page',
          targetEntityId: 'page-1',
          pipelineStageId: 'stg-1',
          status: 'InProgress',
          assigneeUserId: 'user-other',
        } as any,
      ]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('carved-out-badge-page-1')).toBeInTheDocument();
        expect(screen.getByTestId('carved-out-page-banner')).toBeInTheDocument();
      });

      const toggleLayoutBtn = screen.getByTestId('toggle-layout-edit');
      expect(toggleLayoutBtn).toBeDisabled();
    });

    it('hỗ trợ kéo thả đổi thứ tự trang trong danh sách bên trái và tải lại danh sách', async () => {
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
        {
          id: 'page-2',
          chapterId: 'chap-1',
          pageNumber: 2,
          layoutFormat: 'StandardPage',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 0,
        },
      ]);

      renderComponent();

      const pageItem1 = await screen.findByTestId('page-item-1');
      const pageItem2 = await screen.findByTestId('page-item-2');
      expect(pageItem1).toBeInTheDocument();
      expect(pageItem2).toBeInTheDocument();

      fireEvent.dragStart(pageItem2, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'move',
        },
      });
      fireEvent.dragOver(pageItem1, {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: 'move' },
      });
      fireEvent.drop(pageItem1, {
        dataTransfer: {
          getData: () => 'page-2',
        },
      });

      await waitFor(() => {
        expect(pageService.reorderPage).toHaveBeenCalledWith('page-2', 1);
      });
    });

    it('bắt lỗi 409 Conflict khi đổi thứ tự trang vi phạm thứ tự cảnh', async () => {
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
        {
          id: 'page-2',
          chapterId: 'chap-1',
          pageNumber: 2,
          layoutFormat: 'StandardPage',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 0,
        },
      ]);
      const conflictError: any = new Error(
        'Không thể sắp xếp như vậy: trang 2 chứa khung của Cảnh 2 nhưng lại đứng sau khung của Cảnh 1.',
      );
      conflictError.status = 409;
      conflictError.code = 'CONFLICT';
      vi.mocked(pageService.reorderPage).mockRejectedValueOnce(conflictError);

      renderComponent();

      const pageItem1 = await screen.findByTestId('page-item-1');
      const pageItem2 = await screen.findByTestId('page-item-2');
      expect(pageItem1).toBeInTheDocument();
      expect(pageItem2).toBeInTheDocument();

      fireEvent.drop(pageItem1, {
        dataTransfer: {
          getData: () => 'page-2',
        },
      });

      await waitFor(() => {
        expect(pageService.reorderPage).toHaveBeenCalledWith('page-2', 1);
      });
    });

    it('chèn trang vào giữa các trang khi bấm nút insert "+"', async () => {
      vi.mocked(pageService.getPagesByChapter).mockResolvedValueOnce([
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
        {
          id: 'page-2',
          chapterId: 'chap-1',
          pageNumber: 2,
          layoutFormat: 'StandardPage',
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
          elementsCount: 0,
        },
      ]);

      renderComponent();

      const insertBtn = await screen.findByTestId('insert-page-after-1');
      expect(insertBtn).toBeInTheDocument();

      fireEvent.click(insertBtn);

      await waitFor(() => {
        expect(pageService.createPage).toHaveBeenCalledWith(
          'chap-1',
          expect.objectContaining({ pageNumber: 2 }),
        );
      });
    });
  });

  describe('Quy trình AI 2 bước (Mô tả vẽ & Sinh ảnh AI cho Panel)', () => {
    it('thanh công cụ hiển thị nút "Tạo mô tả vẽ (cả cảnh)"', async () => {
      renderComponent();

      const aiBtn = await screen.findByTestId('desk-open-ai-assist-btn');
      expect(aiBtn).toBeInTheDocument();
      expect(aiBtn).toHaveTextContent('Tạo mô tả vẽ (cả cảnh)');
    });

    it('nút Tự động phân bổ kịch bản trong tab Kịch bản hiển thị đúng', async () => {
      renderComponent();

      await screen.findByTestId('panel-canvas');
      fireEvent.click(screen.getByTestId('left-tab-script'));

      const autoAssignBtn = await screen.findByTestId('auto-assign-script-btn');
      expect(autoAssignBtn).toBeInTheDocument();
      expect(autoAssignBtn).toHaveTextContent('Tự động phân bổ kịch bản');
    });

    it('khi panel chưa có mô tả: hiển thị nút "Tạo mô tả vẽ (bước 1)"', async () => {
      vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([]);

      renderComponent();

      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);
      await openDetails();

      const step1Btn = await screen.findByTestId('desk-ai-thumbnail-btn-panel-1');
      expect(step1Btn).toBeInTheDocument();
      expect(step1Btn).toHaveTextContent('Tạo mô tả vẽ (bước 1)');
      expect(step1Btn).not.toBeDisabled();
    });

    it('khi panel có mô tả đang chờ duyệt (Pending): hiển thị nút "Chờ duyệt mô tả (bước 1)" có thể bấm để mở xem', async () => {
      vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([
        {
          id: 'sug-p1',
          runId: 'run-1',
          stepId: 'step-1',
          sceneId: 'scene-1',
          kind: 'ImagePrompt',
          status: 'Pending',
          summary: 'Prompt cho cảnh 1',
          payload: {
            schemaVersion: 1,
            runId: 'run-1',
            sceneId: 'scene-1',
            layoutRevisionId: 'rev-1',
            panels: [
              {
                panelId: 'panel-1',
                pageNumber: 1,
                panelNumber: 1,
                prompt: 'Một hiệp sĩ đứng trước cổng thành hoàng hôn rực rỡ',
                referenceIds: [],
              },
            ],
          },
          payloadHash: 'h1',
          baseChapterVersion: 1,
          bibleRevisionIds: [],
          hasBlockingFindings: false,
          createdAt: new Date().toISOString(),
          decisions: [],
        },
      ]);

      renderComponent();

      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);
      await openDetails();

      const pendingBtn = await screen.findByTestId('desk-ai-thumbnail-btn-panel-1');
      expect(pendingBtn).toBeInTheDocument();
      expect(pendingBtn).toHaveTextContent('Chờ duyệt mô tả (bước 1)');
      expect(pendingBtn).not.toBeDisabled();

      fireEvent.click(pendingBtn);
      const aiPanel = await screen.findByTestId('ai-assist-panel');
      expect(aiPanel).toBeInTheDocument();
    });

    it('khi panel đã có prompt được Accept: hiển thị xem trước prompt và nút "Sinh ảnh AI"', async () => {
      vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([
        {
          id: 'sug-p2',
          runId: 'run-2',
          stepId: 'step-2',
          sceneId: 'scene-1',
          kind: 'ImagePrompt',
          status: 'Accepted',
          summary: 'Prompt đã duyệt cho cảnh 1',
          payload: {
            schemaVersion: 1,
            runId: 'run-2',
            sceneId: 'scene-1',
            layoutRevisionId: 'rev-2',
            panels: [
              {
                panelId: 'panel-1',
                pageNumber: 1,
                panelNumber: 1,
                prompt: 'Một hiệp sĩ đứng trước cổng thành hoàng hôn rực rỡ',
                referenceIds: [],
              },
            ],
          },
          payloadHash: 'h2',
          baseChapterVersion: 1,
          bibleRevisionIds: [],
          hasBlockingFindings: false,
          createdAt: new Date().toISOString(),
          decisions: [],
        },
      ]);

      renderComponent();

      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);
      await openDetails();

      const preview = await screen.findByTestId('desk-panel-prompt-preview-panel-1');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveTextContent('Một hiệp sĩ đứng trước cổng thành hoàng hôn rực rỡ');

      const genBtn = await screen.findByTestId('desk-ai-thumbnail-btn-panel-1');
      expect(genBtn).toBeInTheDocument();
      expect(genBtn).toHaveTextContent('Sinh ảnh AI');
      expect(genBtn).not.toBeDisabled();
    });

    it('chỉ hiển thị nhiệm vụ thuộc vai trò Artist trong Hàng Đợi Công Việc, loại bỏ các nhiệm vụ khác vai trò như Script/Writer', async () => {
      vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
        id: 'pipe-1',
        seriesId: 'series-1',
        stages: [
          { id: 'stg-script', name: 'Script', stageOrder: 1, allowedRole: 'Writer', isEnabled: true },
          { id: 'stg-thumb', name: 'Thumbnail', stageOrder: 2, allowedRole: 'Artist', isEnabled: true },
        ],
      } as any);

      vi.mocked(assignmentService.getAssignments).mockResolvedValue([
        {
          id: 'asg-writer-1',
          chapterId: 'chap-1',
          entityType: 'Chapter',
          targetEntityId: 'chap-1',
          pipelineStageId: 'stg-script',
          assignedRole: 'Writer',
          brief: 'Hoàn Thành công việc kịch bản cho chương 1 đi',
          status: 'InProgress',
          dueDate: '2026-11-10T00:00:00Z',
        } as any,
        {
          id: 'asg-artist-1',
          chapterId: 'chap-1',
          entityType: 'Chapter',
          targetEntityId: 'chap-1',
          pipelineStageId: 'stg-thumb',
          assignedRole: 'Artist',
          brief: 'Hãy vẽ Thumbnail đi',
          status: 'InProgress',
          dueDate: '2026-11-17T00:00:00Z',
        } as any,
      ]);

      renderComponent();

      // Nút mở hàng đợi chỉ đếm 1 nhiệm vụ của Artist (thay vì 2)
      await waitFor(() => {
        expect(screen.getByTestId('left-open-queue')).toHaveTextContent('Nhiệm vụ chương (1)');
      });
      const queueBtn = screen.getByTestId('left-open-queue');

      // Mở Hàng Đợi Công Việc
      fireEvent.click(queueBtn);

      await waitFor(() => {
        expect(screen.getByText('Hàng Đợi Công Việc')).toBeInTheDocument();
      });

      // Nhiệm vụ của Artist phải hiển thị
      expect(screen.getByText('Hãy vẽ Thumbnail đi')).toBeInTheDocument();

      // Nhiệm vụ của Writer (Script) phải bị lọc bỏ, không hiển thị
      expect(screen.queryByText('Hoàn Thành công việc kịch bản cho chương 1 đi')).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
import { artworkService, computeFileSha256, resolveArtworkUrl } from '@/services/artwork.service';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';

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
    vi.mocked(computeFileSha256).mockResolvedValue('sha-1');
    vi.mocked(resolveArtworkUrl).mockImplementation((u: string) => `http://localhost${u}`);

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

  it('render bàn vẽ Artist và tải danh sách Chapter, Page, Panels thành công', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Bàn Vẽ & Bố Cục Khung Tranh Manga/i)).toBeInTheDocument();
      expect(screen.getByText('Panel #1')).toBeInTheDocument();
    });

    expect(panelService.getPanelsByPage).toHaveBeenCalledWith('page-1');
  });

  it('mở modal Áp Dụng Mẫu Khung khi bấm nút Áp Dụng Mẫu Khung', async () => {
    renderComponent();

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

    const tabLayersBtn = screen.getByTestId('tab-layers');
    fireEvent.click(tabLayersBtn);

    await waitFor(() => {
      expect(screen.getByTestId('layers-management-view')).toBeInTheDocument();
      expect(screen.getByTestId('layer-item-elem-char-1')).toBeInTheDocument();
      expect(screen.getByText('Kiếm Sĩ Ren')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByTestId('tab-layers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-layers'));

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

    await waitFor(() => {
      expect(screen.getByTestId('tab-layers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-layers'));

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

    await waitFor(() => {
      expect(screen.getByTestId('tab-layers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-layers'));

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

  describe('thanh điều khiển canvas mới (role Artist)', () => {
    it('hiển thị thanh điều khiển nền sáng, segmented control công đoạn và toạ độ khung', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('panel-layout-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('desk-stage-switcher')).toBeInTheDocument();
        expect(screen.getByTestId('panel-readout')).toBeInTheDocument();
      });

      // Kiểm tra thanh không dùng nền đen
      expect(screen.getByTestId('panel-layout-toolbar').className).not.toContain('bg-stone-900');
      expect(screen.getByTestId('panel-readout').className).not.toContain('bg-stone-900');

      // Click chọn panel-1 trên canvas
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);

      // Thẻ readout hiển thị Khung #1 và thông số toạ độ
      await waitFor(() => {
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Khung #1');
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Vị trí:');
        expect(screen.getByTestId('panel-readout')).toHaveTextContent('Kích thước:');
      });

      // Stage switcher có nút công đoạn tắt kèm lock icon
      expect(screen.getByRole('button', { name: /5\. Color đã tắt/i })).toBeInTheDocument();
    });
  });

  describe('Bàn Tải & Khớp Nét Panel Trực Quan (Giai đoạn 1 & 2)', () => {
    it('hiển thị đầy đủ không gian làm việc 3 cột: Kịch Bản & Tham Chiếu, Canvas Bàn Vẽ, và Inspector', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Kịch Bản & Tham Chiếu')).toBeInTheDocument();
        expect(screen.getByTestId('panel-canvas')).toBeInTheDocument();
        expect(screen.getByTestId('tab-panel')).toBeInTheDocument();
      });

      // Chọn khung panel 1 để xem thông tin ở cả 3 cột
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);

      await waitFor(() => {
        // Cột 1: Có nút tham chiếu Bible theo khung và selector phân cảnh
        expect(screen.getByTestId('panel-bible-reference-btn-panel-1')).toBeInTheDocument();
        expect(screen.getByText('Phân Cảnh (Scene)')).toBeInTheDocument();
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
    it('hiển thị thanh Floating Toolbar trên Panel đang chọn với đầy đủ các nút thao tác nhanh', async () => {
      renderComponent();

      // Click chọn panel-1 trên canvas
      const panelBox = await screen.findByTestId('panel-box-panel-1');
      fireEvent.click(panelBox);

      // Floating toolbar xuất hiện
      await waitFor(() => {
        expect(screen.getByTestId('floating-toolbar-panel-1')).toBeInTheDocument();
        expect(screen.getByTestId('floating-upload-panel-1')).toBeInTheDocument();
        expect(screen.getByTestId('floating-bible-panel-1')).toBeInTheDocument();
        expect(screen.getByTestId('floating-split-v-panel-1')).toBeInTheDocument();
        expect(screen.getByTestId('floating-split-h-panel-1')).toBeInTheDocument();
        expect(screen.getByTestId('floating-delete-panel-1')).toBeInTheDocument();
      });

      // Bấm nút Bible trên toolbar để mở Drawer
      fireEvent.click(screen.getByTestId('floating-bible-panel-1'));
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

      // Floating toolbar hiển thị nút "Bắt đầu & Tải"
      await waitFor(() => {
        expect(screen.getByTestId('floating-start-upload-panel-1')).toHaveTextContent(
          /Bắt đầu & Tải/i,
        );
      });

      // Cột Inspector hiển thị nút "Bắt đầu việc & Tải ảnh ngay" trong khối blocked
      await waitFor(() => {
        expect(screen.getByTestId('desk-upload-panel-blocked')).toBeInTheDocument();
        expect(screen.getByTestId('desk-start-and-upload-btn-panel-1')).toHaveTextContent(
          /Bắt đầu việc & Tải ảnh ngay/i,
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
      fireEvent.click(screen.getByTestId('mode-panel-slice'));
      expect(screen.queryByTestId('full-page-empty-banner')).not.toBeInTheDocument();
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

      // Chuyển sang chế độ cả trang để thấy nút Đổi ảnh trang
      fireEvent.click(screen.getByTestId('mode-full-page'));

      await waitFor(() => {
        expect(screen.getByTestId('desk-upload-page-btn')).toHaveTextContent(/Đổi ảnh trang/i);
      });
    });
  });
});


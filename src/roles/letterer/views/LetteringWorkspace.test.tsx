import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  createEvent,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LetteringWorkspace } from './LetteringWorkspace';
import { elementService } from '@/services/element.service';
import { pageService } from '@/services/page.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { chapterService } from '@/services/chapter.service';
import { aiAgentsService } from '@/services/aiAgents.service';
import { panelService } from '@/services/panel.service';
import { artworkService } from '@/services/artwork.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';

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
vi.mock('@/services/page.service');
vi.mock('@/services/scriptLine.service');
vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChapterById: vi.fn(),
  },
}));
vi.mock('@/services/aiAgents.service', () => ({
  aiAgentsService: {
    runWorkflow: vi.fn(),
    getRun: vi.fn(),
    getSuggestions: vi.fn(),
    review: vi.fn(),
  },
}));
vi.mock('@/services/panel.service');
vi.mock('@/services/artwork.service');
vi.mock('@/shared/utils/compositePageRenderer', () => ({
  buildPageComposite: vi.fn(),
}));
vi.mock('@/services/offlineQueue.service', () => ({
  offlineQueueService: {
    enqueue: vi.fn(),
    getState: vi.fn(() => ({
      isOnline: true,
      pendingCount: 0,
      isSyncing: false,
      lastSyncAt: null,
      items: [],
    })),
    subscribe: vi.fn(() => () => {}),
    flushQueue: vi.fn(async () => ({ succeeded: 0, failed: 0 })),
  },
}));

describe('LetteringWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([]);
    vi.mocked(artworkService.getArtworks).mockResolvedValue([]);
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValue({
      url: 'https://example.com/art.png',
      expiresAtUtc: '2026-10-14T12:00:00Z',
    });
    vi.mocked(buildPageComposite).mockImplementation(async (input) => {
      if (!input.artworks || input.artworks.length === 0) {
        return {
          dataUrl: '',
          failedImages: 0,
          mode: 'empty',
        };
      }
      return {
        dataUrl: 'data:image/png;base64,mockBackdrop',
        mode: 'panels',
        failedImages: 0,
      };
    });

    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({
      pageId: 'page-101',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'elem-1',
          elementType: 'SPEECH_BALLOON',
          zIndex: 1,
          x: 25,
          y: 25,
          width: 30,
          height: 20,
          content: 'Lời thoại ban đầu',
          isRemoved: false,
          version: 1,
          scriptLineId: 'line-1',
          readingOrder: 1,
        },
      ],
    });

    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue([
      {
        id: 'scene-1',
        chapterId: 'chap-1',
        sceneNumber: 1,
        heading: 'Cảnh 1',
        summary: 'Tóm tắt',
        createdAt: '2026-10-08T00:00:00Z',
        scriptLinesCount: 1,
        pagesCount: 1,
      },
    ]);

    vi.mocked(scriptLineService.getSceneById).mockResolvedValue({
      id: 'scene-1',
      chapterId: 'chap-1',
      sceneNumber: 1,
      createdAt: '2026-10-08T00:00:00Z',
      scriptLines: [
        {
          id: 'line-1',
          lineOrder: 1,
          dialogueText: 'Chào bạn!',
        },
      ],
    });

    vi.mocked(pageService.getPageById).mockResolvedValue({
      id: 'page-101',
      chapterId: 'chap-1',
      pageNumber: 1,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      version: 1,
      activeElementsCount: 1,
    });
  });

  const renderComponent = (props = {}) =>
    render(
      <MemoryRouter>
        <LetteringWorkspace pageId='page-101' chapterId='chap-1' {...props} />
      </MemoryRouter>,
    );

  // Chọn bóng thoại trên trang rồi sửa chữ ở ô "Nội dung chữ" (bảng thuộc tính); chữ chỉ được lưu khi rời ô.
  const editSelectedText = async (current: string, next: string) => {
    fireEvent.click(await screen.findByText(current));
    const editor = await screen.findByTestId('element-text-editor');
    fireEvent.change(editor, { target: { value: next } });
    fireEvent.blur(editor);
  };

  it('tải và hiển thị danh sách element và script lines từ API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(elementService.getPageSnapshot).toHaveBeenCalledWith('page-101');
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
      expect(screen.getByText('Chào bạn!')).toBeInTheDocument();
    });
  });

  it('gọi elementService.addElement khi click lên canvas với clientElementId', async () => {
    vi.mocked(elementService.addElement).mockResolvedValueOnce({
      elementId: 'elem-new',
      pageId: 'page-101',
      elementType: 'SPEECH_BALLOON',
    });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    // Click canvas viewport
    const canvas = container.querySelector('.cursor-crosshair');
    expect(canvas).not.toBeNull();
    fireEvent.click(canvas!);

    await waitFor(() => {
      expect(elementService.addElement).toHaveBeenCalledWith(
        'page-101',
        expect.objectContaining({
          elementType: 'SPEECH_BALLOON',
          clientElementId: expect.any(String),
        }),
      );
    });
  });

  it('mở ElementConflictModal khi gặp lỗi ELEMENT_VERSION_CONFLICT (BR-11)', async () => {
    const conflictError: any = new Error('Xung đột phiên bản');
    conflictError.conflict = 'ELEMENT_VERSION_CONFLICT';
    conflictError.code = 'CONFLICT';
    conflictError.status = 409;
    vi.mocked(elementService.updateElementText).mockRejectedValueOnce(conflictError);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    await editSelectedText('Lời thoại ban đầu', 'Lời thoại mới sửa');

    await waitFor(() => {
      expect(screen.getByText(/Xung Đột Phiên Bản Phần Tử/i)).toBeInTheDocument();
    });
  });

  it('chương đã duyệt (409 CHAPTER_READ_ONLY, BR-12): báo chỉ đọc, không mở hộp thoại xung đột', async () => {
    const readOnlyError: any = new Error(
      'Chương đang ở trạng thái Approved, nội dung chỉ đọc (BR-12).',
    );
    readOnlyError.code = 'CHAPTER_READ_ONLY';
    readOnlyError.status = 409;
    vi.mocked(elementService.updateElementText).mockRejectedValueOnce(readOnlyError);
    const onShowToast = vi.fn();

    renderComponent({ onShowToast });
    await screen.findByText('Lời thoại ban đầu');
    await editSelectedText('Lời thoại ban đầu', 'Lời thoại mới sửa');

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith('Chương chỉ đọc', readOnlyError.message);
    });
    expect(screen.queryByText(/Xung Đột Phiên Bản Phần Tử/i)).not.toBeInTheDocument();
  });

  it('lưu vào offlineQueueService khi mất mạng ngoại tuyến (NFR-09)', async () => {
    // Giả lập offline
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    const canvas = container.querySelector('.cursor-crosshair');
    fireEvent.click(canvas!);

    await waitFor(() => {
      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_ELEMENT',
          endpoint: '/pages/page-101/elements',
        }),
      );
    });

    Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
  });

  it('tạo balloon mới gửi kích thước px chuẩn (width=280, height=160) lên máy chủ (Lỗi 1)', async () => {
    vi.mocked(elementService.addElement).mockResolvedValueOnce({
      elementId: 'elem-new',
      pageId: 'page-101',
      elementType: 'SPEECH_BALLOON',
      scriptLineId: null,
      speakerId: null,
    });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    const canvas = container.querySelector('.cursor-crosshair');
    fireEvent.click(canvas!);

    await waitFor(() => {
      expect(elementService.addElement).toHaveBeenCalledWith(
        'page-101',
        expect.objectContaining({
          width: 280,
          height: 160,
        }),
      );
    });
  });

  it('hiển thị layer ảnh bên dưới balloon và không hiển thị textarea nhập liệu', async () => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValueOnce({
      pageId: 'page-101',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'elem-bg-1',
          elementType: 'BACKGROUND',
          zIndex: 1,
          x: 0,
          y: 0,
          width: 1200,
          height: 1800,
          content: 'https://example.com/bg.png',
          isRemoved: false,
          version: 1,
          rotation: 0,
        },
        {
          elementId: 'elem-char-instance',
          elementType: 'CHARACTER_INSTANCE',
          zIndex: 2,
          x: 100,
          y: 200,
          width: 400,
          height: 600,
          content: null,
          isRemoved: false,
          version: 1,
          rotation: 15,
        },
        {
          elementId: 'elem-balloon-1',
          elementType: 'SPEECH_BALLOON',
          zIndex: 10,
          x: 200,
          y: 100,
          width: 280,
          height: 160,
          content: 'Thoại trên layer',
          isRemoved: false,
          version: 1,
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('letterer-image-layer-elem-bg-1')).toBeInTheDocument();
      expect(screen.getByTestId('letterer-image-layer-elem-char-instance')).toBeInTheDocument();
      expect(screen.getByText('Thoại trên layer')).toBeInTheDocument();
    });

    // Layer ảnh không có textarea
    const bgElem = screen.getByTestId('letterer-image-layer-elem-bg-1');
    expect(bgElem.querySelector('textarea')).toBeNull();
  });

  it('bật tắt bộ lọc lớp vẽ (Layers) ẩn hiện layer tương ứng (CF2 2.5)', async () => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValueOnce({
      pageId: 'page-101',
      version: 1,
      pageNumber: 1,
      elements: [
        {
          elementId: 'elem-bg-1',
          elementType: 'BACKGROUND',
          zIndex: 1,
          x: 0,
          y: 0,
          width: 1200,
          height: 1800,
          content: 'https://example.com/bg.png',
          isRemoved: false,
          version: 1,
          rotation: 0,
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('letterer-image-layer-elem-bg-1')).toBeInTheDocument();
    });

    // Mở menu Lớp vẽ
    const layerBtn = screen.getByRole('button', { name: /Lớp vẽ/i });
    fireEvent.click(layerBtn);

    // Bấm ẩn Bối cảnh
    const bgToggle = screen.getByRole('button', { name: /Bối cảnh/i });
    fireEvent.click(bgToggle);

    // Layer ảnh bị ẩn khỏi DOM
    expect(screen.queryByTestId('letterer-image-layer-elem-bg-1')).toBeNull();
  });

  it('chạy Letterer Agent và hiển thị modal đề xuất rút gọn thoại (CF2 2.4)', async () => {
    const onShowToast = vi.fn();

    vi.mocked(chapterService.getChapterById).mockResolvedValue({
      id: 'chap-1',
      versionVector: 2,
    } as any);

    vi.mocked(aiAgentsService.runWorkflow).mockResolvedValue({
      runId: 'run-ai-1',
      status: 'Completed',
      provider: 'Gemini',
      model: 'gemini-1.5-pro',
    });

    vi.mocked(aiAgentsService.getRun).mockResolvedValue({
      id: 'run-ai-1',
      status: 'Completed',
    } as any);

    vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([
      {
        id: 'sug-1',
        runId: 'run-ai-1',
        kind: 'Lettering',
        status: 'Pending',
        payload: {
          suggestions: [
            {
              sourceScriptLineId: 'line-1',
              targetElementId: 'elem-1',
              originalText: 'Lời thoại ban đầu quá dài dòng và vượt kích thước',
              suggestedText: 'Thoại gọn hơn',
              reason: 'Rút ngắn vừa balloon',
              maxChars: 20,
              limitSource: 'element-estimate',
              withinEstimatedLimit: true,
            },
          ],
        },
      } as any,
    ]);

    renderComponent({ seriesId: 'ser-1', onShowToast });

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    // Bấm nút AI Rút Gọn Thoại trên toolbar
    const aiBtn = screen.getByRole('button', { name: /AI Rút Gọn Thoại/i });
    fireEvent.click(aiBtn);

    await waitFor(
      () => {
        expect(aiAgentsService.runWorkflow).toHaveBeenCalledWith(
          'ser-1',
          expect.objectContaining({
            workflowType: 'Letterer',
            chapterId: 'chap-1',
          }),
        );
        expect(screen.getByText(/Đề Xuất Rút Gọn Thoại/i)).toBeInTheDocument();
        expect(screen.getByText(/Thoại gọn hơn/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Bấm "Áp dụng vào bóng thoại này"
    const applyBtn = screen.getByRole('button', { name: /Áp dụng vào bóng thoại này/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(elementService.updateElementText).toHaveBeenCalledWith(
        'page-101',
        'elem-1',
        expect.objectContaining({
          content: 'Thoại gọn hơn',
        }),
      );
    });
  });

  it('hiển thị ảnh nền trang truyện (letterer-page-backdrop) khi trang có artwork', async () => {
    vi.mocked(panelService.getPanelsByPage).mockResolvedValueOnce([
      {
        id: 'panel-1',
        pageId: 'page-101',
        panelNumber: 1,
        readingOrder: 1,
        boundingBox: JSON.stringify({ x: 0, y: 0, width: 600, height: 800 }),
        createdAt: '2026-10-14T10:00:00Z',
      },
    ]);
    vi.mocked(artworkService.getArtworks).mockResolvedValueOnce([
      {
        id: 'art-1',
        chapterId: 'chap-1',
        pageId: 'page-101',
        panelId: 'panel-1',
        pipelineStageId: 'stage-1',
        versionNumber: 1,
        createdAt: '2026-10-14T10:00:00Z',
        fileName: 'art.png',
        assetId: 'asset-1',
      } as any,
    ]);
    vi.mocked(buildPageComposite).mockResolvedValueOnce({
      dataUrl: 'data:image/png;base64,sampleBackdropData',
      failedImages: 0,
      mode: 'panels',
    });

    renderComponent();

    await waitFor(() => {
      const backdrop = screen.getByTestId('letterer-page-backdrop');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute('src', 'data:image/png;base64,sampleBackdropData');
    });
  });

  it('không hiển thị ảnh nền khi trang chưa có artwork', async () => {
    vi.mocked(panelService.getPanelsByPage).mockResolvedValueOnce([]);
    vi.mocked(artworkService.getArtworks).mockResolvedValueOnce([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lời thoại ban đầu')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('letterer-page-backdrop')).toBeNull();
  });

  describe('zoom / pan / bố cục', () => {
    const percent = () => screen.getByTestId('zoom-percent').textContent;

    it('lăn chuột zoom quanh con trỏ và chặn cuộn trang; zoom/pan không gọi API lưu', async () => {
      renderComponent();
      await screen.findByText('Lời thoại ban đầu');
      const viewport = screen.getByTestId('letterer-viewport');
      const before = percent();

      // fireEvent trả false khi handler đã gọi preventDefault (chặn cuộn trang)
      const notPrevented = fireEvent.wheel(viewport, { deltaY: -120, clientX: 50, clientY: 50 });
      expect(notPrevented).toBe(false);
      await waitFor(() => expect(percent()).not.toBe(before));

      fireEvent.click(screen.getByTestId('tool-hand'));
      fireEvent.pointerDown(viewport, { button: 0, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(window, { clientX: 80, clientY: 60 });
      fireEvent.pointerUp(window, { clientX: 80, clientY: 60 });

      expect(elementService.addElement).not.toHaveBeenCalled();
      expect(elementService.moveElement).not.toHaveBeenCalled();
      expect(elementService.updateElementText).not.toHaveBeenCalled();
      expect(offlineQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('wheel trên ô nhập chữ không bị canvas nuốt (vẫn cuộn được trong ô)', async () => {
      renderComponent();
      fireEvent.click(await screen.findByText('Lời thoại ban đầu'));
      const editor = await screen.findByTestId('element-text-editor');
      const notPrevented = fireEvent.wheel(editor, { deltaY: 100 });
      expect(notPrevented).toBe(true);
    });

    it('đổi kích thước viewport (thu/mở bảng): giữ tâm khi đã zoom/pan, vừa lại khi đang Vừa trang', async () => {
      let roCallback: ResizeObserverCallback | undefined;
      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          roCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', MockResizeObserver);
      try {
        renderComponent();
        await screen.findByText('Lời thoại ban đầu');
        const resizeTo = (width: number, height: number) =>
          act(() => {
            roCallback!(
              [{ contentRect: { width, height } } as ResizeObserverEntry],
              {} as ResizeObserver,
            );
          });
        const translateOf = () => {
          const raw = screen.getByTestId('letterer-stage').style.transform;
          const nums = (raw.match(/-?[0-9]+(?:[.][0-9]+)?(?:e-?[0-9]+)?/g) ?? []).map(Number);
          return { tx: nums[0], ty: nums[1], scale: nums[2] };
        };

        // Lần đo đầu: tự Vừa trang
        resizeTo(900, 600);
        const fit1 = translateOf();
        expect(fit1.scale).toBeCloseTo(Math.min(852 / 1200, 552 / 1800), 4);

        // Đã zoom 100% (không còn ở chế độ vừa trang): viewport rộng thêm 300px → tranh dời đúng 150px, không lệch
        fireEvent.click(screen.getByTestId('zoom-percent'));
        const before = translateOf();
        expect(before.scale).toBe(1);
        resizeTo(1200, 600);
        const after = translateOf();
        expect(after.scale).toBe(1);
        expect(after.tx - before.tx).toBeCloseTo(150, 6);
        expect(after.ty).toBeCloseTo(before.ty, 6);

        // Đang ở Vừa trang: đổi kích thước thì vừa lại và căn giữa theo viewport mới
        fireEvent.click(screen.getByTestId('fit-page'));
        resizeTo(1500, 600);
        const refit = translateOf();
        expect(refit.tx).toBeCloseTo((1500 - 1200 * refit.scale) / 2, 4);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('nút zoom giữ trong 10%–400% và nút Vừa trang / 100% hoạt động', async () => {
      renderComponent();
      await screen.findByText('Lời thoại ban đầu');
      for (let i = 0; i < 30; i += 1) fireEvent.click(screen.getByLabelText('Phóng to'));
      await waitFor(() => expect(percent()).toBe('400%'));
      for (let i = 0; i < 60; i += 1) fireEvent.click(screen.getByLabelText('Thu nhỏ'));
      await waitFor(() => expect(percent()).toBe('10%'));
      fireEvent.click(screen.getByTestId('fit-page'));
      fireEvent.click(screen.getByText('100%', { selector: 'button[title^="Kích thước thật"]' }));
      await waitFor(() => expect(percent()).toBe('100%'));
    });

    it('phím tắt không chạy khi đang nhập chữ', async () => {
      renderComponent();
      fireEvent.click(await screen.findByText('Lời thoại ban đầu'));
      const editor = await screen.findByTestId('element-text-editor');
      const before = percent();
      fireEvent.keyDown(editor, { key: '+' });
      fireEvent.keyDown(editor, { key: 'h' });
      expect(percent()).toBe(before);
      expect(screen.getByTestId('tool-hand')).toHaveAttribute('aria-pressed', 'false');
      // Ngoài ô nhập thì phím tắt hoạt động
      fireEvent.keyDown(window, { key: 'h' });
      await waitFor(() =>
        expect(screen.getByTestId('tool-hand')).toHaveAttribute('aria-pressed', 'true'),
      );
    });

    it('thu/mở bảng kịch bản, bảng thuộc tính và chế độ tập trung', async () => {
      renderComponent();
      await screen.findByText('Lời thoại ban đầu');
      expect(screen.getByTestId('left-panel')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-left-panel'));
      expect(screen.queryByTestId('left-panel')).toBeNull();
      fireEvent.click(screen.getByTestId('toggle-left-panel'));
      expect(screen.getByTestId('left-panel')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-focus-mode'));
      expect(screen.queryByTestId('left-panel')).toBeNull();
      expect(screen.queryByTestId('right-panel')).toBeNull();
      expect(screen.getByTestId('lettering-workspace')).toHaveAttribute('data-focus-mode', 'true');
      // Esc thoát chế độ tập trung
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => expect(screen.getByTestId('right-panel')).toBeInTheDocument());
    });

    it('tạm ẩn lớp chữ để xem tranh gốc (chỉ hiển thị)', async () => {
      renderComponent();
      const balloon = (await screen.findByText('Lời thoại ban đầu')).closest(
        '[data-testid="letterer-element-elem-1"]',
      ) as HTMLElement;
      expect(balloon.style.visibility).toBe('visible');
      fireEvent.click(screen.getByTestId('toggle-hide-lettering'));
      expect(balloon.style.visibility).toBe('hidden');
      expect(elementService.updateElementText).not.toHaveBeenCalled();
    });

    it('vẽ ranh giới khung (panel) làm đường căn chỉnh khi trang có dữ liệu khung', async () => {
      vi.mocked(panelService.getPanelsByPage).mockResolvedValueOnce([
        {
          id: 'panel-9',
          pageId: 'page-101',
          panelNumber: 1,
          readingOrder: 1,
          boundingBox: JSON.stringify({ x: 100, y: 100, width: 600, height: 800, unit: 'px' }),
          createdAt: '2026-10-14T10:00:00Z',
        },
      ]);
      renderComponent();
      expect(await screen.findByTestId('guide-panel-panel-9')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('toggle-guides'));
      expect(screen.queryByTestId('letterer-guides')).toBeNull();
    });
  });

  describe('đặt chữ', () => {
    it('bóng thoại chỉ hiển thị chữ, không có điều khiển nhập liệu; bấm đúp mới sửa tại chỗ', async () => {
      const { container } = renderComponent();
      await screen.findByText('Lời thoại ban đầu');
      expect(container.querySelector('.speech-balloon textarea')).toBeNull();

      fireEvent.doubleClick(screen.getByText('Lời thoại ban đầu'));
      expect(await screen.findByTestId('inline-editor-elem-1')).toBeInTheDocument();
    });

    it('chữ chỉ được lưu khi rời ô, không gửi request cho từng phím gõ', async () => {
      renderComponent();
      fireEvent.click(await screen.findByText('Lời thoại ban đầu'));
      const editor = await screen.findByTestId('element-text-editor');
      fireEvent.change(editor, { target: { value: 'Lời thoại mới' } });
      fireEvent.change(editor, { target: { value: 'Lời thoại mới sửa tiếp' } });
      expect(elementService.updateElementText).not.toHaveBeenCalled();
      fireEvent.blur(editor);
      await waitFor(() => {
        expect(elementService.updateElementText).toHaveBeenCalledTimes(1);
        expect(elementService.updateElementText).toHaveBeenCalledWith(
          'page-101',
          'elem-1',
          expect.objectContaining({ content: 'Lời thoại mới sửa tiếp', expectedElementVersion: 1 }),
        );
      });
    });

    it('dòng Người dẫn truyện được đề xuất hộp dẫn truyện khi đặt lên trang', async () => {
      vi.mocked(elementService.addElement).mockResolvedValueOnce({
        elementId: 'elem-narr',
        pageId: 'page-101',
        elementType: 'NARRATION_BOX',
      });
      renderComponent();
      await screen.findByText('Lời thoại ban đầu');
      // line-1 không có người nói → dẫn truyện
      fireEvent.click(await screen.findByText('Chào bạn!'));
      fireEvent.click(screen.getByTestId('letterer-viewport'), { clientX: 400, clientY: 400 });
      await waitFor(() =>
        expect(elementService.addElement).toHaveBeenCalledWith(
          'page-101',
          expect.objectContaining({ elementType: 'NARRATION_BOX', scriptLineId: 'line-1' }),
        ),
      );
    });

    it('dòng thoại của nhân vật dùng bóng thoại thường', async () => {
      vi.mocked(scriptLineService.getSceneById).mockResolvedValue({
        id: 'scene-1',
        chapterId: 'chap-1',
        sceneNumber: 1,
        createdAt: '2026-10-08T00:00:00Z',
        scriptLines: [
          { id: 'line-9', lineOrder: 1, dialogueText: 'Tôi đây!', speakerCharacterId: 'char-1' },
        ],
      });
      vi.mocked(elementService.addElement).mockResolvedValueOnce({
        elementId: 'elem-sp',
        pageId: 'page-101',
        elementType: 'SPEECH_BALLOON',
      });
      renderComponent();
      fireEvent.click(await screen.findByText('Tôi đây!'));
      fireEvent.click(screen.getByTestId('letterer-viewport'), { clientX: 300, clientY: 300 });
      await waitFor(() =>
        expect(elementService.addElement).toHaveBeenCalledWith(
          'page-101',
          expect.objectContaining({ elementType: 'SPEECH_BALLOON', scriptLineId: 'line-9' }),
        ),
      );
    });

    describe('kéo dòng kịch bản vào trang', () => {
      beforeEach(() => {
        vi.mocked(scriptLineService.getSceneById).mockResolvedValue({
          id: 'scene-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          createdAt: '2026-10-08T00:00:00Z',
          scriptLines: [
            { id: 'line-1', lineOrder: 1, dialogueText: 'Chào bạn!' },
            { id: 'line-2', lineOrder: 2, dialogueText: 'Đêm thứ tư liên tiếp.' },
          ],
        });
      });

      const dragLineOnto = async (lineText: string, x: number, y: number) => {
        const card = (await screen.findByText(lineText)).closest('[draggable]') as HTMLElement;
        const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
        fireEvent.dragStart(card, { dataTransfer });
        const viewport = screen.getByTestId('letterer-viewport');
        // jsdom không có DragEvent: gán toạ độ con trỏ trực tiếp lên sự kiện
        for (const type of ['dragOver', 'drop'] as const) {
          const ev = createEvent[type](viewport, { dataTransfer });
          Object.defineProperty(ev, 'clientX', { value: x });
          Object.defineProperty(ev, 'clientY', { value: y });
          fireEvent(viewport, ev);
        }
      };

      it('dòng đã đặt không kéo được (chống gắn trùng)', async () => {
        renderComponent();
        const placed = (await screen.findByText('Chào bạn!')).closest(
          '[data-testid^="script-line-"]',
        );
        expect(placed).toHaveAttribute('draggable', 'false');
        const free = screen
          .getByText('Đêm thứ tư liên tiếp.')
          .closest('[data-testid^="script-line-"]');
        expect(free).toHaveAttribute('draggable', 'true');
      });

      it('thả vào trang hiện bản xem trước đúng toạ độ, xác nhận mới gửi lên máy chủ', async () => {
        vi.mocked(elementService.addElement).mockResolvedValueOnce({
          elementId: 'elem-drop',
          pageId: 'page-101',
          elementType: 'NARRATION_BOX',
        });
        renderComponent();
        await screen.findByText('Lời thoại ban đầu');
        await dragLineOnto('Đêm thứ tư liên tiếp.', 300, 400);

        expect(await screen.findByTestId('pending-placement')).toBeInTheDocument();
        expect(screen.getByTestId('pending-confirm-bar')).toBeInTheDocument();
        expect(elementService.addElement).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('pending-confirm'));
        await waitFor(() => {
          expect(elementService.addElement).toHaveBeenCalledWith(
            'page-101',
            expect.objectContaining({
              elementType: 'NARRATION_BOX',
              scriptLineId: 'line-2',
              // Tâm hộp 360×140 đặt đúng tại điểm thả (300, 400) trong toạ độ trang
              x: 300 - 180,
              y: 400 - 70,
              width: 360,
              height: 140,
            }),
          );
        });
      });

      it('Huỷ hoặc Esc bỏ bản xem trước, không gửi gì lên máy chủ', async () => {
        renderComponent();
        await screen.findByText('Lời thoại ban đầu');
        await dragLineOnto('Đêm thứ tư liên tiếp.', 300, 400);
        fireEvent.click(await screen.findByTestId('pending-cancel'));
        expect(screen.queryByTestId('pending-placement')).toBeNull();

        await dragLineOnto('Đêm thứ tư liên tiếp.', 300, 400);
        await screen.findByTestId('pending-placement');
        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByTestId('pending-placement')).toBeNull());
        expect(elementService.addElement).not.toHaveBeenCalled();
      });
    });

    it('chữ cao hơn khung: cảnh báo, không cắt, cho tăng khung cho vừa', async () => {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get() {
          return (this as HTMLElement).tagName === 'SPAN' ? 500 : 0;
        },
      });
      try {
        renderComponent();
        fireEvent.click(await screen.findByText('Lời thoại ban đầu'));
        expect(await screen.findByTestId('overflow-badge-elem-1')).toBeInTheDocument();
        expect(screen.getByTestId('overflow-callout')).toBeInTheDocument();
        // Chữ vẫn hiển thị đầy đủ, không bị cắt
        expect(
          within(screen.getByTestId('letterer-element-elem-1')).getByText('Lời thoại ban đầu'),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('grow-to-fit'));
        await waitFor(() =>
          expect(elementService.moveElement).toHaveBeenCalledWith(
            'page-101',
            'elem-1',
            expect.objectContaining({ newHeight: 530 }),
          ),
        );
      } finally {
        if (original) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
      }
    });
  });

  describe('chỉ đọc / khoá chương', () => {
    it('chế độ chỉ đọc chặn đặt mới, sửa tại chỗ, đổi cỡ và xoá', async () => {
      const { container } = renderComponent({ isReadOnly: true });
      fireEvent.click(await screen.findByText('Lời thoại ban đầu'));

      expect(screen.queryByTestId('letterer-resize-elem-1')).toBeNull();
      expect(screen.queryByText('Xóa phần tử này')).toBeNull();

      fireEvent.doubleClick(
        within(screen.getByTestId('letterer-element-elem-1')).getByText('Lời thoại ban đầu'),
      );
      expect(screen.queryByTestId('inline-editor-elem-1')).toBeNull();

      fireEvent.click(container.querySelector('.cursor-crosshair')!);
      expect(elementService.addElement).not.toHaveBeenCalled();

      const editor = screen.getByTestId('element-text-editor');
      fireEvent.change(editor, { target: { value: 'x' } });
      fireEvent.blur(editor);
      expect(elementService.updateElementText).not.toHaveBeenCalled();
    });
  });
});

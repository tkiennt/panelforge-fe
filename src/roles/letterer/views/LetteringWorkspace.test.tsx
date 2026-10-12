import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LetteringWorkspace } from './LetteringWorkspace';
import { elementService } from '@/services/element.service';
import { pageService } from '@/services/page.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { chapterService } from '@/services/chapter.service';
import { aiAgentsService } from '@/services/aiAgents.service';

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

  it('tải và hiển thị danh sách element và script lines từ API', async () => {
    renderComponent();

    await waitFor(() => {
      expect(elementService.getPageSnapshot).toHaveBeenCalledWith('page-101');
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
    });

    const textarea = screen.getByDisplayValue('Lời thoại ban đầu');
    fireEvent.change(textarea, { target: { value: 'Lời thoại mới sửa' } });

    await waitFor(() => {
      expect(screen.getByText(/Xung Đột Phiên Bản Phần Tử/i)).toBeInTheDocument();
    });
  });

  it('lưu vào offlineQueueService khi mất mạng ngoại tuyến (NFR-09)', async () => {
    // Giả lập offline
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('Thoại trên layer')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('Lời thoại ban đầu')).toBeInTheDocument();
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
});

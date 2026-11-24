import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PageDto } from '@/services/page.service';
import {
  elementService,
  IMAGE_LAYER_TYPES,
  type ElementSnapshotDto,
  type MoveElementRequest,
  type TextStyleDto,
} from '@/services/element.service';
import type { PanelDto } from '@/types/pipeline';
import type { ScriptLineItem } from '../components/desk/ArtistCanvaSidebar';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { classifyScriptLine, patchTextStyle, resolveTextStyle } from '@/shared/utils/textStyle';

export type BalloonType = 'SPEECH_BALLOON' | 'THOUGHT_BALLOON' | 'NARRATION_BOX' | 'SOUND_EFFECT';
export type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw';

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

interface ResizeState extends DragState {
  handle: ResizeHandle;
  initialW: number;
  initialH: number;
}

interface Toaster {
  success: (title: string, desc?: string) => void;
  info: (title: string, desc?: string) => void;
  error?: (title: string, desc?: string) => void;
}

const PAGE_MARGIN = 40;
const MIN_W = 90;
const MIN_H = 50;
const PASTE_OFFSET = 24;

// BE nhận clientElementId là Guid (NFR-09) → phải là UUID, không phải chuỗi tự đặt
const newElementId = (): string => crypto.randomUUID();

const isTypingTarget = () => {
  const el = document.activeElement as HTMLElement | null;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName?.toUpperCase() || '') ||
    !!el?.isContentEditable
  );
};

const releaseCapture = (e: React.PointerEvent) => {
  const target = e.currentTarget as HTMLElement;
  if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
};

const resizeBox = (r: ResizeState, dx: number, dy: number) => {
  const growsLeft = r.handle === 'sw' || r.handle === 'nw';
  const growsUp = r.handle === 'ne' || r.handle === 'nw';
  const width = Math.max(MIN_W, r.initialW + (growsLeft ? -dx : dx));
  const height = Math.max(MIN_H, r.initialH + (growsUp ? -dy : dy));
  return {
    x: growsLeft ? r.initialX + (r.initialW - width) : r.initialX,
    y: growsUp ? r.initialY + (r.initialH - height) : r.initialY,
    width,
    height,
  };
};

function isForbiddenError(err: any): boolean {
  return err?.status === 403 || err?.response?.status === 403 || err?.code === 'FORBIDDEN';
}

export function useLetteringBalloons(
  selectedPage: PageDto | null | undefined,
  pagePanels: PanelDto[],
  zoomScale: number,
  toast: Toaster,
  readOnly = false,
  activeLang?: string,
  originalLang: string = 'vi',
) {
  const [elementsByPageId, setElementsByPageId] = useState<Record<string, ElementSnapshotDto[]>>(
    {},
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [clipboard, setClipboard] = useState<ElementSnapshotDto | null>(null);

  const pageWidth = selectedPage?.widthPx || 1200;
  const pageHeight = selectedPage?.heightPx || 1800;
  const pageElements = useMemo(
    () => (selectedPage ? elementsByPageId[selectedPage.id] || [] : []),
    [selectedPage, elementsByPageId],
  );

  const reloadSeq = useRef(0);
  const reloadElements = useCallback(async () => {
    if (!selectedPage?.id) return;
    const seq = ++reloadSeq.current;
    try {
      const snapshot = await elementService.getPageSnapshot(
        selectedPage.id,
        false,
        undefined,
        activeLang,
      );
      const letterElements = (snapshot.elements || []).filter(
        (el) => !el.isRemoved && !IMAGE_LAYER_TYPES.includes(el.elementType as any),
      );
      // Bỏ kết quả cũ nếu đã đổi trang/ngôn ngữ trong lúc chờ
      if (seq !== reloadSeq.current) return;
      setElementsByPageId((prev) => ({ ...prev, [selectedPage.id]: letterElements }));
    } catch (err) {
      console.warn('Không thể nạp bóng thoại từ server:', err);
    }
  }, [selectedPage?.id, activeLang]);

  // Nạp bóng của các trang khác trong chương (một lần) để biết dòng script nào đã gắn ở đâu:
  // trạng thái Đã gắn/Chưa gắn toàn chương, chặn đặt trùng, kiểm tra đủ chữ trước khi nộp.
  const prefetchPages = useCallback(
    async (pageIds: string[]): Promise<Record<string, ElementSnapshotDto[]>> => {
      const missing = pageIds.filter((id) => id && !(id in elementsByPageId));
      if (missing.length === 0) return elementsByPageId;
      const loaded = await Promise.all(
        missing.map(async (id) => {
          try {
            const snap = await elementService.getPageSnapshot(id, false);
            return [
              id,
              (snap.elements || []).filter(
                (el) => !el.isRemoved && !IMAGE_LAYER_TYPES.includes(el.elementType as any),
              ),
            ] as const;
          } catch {
            return null;
          }
        }),
      );
      const fetched: Record<string, ElementSnapshotDto[]> = {};
      for (const entry of loaded) if (entry) fetched[entry[0]] = [...entry[1]];
      setElementsByPageId((prev) => ({ ...fetched, ...prev }));
      return { ...fetched, ...elementsByPageId };
    },
    [elementsByPageId],
  );

  /** scriptLineId → bóng đang gắn (trang + phần tử), trên mọi trang đã nạp của chương. */
  const linkedByScriptLine = useMemo(() => {
    const map = new Map<string, { pageId: string; elementId: string }>();
    for (const [pageId, list] of Object.entries(elementsByPageId)) {
      for (const el of list) {
        if (el.scriptLineId && !el.isRemoved && !map.has(el.scriptLineId)) {
          map.set(el.scriptLineId, { pageId, elementId: el.elementId });
        }
      }
    }
    return map;
  }, [elementsByPageId]);

  /** Mọi bóng chữ đã nạp của chương (để kiểm tra bóng trống trước khi nộp). */
  const allLoadedElements = useMemo(
    () => Object.values(elementsByPageId).flat(),
    [elementsByPageId],
  );

  // Nạp danh sách phần tử bóng thoại từ Backend khi chọn / đổi trang hoặc đổi ngôn ngữ
  useEffect(() => {
    if (!selectedPage?.id) return;
    reloadElements();
  }, [selectedPage?.id, activeLang, reloadElements]);

  // Balloons must sit fully inside the panel under their centre (or the nearest panel when dropped in a gutter).
  const clampToPanel = useCallback(
    (targetX: number, targetY: number, w: number, h: number) => {
      const clamp = (v: number, min: number, max: number) =>
        Math.round(Math.max(min, Math.min(max, v)));

      if (pagePanels.length === 0) {
        return {
          x: clamp(targetX, PAGE_MARGIN, Math.max(PAGE_MARGIN, pageWidth - PAGE_MARGIN - w)),
          y: clamp(targetY, PAGE_MARGIN, Math.max(PAGE_MARGIN, pageHeight - PAGE_MARGIN - h)),
        };
      }

      const boxes = pagePanels.map((p) => {
        const b = parseBoundingBox(p.boundingBox, pageWidth, pageHeight);
        return {
          minX: b.pixelX,
          minY: b.pixelY,
          maxX: b.pixelX + b.pixelW,
          maxY: b.pixelY + b.pixelH,
        };
      });
      const cx = targetX + w / 2;
      const cy = targetY + h / 2;
      const distance = (b: (typeof boxes)[number]) =>
        Math.hypot(cx - (b.minX + b.maxX) / 2, cy - (b.minY + b.maxY) / 2);

      const box =
        boxes.find((b) => cx >= b.minX && cx <= b.maxX && cy >= b.minY && cy <= b.maxY) ??
        boxes.reduce((best, b) => (distance(b) < distance(best) ? b : best));

      return {
        x: clamp(targetX, box.minX, Math.max(box.minX, box.maxX - w)),
        y: clamp(targetY, box.minY, Math.max(box.minY, box.maxY - h)),
      };
    },
    [pagePanels, pageWidth, pageHeight],
  );

  const updatePageElements = useCallback(
    (update: (list: ElementSnapshotDto[]) => ElementSnapshotDto[]) => {
      if (!selectedPage) return;
      const pageId = selectedPage.id;
      setElementsByPageId((prev) => ({ ...prev, [pageId]: update(prev[pageId] || []) }));
    },
    [selectedPage],
  );

  const updateElement = useCallback(
    (elementId: string, update: (el: ElementSnapshotDto) => ElementSnapshotDto) =>
      updatePageElements((list) =>
        list.map((el) => (el.elementId === elementId ? update(el) : el)),
      ),
    [updatePageElements],
  );

  const notifyForbidden = useCallback(
    (err?: any) => {
      const detail =
        err?.message && err.message !== 'Bạn không có ô đang mở cho trang này' ? err.message : '';
      toast.error?.('Bạn không có ô đang mở cho trang này', detail);
    },
    [toast],
  );

  const scaleElement = useCallback(
    async (elementId: string, factor: number) => {
      if (readOnly) {
        notifyForbidden();
        return;
      }
      let previous: ElementSnapshotDto | null = null;
      let updated: ElementSnapshotDto | null = null;
      updateElement(elementId, (el) => {
        previous = el;
        const width = Math.max(80, Math.min(800, Math.round(el.width * factor)));
        const height = Math.max(45, Math.min(600, Math.round(el.height * factor)));
        // Scale around the balloon's centre so it grows in place.
        const pos = clampToPanel(
          el.x - (width - el.width) / 2,
          el.y - (height - el.height) / 2,
          width,
          height,
        );
        updated = { ...el, ...pos, width, height };
        return updated;
      });

      if (updated && selectedPage?.id) {
        const target = updated as ElementSnapshotDto;
        try {
          const payload: MoveElementRequest = {
            newX: target.x,
            newY: target.y,
            newWidth: target.width,
            newHeight: target.height,
            newZIndex: target.zIndex,
            expectedElementVersion: target.version,
          };
          const res = await elementService.moveElement(selectedPage.id, elementId, payload);
          if (res?.elementVersion) {
            updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
          }
        } catch (err: any) {
          if (isForbiddenError(err)) {
            if (previous) {
              const prevSnap = previous as ElementSnapshotDto;
              updateElement(elementId, () => prevSnap);
            }
            notifyForbidden(err);
            return;
          }
          console.warn('Cập nhật kích thước bóng thoại lên server thất bại:', err);
        }
      }
    },
    [readOnly, notifyForbidden, updateElement, clampToPanel, selectedPage?.id],
  );

  const appendCopy = useCallback(
    async (source: ElementSnapshotDto, successTitle: string) => {
      if (!selectedPage?.id) return;
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const id = newElementId();
      const pos = clampToPanel(
        source.x + PASTE_OFFSET,
        source.y + PASTE_OFFSET,
        source.width,
        source.height,
      );
      const newEl: ElementSnapshotDto = {
        ...source,
        elementId: id,
        ...pos,
        readingOrder: pageElements.length + 1,
        zIndex: pageElements.length + 1,
        version: 1,
      };
      updatePageElements((list) => [...list, newEl]);
      setSelectedElementId(id);

      try {
        const res = await elementService.addElement(selectedPage.id, {
          elementType: source.elementType,
          x: pos.x,
          y: pos.y,
          width: source.width,
          height: source.height,
          zIndex: newEl.zIndex,
          content: source.content || '',
          scriptLineId: source.scriptLineId || undefined,
          clientElementId: id,
        });
        toast.success(successTitle, '');
        if (res?.elementId && res.elementId !== id) {
          updateElement(id, (el) => ({ ...el, elementId: res.elementId, version: 1 }));
          setSelectedElementId((cur) => (cur === id ? res.elementId : cur));
        }
      } catch (err: any) {
        if (isForbiddenError(err)) {
          updatePageElements((list) => list.filter((item) => item.elementId !== id));
          setSelectedElementId((cur) => (cur === id ? null : cur));
          notifyForbidden(err);
          return;
        }
        updatePageElements((list) => list.filter((item) => item.elementId !== id));
        toast.error?.(
          'Không lưu được bóng thoại',
          (err as Error)?.message || 'Thử lại sau ít phút.',
        );
      }
    },
    [
      selectedPage?.id,
      readOnly,
      notifyForbidden,
      pageElements.length,
      clampToPanel,
      updatePageElements,
      updateElement,
      toast,
    ],
  );

  const copyElement = useCallback(
    (el: ElementSnapshotDto) => {
      setClipboard(el);
      toast.info('Đã sao chép bóng thoại', 'Nhấn Ctrl+V để dán');
    },
    [toast],
  );

  const addElement = async (
    type: BalloonType,
    scriptLine?: ScriptLineItem,
    options?: { at?: { x: number; y: number }; allowDuplicate?: boolean },
  ) => {
    if (!selectedPage) return;
    if (readOnly) {
      notifyForbidden();
      return;
    }
    const pageId = selectedPage.id;

    // Trang giả lập (chương chưa có trang thật trên server) không lưu được bóng
    if (pageId.startsWith('page-default-')) {
      toast.error?.(
        'Trang chưa được tạo',
        'Chương chưa có trang thật. Hãy tạo trang (Thêm trang / chọn mẫu khung) trước khi đặt bóng thoại.',
      );
      return;
    }

    // Chặn đặt trùng ngoài ý muốn: dòng script đã có bóng → chọn bóng đó thay vì tạo thêm
    const existing = scriptLine ? linkedByScriptLine.get(scriptLine.id) : undefined;
    if (existing && !options?.allowDuplicate) {
      if (existing.pageId === pageId) setSelectedElementId(existing.elementId);
      toast.info(
        'Dòng thoại đã có bóng',
        existing.pageId === pageId
          ? 'Đã chọn bóng đang gắn với dòng này.'
          : 'Dòng này đã được đặt ở trang khác.',
      );
      return;
    }
    const w = type === 'NARRATION_BOX' ? 320 : type === 'SOUND_EFFECT' ? 240 : 260;
    const h = type === 'NARRATION_BOX' ? 120 : type === 'SOUND_EFFECT' ? 100 : 160;
    const panelIndex = scriptLine?.panelNumber ? Math.max(0, scriptLine.panelNumber - 1) : 0;
    const panel = pagePanels[panelIndex] || pagePanels[0];

    let x: number;
    let y: number;
    if (panel) {
      const b = parseBoundingBox(panel.boundingBox, pageWidth, pageHeight);
      x = b.pixelX + Math.max(10, Math.round((b.pixelW - w) / 2));
      y = b.pixelY + Math.max(10, Math.round((b.pixelH - h) / 2));
    } else {
      const step = pageElements.length % 5;
      x = Math.max(50, pageWidth - w - 60 - step * 40);
      y = 80 + step * 180;
    }

    // Thả vào canvas: đặt tâm bóng tại điểm thả
    if (options?.at) {
      x = Math.round(options.at.x - w / 2);
      y = Math.round(options.at.y - h / 2);
    }

    const id = newElementId();
    const pos = clampToPanel(x, y, w, h);

    let content = 'Lời thoại mới...';
    if (scriptLine) {
      const classification = classifyScriptLine({
        dialogueText: scriptLine.dialogueText,
        stageDirection: scriptLine.stageDirection,
        speakerName: scriptLine.characterName,
      });
      content =
        classification.cleanText || scriptLine.dialogueText || scriptLine.stageDirection || '';
    } else if (type === 'SOUND_EFFECT') {
      content = 'BAM!';
    }

    const defaultStyle = resolveTextStyle({ elementType: type });

    const newElement: ElementSnapshotDto = {
      elementId: id,
      elementType: type,
      ...pos,
      width: w,
      height: h,
      zIndex: pageElements.length + 1,
      content,
      style: defaultStyle,
      scriptLineId: scriptLine ? scriptLine.id : null,
      readingOrder: pageElements.length + 1,
      version: 1,
      isRemoved: false,
    };

    updatePageElements((list) => [...list, newElement]);
    setSelectedElementId(id);

    try {
      const res = await elementService.addElement(pageId, {
        elementType: type,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        zIndex: newElement.zIndex,
        content,
        scriptLineId: scriptLine?.id,
        clientElementId: id,
        panelId: panel?.id,
      });

      toast.success('Đã thêm bóng thoại', '');
      if (res?.elementId && res.elementId !== id) {
        updateElement(id, (el) => ({ ...el, elementId: res.elementId, version: 1 }));
        setSelectedElementId((cur) => (cur === id ? res.elementId : cur));
      }
    } catch (err: any) {
      if (isForbiddenError(err)) {
        updatePageElements((list) => list.filter((item) => item.elementId !== id));
        setSelectedElementId((cur) => (cur === id ? null : cur));
        notifyForbidden(err);
        return;
      }
      updatePageElements((list) => list.filter((item) => item.elementId !== id));
      setSelectedElementId((cur) => (cur === id ? null : cur));
      toast.error?.('Không lưu được bóng thoại', (err as Error)?.message || 'Thử lại sau ít phút.');
    }
  };

  const updateElementText = useCallback(
    async (elementId: string, text: string) => {
      if (!selectedPage?.id) return;
      const target = pageElements.find((item) => item.elementId === elementId);
      if (!target) return;

      const pageId = selectedPage.id;
      const isOriginal =
        !activeLang || !originalLang || activeLang.toLowerCase() === originalLang.toLowerCase();

      if (isOriginal) {
        if (readOnly) {
          notifyForbidden();
          return;
        }
        // Nếu bóng đã gắn kịch bản (BR-05), không cho sửa chữ gốc tự do
        if (target.scriptLineId) {
          toast.info(
            'Không sửa được chữ gốc',
            'Bóng này gắn với dòng kịch bản đã duyệt (BR-05). Hãy sửa trong kịch bản, hoặc chọn ngôn ngữ dịch để nhập bản dịch.',
          );
          return;
        }

        updateElement(elementId, (el) => ({
          ...el,
          content: text,
          renderedText: text,
        }));

        try {
          const res = await elementService.updateElementText(pageId, elementId, {
            content: text,
            languageCode: activeLang,
            scriptLineId: target.scriptLineId || undefined,
            expectedElementVersion: target.version,
          });
          if (res?.elementVersion) {
            updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
          }
        } catch (err: any) {
          if (err?.response?.status === 409) {
            reloadElements();
            toast.info('Đã tải lại', 'Phần tử vừa được chỉnh sửa từ nơi khác.');
          } else {
            reloadElements();
            toast.error?.('Không lưu được nội dung', err?.message || 'Thử lại sau ít phút.');
          }
        }
      } else {
        // BR-34: Ngôn ngữ dịch -> ghi vào bản dịch qua elementService.updateElementTranslation
        // Tuyệt đối KHÔNG ghi đè content gốc
        const nextTexts = { ...(target.texts || {}), [activeLang]: text };
        updateElement(elementId, (el) => ({
          ...el,
          texts: nextTexts,
        }));

        try {
          const res = await elementService.updateElementTranslation(
            pageId,
            elementId,
            activeLang,
            text,
            target.version,
          );
          if (res?.elementVersion) {
            updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
          }
        } catch (err: any) {
          if (err?.response?.status === 409) {
            reloadElements();
            toast.info('Đã tải lại', 'Bản dịch vừa được chỉnh sửa từ nơi khác.');
          } else {
            reloadElements();
            toast.error?.('Không lưu được bản dịch', err?.message || 'Thử lại sau ít phút.');
          }
        }
      }
    },
    [
      selectedPage?.id,
      pageElements,
      activeLang,
      originalLang,
      readOnly,
      notifyForbidden,
      updateElement,
      reloadElements,
      toast,
    ],
  );

  const updateElementStyle = useCallback(
    async (elementId: string, patch: Partial<TextStyleDto> | null) => {
      if (!selectedPage?.id) return;
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const target = pageElements.find((item) => item.elementId === elementId);
      if (!target) return;

      const pageId = selectedPage.id;
      const currentStyle = resolveTextStyle(target);
      const newStyle = patch === null ? null : patchTextStyle(currentStyle, patch);

      updateElement(elementId, (el) => ({ ...el, style: newStyle }));

      try {
        const res = await elementService.updateElementStyle(pageId, elementId, {
          style: newStyle,
          expectedElementVersion: target.version,
        });
        if (res?.elementVersion) {
          updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
        }
      } catch (err: any) {
        if (err?.response?.status === 409) {
          reloadElements();
          toast.info('Đã tải lại', 'Kiểu chữ vừa được chỉnh sửa từ nơi khác.');
        } else {
          reloadElements();
          toast.error?.('Không lưu được kiểu chữ', err?.message || 'Thử lại sau ít phút.');
        }
      }
    },
    [
      selectedPage?.id,
      readOnly,
      notifyForbidden,
      pageElements,
      updateElement,
      reloadElements,
      toast,
    ],
  );

  const deleteElement = useCallback(
    async (elementId: string) => {
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const el = pageElements.find((item) => item.elementId === elementId);
      updatePageElements((list) => list.filter((item) => item.elementId !== elementId));
      setSelectedElementId((cur) => (cur === elementId ? null : cur));

      if (selectedPage?.id) {
        try {
          await elementService.removeElement(selectedPage.id, elementId, el?.version);
          toast.info('Đã xóa bóng thoại', '');
        } catch (err: any) {
          if (isForbiddenError(err)) {
            if (el) {
              updatePageElements((list) => [...list, el]);
            }
            notifyForbidden(err);
            return;
          }
          toast.info('Đã xóa bóng thoại', '');
          console.warn('Xóa bóng thoại trên server thất bại:', err);
        }
      } else {
        toast.info('Đã xóa bóng thoại', '');
      }
    },
    [readOnly, notifyForbidden, selectedPage?.id, pageElements, updatePageElements, toast],
  );

  const onDragStart = (e: React.PointerEvent, elementId: string) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = pageElements.find((item) => item.elementId === elementId);
    if (!el) return;
    setSelectedElementId(elementId);
    setDragging({
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
    });
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / zoomScale;
    const dy = (e.clientY - dragging.startY) / zoomScale;
    updateElement(dragging.elementId, (el) => ({
      ...el,
      ...clampToPanel(dragging.initialX + dx, dragging.initialY + dy, el.width, el.height),
    }));
  };

  const onDragEnd = useCallback(
    async (e: React.PointerEvent) => {
      if (!dragging) return;
      const { elementId, initialX, initialY } = dragging;
      releaseCapture(e);
      setDragging(null);

      if (!selectedPage?.id) return;
      const el = pageElements.find((item) => item.elementId === elementId);
      if (!el) return;

      try {
        const payload: MoveElementRequest = {
          newX: el.x,
          newY: el.y,
          newWidth: el.width,
          newHeight: el.height,
          newZIndex: el.zIndex,
          expectedElementVersion: el.version,
        };
        const res = await elementService.moveElement(selectedPage.id, elementId, payload);
        if (res?.elementVersion) {
          updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
        }
      } catch (err: any) {
        if (isForbiddenError(err)) {
          updateElement(elementId, (item) => ({ ...item, x: initialX, y: initialY }));
          notifyForbidden(err);
          return;
        }
        console.warn('Di chuyển bóng thoại lên server thất bại:', err);
      }
    },
    [dragging, selectedPage?.id, pageElements, updateElement, notifyForbidden],
  );

  const onResizeStart = (e: React.PointerEvent, elementId: string, handle: ResizeHandle) => {
    if (readOnly) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = pageElements.find((item) => item.elementId === elementId);
    if (!el) return;
    setSelectedElementId(elementId);
    setResizing({
      elementId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialW: el.width,
      initialH: el.height,
    });
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizing) return;
    const box = resizeBox(
      resizing,
      (e.clientX - resizing.startX) / zoomScale,
      (e.clientY - resizing.startY) / zoomScale,
    );
    updateElement(resizing.elementId, (el) => ({
      ...el,
      ...clampToPanel(box.x, box.y, box.width, box.height),
      width: Math.round(box.width),
      height: Math.round(box.height),
    }));
  };

  const onResizeEnd = useCallback(
    async (e: React.PointerEvent) => {
      if (!resizing) return;
      const { elementId, initialX, initialY, initialW, initialH } = resizing;
      releaseCapture(e);
      setResizing(null);

      if (!selectedPage?.id) return;
      const el = pageElements.find((item) => item.elementId === elementId);
      if (!el) return;

      try {
        const payload: MoveElementRequest = {
          newX: el.x,
          newY: el.y,
          newWidth: el.width,
          newHeight: el.height,
          newZIndex: el.zIndex,
          expectedElementVersion: el.version,
        };
        const res = await elementService.moveElement(selectedPage.id, elementId, payload);
        if (res?.elementVersion) {
          updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
        }
      } catch (err: any) {
        if (isForbiddenError(err)) {
          updateElement(elementId, (item) => ({
            ...item,
            x: initialX,
            y: initialY,
            width: initialW,
            height: initialH,
          }));
          notifyForbidden(err);
          return;
        }
        console.warn('Thay đổi kích thước bóng thoại lên server thất bại:', err);
      }
    },
    [resizing, selectedPage?.id, pageElements, updateElement, notifyForbidden],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const selected = pageElements.find((el) => el.elementId === selectedElementId);

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement(selectedElementId);
      } else if (mod && key === 'c' && selected) {
        e.preventDefault();
        copyElement(selected);
      } else if (mod && key === 'v' && clipboard && selectedPage) {
        e.preventDefault();
        appendCopy(clipboard, 'Đã dán bóng thoại');
      } else if (mod && key === 'd' && selected) {
        e.preventDefault();
        appendCopy(selected, 'Đã nhân bản bóng thoại');
      } else if (selectedElementId && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        scaleElement(selectedElementId, 1.15);
      } else if (selectedElementId && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        scaleElement(selectedElementId, 0.85);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementId,
    clipboard,
    selectedPage,
    pageElements,
    deleteElement,
    copyElement,
    appendCopy,
    scaleElement,
  ]);

  const moveElementTo = useCallback(
    async (elementId: string, targetX: number, targetY: number) => {
      if (!selectedPage?.id) return;
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const target = pageElements.find((item) => item.elementId === elementId);
      if (!target) return;
      const pos = clampToPanel(targetX, targetY, target.width, target.height);
      const prevPos = { x: target.x, y: target.y };
      updateElement(elementId, (el) => ({ ...el, ...pos }));

      try {
        const res = await elementService.moveElement(selectedPage.id, elementId, {
          newX: pos.x,
          newY: pos.y,
          newWidth: target.width,
          newHeight: target.height,
          newZIndex: target.zIndex,
          expectedElementVersion: target.version,
        });
        if (res?.elementVersion) {
          updateElement(elementId, (item) => ({ ...item, version: res.elementVersion }));
        }
        toast.success('Đã dời bóng thoại', 'Đã chọn vị trí thoáng nhất tránh vùng cấm.');
      } catch (err: any) {
        updateElement(elementId, (item) => ({ ...item, ...prevPos }));
        if (isForbiddenError(err)) {
          notifyForbidden(err);
          return;
        }
        toast.error?.('Không thể dời bóng thoại', err?.message || 'Thử lại sau ít phút.');
      }
    },
    [selectedPage?.id, readOnly, notifyForbidden, pageElements, clampToPanel, updateElement, toast],
  );

  return {
    pageElements,
    elementsByPageId,
    selectedElementId,
    setSelectedElementId,
    draggingId: dragging?.elementId ?? null,
    resizingId: resizing?.elementId ?? null,
    addElement,
    deleteElement,
    scaleElement,
    moveElementTo,
    copyElement,
    updateElementText,
    updateElementStyle,
    reloadElements,
    prefetchPages,
    linkedByScriptLine,
    allLoadedElements,
    onDragStart,
    onDragMove,
    onDragEnd,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
  };
}

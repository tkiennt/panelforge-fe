import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageDto } from '@/services/page.service';
import {
  elementService,
  IMAGE_LAYER_TYPES,
  type ElementSnapshotDto,
  type MoveElementRequest,
} from '@/services/element.service';
import type { PanelDto } from '@/types/pipeline';
import type { ScriptLineItem } from '../components/desk/ArtistCanvaSidebar';
import { parseBoundingBox } from '../utils/panelBoundingBox';

export type BalloonType = 'SPEECH_BALLOON' | 'THOUGHT_BALLOON' | 'NARRATION_BOX';
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
  success: (title: string, desc: string) => void;
  info: (title: string, desc: string) => void;
}

const PAGE_MARGIN = 40;
const MIN_W = 90;
const MIN_H = 50;
const PASTE_OFFSET = 24;

const newElementId = () => `elem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

export function useLetteringBalloons(
  selectedPage: PageDto | null | undefined,
  pagePanels: PanelDto[],
  zoomScale: number,
  toast: Toaster,
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

  // Nạp danh sách phần tử bóng thoại từ Backend khi chọn / đổi trang
  useEffect(() => {
    if (!selectedPage?.id) return;
    const pageId = selectedPage.id;
    let cancelled = false;

    elementService
      .getPageSnapshot(pageId)
      .then((snapshot) => {
        if (cancelled) return;
        const letterElements = (snapshot.elements || []).filter(
          (el) => !el.isRemoved && !IMAGE_LAYER_TYPES.includes(el.elementType as any),
        );
        setElementsByPageId((prev) => ({ ...prev, [pageId]: letterElements }));
      })
      .catch((err) => {
        console.warn('Không thể nạp bóng thoại từ server:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPage?.id]);

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

  const scaleElement = useCallback(
    async (elementId: string, factor: number) => {
      let updated: ElementSnapshotDto | null = null;
      updateElement(elementId, (el) => {
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
        } catch (err) {
          console.warn('Cập nhật kích thước bóng thoại lên server thất bại:', err);
        }
      }
    },
    [updateElement, clampToPanel, selectedPage?.id],
  );

  const appendCopy = useCallback(
    async (source: ElementSnapshotDto, successTitle: string) => {
      if (!selectedPage?.id) return;
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
      toast.success(successTitle, '');

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
        if (res?.elementId && res.elementId !== id) {
          updateElement(id, (el) => ({ ...el, elementId: res.elementId, version: 1 }));
          setSelectedElementId((cur) => (cur === id ? res.elementId : cur));
        }
      } catch (err) {
        console.warn('Nhân bản bóng thoại lên server thất bại:', err);
      }
    },
    [selectedPage?.id, pageElements.length, clampToPanel, updatePageElements, updateElement, toast],
  );

  const copyElement = useCallback(
    (el: ElementSnapshotDto) => {
      setClipboard(el);
      toast.info('Đã sao chép bóng thoại', 'Nhấn Ctrl+V để dán');
    },
    [toast],
  );

  const addElement = async (type: BalloonType, scriptLine?: ScriptLineItem) => {
    if (!selectedPage) return;
    const pageId = selectedPage.id;
    const w = type === 'NARRATION_BOX' ? 320 : 260;
    const h = type === 'NARRATION_BOX' ? 120 : 160;
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

    const id = newElementId();
    const pos = clampToPanel(x, y, w, h);
    const content = scriptLine
      ? scriptLine.dialogueText || scriptLine.stageDirection || ''
      : 'Lời thoại mới...';

    const newElement: ElementSnapshotDto = {
      elementId: id,
      elementType: type,
      ...pos,
      width: w,
      height: h,
      zIndex: pageElements.length + 1,
      content,
      scriptLineId: scriptLine ? scriptLine.id : null,
      readingOrder: pageElements.length + 1,
      version: 1,
      isRemoved: false,
    };

    updatePageElements((list) => [...list, newElement]);
    setSelectedElementId(id);
    toast.success('Đã thêm bóng thoại', '');

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

      if (res?.elementId && res.elementId !== id) {
        updateElement(id, (el) => ({ ...el, elementId: res.elementId, version: 1 }));
        setSelectedElementId((cur) => (cur === id ? res.elementId : cur));
      }
    } catch (err) {
      console.warn('Lưu bóng thoại lên server thất bại (vẫn giữ cục bộ):', err);
    }
  };

  const deleteElement = useCallback(
    async (elementId: string) => {
      const el = pageElements.find((item) => item.elementId === elementId);
      updatePageElements((list) => list.filter((item) => item.elementId !== elementId));
      setSelectedElementId((cur) => (cur === elementId ? null : cur));
      toast.info('Đã xóa bóng thoại', '');

      if (selectedPage?.id) {
        try {
          await elementService.removeElement(selectedPage.id, elementId, el?.version);
        } catch (err) {
          console.warn('Xóa bóng thoại trên server thất bại:', err);
        }
      }
    },
    [selectedPage?.id, pageElements, updatePageElements, toast],
  );

  const onDragStart = (e: React.PointerEvent, elementId: string) => {
    if (e.button !== 0) return;
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
      const elementId = dragging.elementId;
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
      } catch (err) {
        console.warn('Di chuyển bóng thoại lên server thất bại:', err);
      }
    },
    [dragging, selectedPage?.id, pageElements, updateElement],
  );

  const onResizeStart = (e: React.PointerEvent, elementId: string, handle: ResizeHandle) => {
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
      const elementId = resizing.elementId;
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
      } catch (err) {
        console.warn('Thay đổi kích thước bóng thoại lên server thất bại:', err);
      }
    },
    [resizing, selectedPage?.id, pageElements, updateElement],
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

  return {
    pageElements,
    selectedElementId,
    setSelectedElementId,
    draggingId: dragging?.elementId ?? null,
    resizingId: resizing?.elementId ?? null,
    addElement,
    deleteElement,
    scaleElement,
    copyElement,
    onDragStart,
    onDragMove,
    onDragEnd,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
  };
}

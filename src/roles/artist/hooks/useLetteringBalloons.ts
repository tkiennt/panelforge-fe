import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { translate, useTranslation } from '@/lib/i18n';
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
import { findFreeBalloonSlot } from '../lib/balloonPlacement';
import {
  appearanceFromStyle,
  defaultAppearance,
  fitBalloonSize,
  growBalloonToFit,
  letteringCase,
  resolveAppearance,
  tailFromStyle,
  tailToward,
  withAppearance,
  type TailPoint,
} from '@/shared/lib/lettering/balloonRender';
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
  const { t } = useTranslation('artist');
  const [elementsByPageId, setElementsByPageId] = useState<Record<string, ElementSnapshotDto[]>>(
    {},
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  // Bóng đã hiện trên UI nhưng server chưa xác nhận lưu (request còn chờ)
  const [pendingElementIds, setPendingElementIds] = useState<ReadonlySet<string>>(() => new Set());
  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingElementIds((prev) => {
      if (prev.has(id) === pending) return prev;
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Còn bóng chưa lưu mà rời/tải lại trang thì request bị huỷ → hỏi lại trước khi rời
  useEffect(() => {
    if (pendingElementIds.size === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [pendingElementIds]);
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
  /** Khung chứa tâm (cx, cy), không có thì khung gần nhất; trang chưa chia khung thì cả trang trừ lề. */
  const areaAt = useCallback(
    (cx: number, cy: number) => {
      if (pagePanels.length === 0) {
        return {
          minX: PAGE_MARGIN,
          minY: PAGE_MARGIN,
          maxX: pageWidth - PAGE_MARGIN,
          maxY: pageHeight - PAGE_MARGIN,
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
      const distance = (b: (typeof boxes)[number]) =>
        Math.hypot(cx - (b.minX + b.maxX) / 2, cy - (b.minY + b.maxY) / 2);
      return (
        boxes.find((b) => cx >= b.minX && cx <= b.maxX && cy >= b.minY && cy <= b.maxY) ??
        boxes.reduce((best, b) => (distance(b) < distance(best) ? b : best))
      );
    },
    [pagePanels, pageWidth, pageHeight],
  );

  const clampToPanel = useCallback(
    (targetX: number, targetY: number, w: number, h: number) => {
      const clamp = (v: number, min: number, max: number) =>
        Math.round(Math.max(min, Math.min(max, v)));
      const box = areaAt(targetX + w / 2, targetY + h / 2);
      return {
        x: clamp(targetX, box.minX, Math.max(box.minX, box.maxX - w)),
        y: clamp(targetY, box.minY, Math.max(box.minY, box.maxY - h)),
      };
    },
    [areaAt],
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
      const forbiddenMsg = t('lettering.balloons.forbidden');
      const detail = err?.message && err.message !== forbiddenMsg ? err.message : '';
      toast.error?.(forbiddenMsg, detail);
    },
    [toast, t],
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
          t('lettering.balloons.saveFailed'),
          (err as Error)?.message || t('lettering.balloons.tryAgainLater'),
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
      t,
    ],
  );

  const copyElement = useCallback(
    (el: ElementSnapshotDto) => {
      setClipboard(el);
      toast.info(t('lettering.balloons.copied'), t('lettering.balloons.copiedHint'));
    },
    [toast, t],
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
        t('lettering.balloons.pageNotCreated'),
        t('lettering.balloons.pageNotCreatedDesc'),
      );
      return;
    }

    // Chặn đặt trùng ngoài ý muốn: dòng script đã có bóng → chọn bóng đó thay vì tạo thêm
    const existing = scriptLine ? linkedByScriptLine.get(scriptLine.id) : undefined;
    if (existing && !options?.allowDuplicate) {
      if (existing.pageId === pageId) setSelectedElementId(existing.elementId);
      toast.info(
        t('lettering.balloons.alreadyHasBalloon'),
        existing.pageId === pageId
          ? t('lettering.balloons.alreadyHasBalloonSamePage')
          : t('lettering.balloons.alreadyHasBalloonOtherPage'),
      );
      return;
    }
    const panelIndex = scriptLine?.panelNumber ? Math.max(0, scriptLine.panelNumber - 1) : 0;
    const panel = pagePanels[panelIndex] || pagePanels[0];

    // Đặt vào chỗ trống của khung (hoặc trang) để bóng tạo liên tiếp không chồng cùng một vị trí
    const area = panel
      ? (() => {
          const b = parseBoundingBox(panel.boundingBox, pageWidth, pageHeight);
          return {
            minX: b.pixelX,
            minY: b.pixelY,
            maxX: b.pixelX + b.pixelW,
            maxY: b.pixelY + b.pixelH,
          };
        })()
      : {
          minX: PAGE_MARGIN,
          minY: PAGE_MARGIN,
          maxX: pageWidth - PAGE_MARGIN,
          maxY: pageHeight - PAGE_MARGIN,
        };
    let content = t('lettering.balloons.defaultContent');
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
    const shape = defaultAppearance(type).shape;

    // Bóng vừa câu ở cỡ chữ mặc định (câu dài → bóng to/rộng hơn), không vượt khung đang đặt
    const minW = type === 'NARRATION_BOX' ? 240 : 160;
    const { w, h } = fitBalloonSize(content, defaultStyle, shape, {
      minW,
      minH: type === 'NARRATION_BOX' ? 70 : 90,
      maxW: Math.max(minW, Math.min(520, area.maxX - area.minX - 24)),
      maxH: Math.max(90, Math.min(420, area.maxY - area.minY - 24)),
    });

    let { x, y } = findFreeBalloonSlot(
      area,
      w,
      h,
      pageElements.filter((el) => !el.isRemoved),
    );

    // Thả vào canvas: đặt tâm bóng tại điểm thả
    if (options?.at) {
      x = Math.round(options.at.x - w / 2);
      y = Math.round(options.at.y - h / 2);
    }

    const id = newElementId();
    const pos = clampToPanel(x, y, w, h);

    // Bóng thoại: đuôi mặc định hướng về tâm khung — nơi nhân vật thường đứng (Letterer kéo đuôi để chỉnh)
    const tail =
      shape === 'oval'
        ? tailToward(
            { x: pos.x, y: pos.y, w, h },
            { x: (area.minX + area.maxX) / 2, y: (area.minY + area.maxY) / 2 },
          )
        : null;
    const initialStyle = tail
      ? (withAppearance(defaultStyle, defaultStyle, { tail }) ?? defaultStyle)
      : defaultStyle;

    const newElement: ElementSnapshotDto = {
      elementId: id,
      elementType: type,
      ...pos,
      width: w,
      height: h,
      zIndex: pageElements.length + 1,
      content,
      style: initialStyle,
      scriptLineId: scriptLine ? scriptLine.id : null,
      readingOrder: pageElements.length + 1,
      version: 1,
      isRemoved: false,
    };

    updatePageElements((list) => [...list, newElement]);
    setSelectedElementId(id);
    markPending(id, true);

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

      toast.success(t('lettering.balloons.added'), '');
      const savedId = res?.elementId || id;
      if (savedId !== id) {
        updateElement(id, (el) => ({ ...el, elementId: savedId, version: 1 }));
        setSelectedElementId((cur) => (cur === id ? savedId : cur));
      }
      // AddElement chưa nhận style: lưu đuôi ngay sau khi tạo. Lỗi thì bóng vẫn còn, chỉ về đuôi mặc định.
      if (tail) {
        try {
          const styled = await elementService.updateElementStyle(pageId, savedId, {
            style: initialStyle,
            expectedElementVersion: 1,
          });
          if (styled?.elementVersion)
            updateElement(savedId, (el) => ({ ...el, version: styled.elementVersion }));
        } catch {
          updateElement(savedId, (el) => ({ ...el, style: defaultStyle }));
        }
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
      toast.error?.(
        t('lettering.balloons.saveFailed'),
        (err as Error)?.message || t('lettering.balloons.tryAgainLater'),
      );
    } finally {
      markPending(id, false);
    }
  };

  /**
   * Nới bóng `el` (đã có version mới nhất) cho vừa `text` ở cỡ chữ đã chọn, trong khung đang chứa bóng.
   * Đầu đuôi giữ nguyên trên trang. 409 → nạp lại.
   */
  const growToFit = useCallback(
    async (el: ElementSnapshotDto, text: string) => {
      if (!selectedPage?.id || readOnly) return;
      const pageId = selectedPage.id;
      const shape = resolveAppearance(el.elementType, appearanceFromStyle(el.style)).shape;
      const area = areaAt(el.x + el.width / 2, el.y + el.height / 2);
      const next = growBalloonToFit(
        letteringCase(text, activeLang),
        resolveTextStyle(el),
        shape,
        { x: el.x, y: el.y, w: el.width, h: el.height },
        { w: area.maxX - area.minX - 24, h: area.maxY - area.minY - 24 },
      );
      if (!next) return;
      const pos = clampToPanel(next.x, next.y, next.w, next.h);
      const savedTail = tailFromStyle(el.style);
      const style = savedTail
        ? withAppearance(el.style, resolveTextStyle(el), {
            tail: { x: savedTail.x + el.x - pos.x, y: savedTail.y + el.y - pos.y },
          })
        : el.style;
      updateElement(el.elementId, (item) => ({
        ...item,
        ...pos,
        width: next.w,
        height: next.h,
        style,
      }));
      try {
        const moved = await elementService.moveElement(pageId, el.elementId, {
          newX: pos.x,
          newY: pos.y,
          newWidth: next.w,
          newHeight: next.h,
          newZIndex: el.zIndex,
          expectedElementVersion: el.version,
        });
        let version = moved?.elementVersion ?? el.version;
        if (savedTail) {
          const styled = await elementService.updateElementStyle(pageId, el.elementId, {
            style,
            expectedElementVersion: version,
          });
          version = styled?.elementVersion ?? version;
        }
        updateElement(el.elementId, (item) => ({ ...item, version }));
      } catch (err: any) {
        reloadElements();
        if (err?.response?.status === 409)
          toast.info(t('lettering.balloons.reloaded'), t('lettering.balloons.reloadedElementDesc'));
        else
          toast.error?.(
            t('lettering.balloons.saveStyleFailed'),
            err?.message || t('lettering.balloons.tryAgainLater'),
          );
      }
    },
    [
      selectedPage?.id,
      readOnly,
      activeLang,
      areaAt,
      clampToPanel,
      updateElement,
      reloadElements,
      toast,
      t,
    ],
  );

  /** Nút "Vừa bóng": nới bóng đang chọn theo chữ của ngôn ngữ đang soạn. */
  const fitElementToText = useCallback(
    (elementId: string) => {
      const el = pageElements.find((item) => item.elementId === elementId);
      if (!el) return;
      const text = (activeLang && el.texts?.[activeLang]) || el.content || '';
      return growToFit(el, text);
    },
    [pageElements, activeLang, growToFit],
  );

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
            t('lettering.balloons.cannotEditOriginal'),
            t('lettering.balloons.cannotEditOriginalDesc'),
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
          await growToFit(
            { ...target, content: text, version: res?.elementVersion ?? target.version },
            text,
          );
        } catch (err: any) {
          if (err?.response?.status === 409) {
            reloadElements();
            toast.info(
              t('lettering.balloons.reloaded'),
              t('lettering.balloons.reloadedElementDesc'),
            );
          } else {
            reloadElements();
            toast.error?.(
              t('lettering.balloons.saveContentFailed'),
              err?.message || t('lettering.balloons.tryAgainLater'),
            );
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
            toast.info(
              t('lettering.balloons.reloaded'),
              t('lettering.balloons.reloadedTranslationDesc'),
            );
          } else {
            reloadElements();
            toast.error?.(
              t('lettering.balloons.saveTranslationFailed'),
              err?.message || t('lettering.balloons.tryAgainLater'),
            );
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
      growToFit,
      reloadElements,
      toast,
      t,
    ],
  );

  const syncElementText = useCallback(
    async (elementId: string) => {
      if (!selectedPage?.id) return;
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const target = pageElements.find((item) => item.elementId === elementId);
      if (!target?.scriptLineId) return;

      try {
        const res = await elementService.updateElementText(selectedPage.id, elementId, {
          scriptLineId: target.scriptLineId,
          expectedElementVersion: target.version,
        });
        const latestText = res.content ?? target.currentLineText ?? target.content ?? '';
        updateElement(elementId, (item) => ({
          ...item,
          content: latestText,
          renderedText: latestText,
          currentLineText: latestText,
          isStale: false,
          version: res.elementVersion ?? item.version,
        }));
        await growToFit(
          { ...target, content: latestText, version: res.elementVersion ?? target.version },
          latestText,
        );
      } catch (err: any) {
        await reloadElements();
        toast.error?.(
          t('lettering.balloons.saveContentFailed'),
          err?.message || t('lettering.balloons.tryAgainLater'),
        );
      }
    },
    [
      selectedPage?.id,
      readOnly,
      notifyForbidden,
      pageElements,
      updateElement,
      growToFit,
      reloadElements,
      toast,
      t,
    ],
  );

  /** Lưu style mới của bóng (lạc quan); 409 → nạp lại, không gửi đè. */
  const saveElementStyle = useCallback(
    async (target: ElementSnapshotDto, newStyle: TextStyleDto | null) => {
      if (!selectedPage?.id) return;
      const pageId = selectedPage.id;
      const elementId = target.elementId;
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
          toast.info(t('lettering.balloons.reloaded'), t('lettering.balloons.reloadedStyleDesc'));
        } else {
          reloadElements();
          toast.error?.(
            t('lettering.balloons.saveStyleFailed'),
            err?.message || t('lettering.balloons.tryAgainLater'),
          );
        }
      }
    },
    [selectedPage?.id, updateElement, reloadElements, toast, t],
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
      const newStyle = patch === null ? null : patchTextStyle(resolveTextStyle(target), patch);
      await saveElementStyle(target, newStyle);
    },
    [selectedPage?.id, readOnly, notifyForbidden, pageElements, saveElementStyle],
  );

  /** Kéo đầu đuôi bóng: chỉ đổi tailX/tailY, giữ nguyên kiểu chữ (kể cả nhãn preset). */
  const updateElementTail = useCallback(
    async (elementId: string, tail: TailPoint) => {
      if (!selectedPage?.id) return;
      if (readOnly) {
        notifyForbidden();
        return;
      }
      const target = pageElements.find((item) => item.elementId === elementId);
      if (!target) return;
      const defaults = resolveTextStyle({ elementType: target.elementType });
      await saveElementStyle(target, withAppearance(target.style, defaults, { tail }));
    },
    [selectedPage?.id, readOnly, notifyForbidden, pageElements, saveElementStyle],
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
          toast.info(t('lettering.balloons.deleted'), '');
        } catch (err: any) {
          if (isForbiddenError(err)) {
            if (el) {
              updatePageElements((list) => [...list, el]);
            }
            notifyForbidden(err);
            return;
          }
          toast.info(t('lettering.balloons.deleted'), '');
          console.warn('Xóa bóng thoại trên server thất bại:', err);
        }
      } else {
        toast.info(t('lettering.balloons.deleted'), '');
      }
    },
    [readOnly, notifyForbidden, selectedPage?.id, pageElements, updatePageElements, toast, t],
  );

  const onDragStart = (e: React.PointerEvent, elementId: string) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = pageElements.find((item) => item.elementId === elementId);
    if (!el) return;
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
        appendCopy(clipboard, t('lettering.balloons.pasted'));
      } else if (mod && key === 'd' && selected) {
        e.preventDefault();
        appendCopy(selected, t('lettering.balloons.duplicated'));
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
    t,
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
        toast.success(
          translate('artist.keepOut.balloonMovedTitle'),
          translate('artist.keepOut.balloonMovedDesc'),
        );
      } catch (err: any) {
        updateElement(elementId, (item) => ({ ...item, ...prevPos }));
        if (isForbiddenError(err)) {
          notifyForbidden(err);
          return;
        }
        toast.error?.(
          translate('artist.keepOut.balloonMoveFailedTitle'),
          err?.message || translate('artist.keepOut.tryAgainLater'),
        );
      }
    },
    [selectedPage?.id, readOnly, notifyForbidden, pageElements, clampToPanel, updateElement, toast],
  );

  return {
    pageElements,
    elementsByPageId,
    selectedElementId,
    setSelectedElementId,
    pendingElementIds,
    draggingId: dragging?.elementId ?? null,
    resizingId: resizing?.elementId ?? null,
    addElement,
    deleteElement,
    scaleElement,
    moveElementTo,
    copyElement,
    updateElementText,
    syncElementText,
    updateElementStyle,
    updateElementTail,
    fitElementToText,
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

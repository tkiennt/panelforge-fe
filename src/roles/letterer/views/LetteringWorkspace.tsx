// src/roles/letterer/views/LetteringWorkspace.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageCircle,
  Type,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Plus,
  BookOpen,
  CheckCircle2,
  FileText,
  ListOrdered,
  Sparkles,
  Move,
} from 'lucide-react';
import {
  elementService,
  ElementSnapshotDto,
  PageSnapshotDto,
  MoveElementRequest,
  IMAGE_LAYER_TYPES,
  LAYER_LABELS,
} from '@/services/element.service';
import { pageService } from '@/services/page.service';
import {
  scriptLineService,
  SceneDto,
  SceneScriptLineSummaryDto,
} from '@/services/scriptLine.service';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';

interface LetteringWorkspaceProps {
  pageId?: string;
  chapterId?: string;
  isReadOnly?: boolean;
  onShowToast?: (title: string, desc: string) => void;
}

function checkIsNetworkError(err: any): boolean {
  if (
    err.conflict === 'ELEMENT_VERSION_CONFLICT' ||
    err.code === 'CONFLICT' ||
    err.status === 409 ||
    err.response?.status === 409 ||
    err.message?.includes('ELEMENT_VERSION_CONFLICT')
  ) {
    return false;
  }
  return !err.response || err.code === 'ERR_NETWORK';
}

export const LetteringWorkspace: React.FC<LetteringWorkspaceProps> = ({
  pageId: propPageId,
  chapterId: propChapterId,
  isReadOnly = false,
  onShowToast,
}) => {
  const [searchParams] = useSearchParams();
  const activePageId = propPageId || searchParams.get('pageId') || '';
  const activeChapterId = propChapterId || searchParams.get('chapterId') || '';

  const [pageSnapshot, setPageSnapshot] = useState<PageSnapshotDto | null>(null);
  const [elements, setElements] = useState<ElementSnapshotDto[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Kích thước canvas thực tế (px) từ cấu hình Page (Lỗi 1)
  const [pageDim, setPageDim] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 1800,
  });

  // Script lines & Scenes
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneLines, setSceneLines] = useState<SceneScriptLineSummaryDto[]>([]);
  const [selectedScriptLine, setSelectedScriptLine] = useState<SceneScriptLineSummaryDto | null>(
    null,
  );

  // Tool Mode & Placement
  const [toolMode, setToolMode] = useState<'select' | 'balloon' | 'thought' | 'narration' | 'sfx'>(
    'balloon',
  );

  // Conflict Modal State (BR-11 & Lỗi 3)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictElementId, setConflictElementId] = useState<string | undefined>();
  const [conflictErrorMsg, setConflictErrorMsg] = useState<string | undefined>();

  // Overflow Acknowledgment state
  const [ackReason, setAckReason] = useState('');

  // Dragging state on canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    elementId: string;
    startX: number;
    startY: number;
    initialPxX: number;
    initialPxY: number;
  } | null>(null);

  const showToast = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) onShowToast(title, desc);
    },
    [onShowToast],
  );

  // Nạp thông tin kích thước trang (px) từ backend
  useEffect(() => {
    if (!activePageId || typeof pageService?.getPageById !== 'function') return;
    try {
      const res = pageService.getPageById(activePageId);
      if (res && typeof res.then === 'function') {
        res
          .then((p) => {
            if (p && p.widthPx && p.heightPx) {
              setPageDim({ width: p.widthPx, height: p.heightPx });
            }
          })
          .catch((err) => {
            console.warn('Lỗi nạp kích thước trang:', err);
          });
      }
    } catch (err) {
      console.warn('Lỗi gọi getPageById:', err);
    }
  }, [activePageId]);

  // Lắng nghe sự kiện xung đột từ hàng đợi offline (Lỗi 3)
  useEffect(() => {
    const handleOfflineConflict = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setConflictElementId(detail.item?.clientRefId);
        setConflictErrorMsg(
          detail.message || 'Xung đột phiên bản phần tử khi đồng bộ ngoại tuyến (409 Conflict).',
        );
        setConflictModalOpen(true);
      }
    };
    window.addEventListener('panelforge:offline_conflict', handleOfflineConflict);
    return () => {
      window.removeEventListener('panelforge:offline_conflict', handleOfflineConflict);
    };
  }, []);

  // Nạp Elements của trang
  const loadElements = useCallback(async () => {
    if (!activePageId) {
      setPageSnapshot(null);
      setElements([]);
      return;
    }
    setLoading(true);
    try {
      const snap = await elementService.getPageSnapshot(activePageId);
      setPageSnapshot(snap);
      setElements(snap.elements.filter((e) => !e.isRemoved));
    } catch (err: any) {
      console.error('Lỗi tải elements:', err);
      showToast('Lỗi tải phần tử', err.message);
    } finally {
      setLoading(false);
    }
  }, [activePageId, showToast]);

  useEffect(() => {
    loadElements();
  }, [loadElements]);

  // Nạp Scenes và ScriptLines
  useEffect(() => {
    if (!activeChapterId) return;
    scriptLineService
      .getScenesByChapter(activeChapterId)
      .then((res) => {
        setScenes(res);
        if (res.length > 0) {
          setSelectedSceneId(res[0].id);
        }
      })
      .catch((err) => console.error('Lỗi nạp scenes:', err));
  }, [activeChapterId]);

  useEffect(() => {
    if (!selectedSceneId) {
      setSceneLines([]);
      return;
    }
    scriptLineService
      .getSceneById(selectedSceneId)
      .then((detail) => {
        setSceneLines(detail.scriptLines || []);
      })
      .catch((err) => console.error('Lỗi nạp script lines:', err));
  }, [selectedSceneId]);

  // Chuẩn hoá toạ độ element giữa pixel thực tế và phần trăm hiển thị (Lỗi 1)
  const getNormalizedElementBox = useCallback(
    (b: ElementSnapshotDto) => {
      // Nếu dữ liệu cũ lưu dạng phần trăm (<= 100) thì scale sang px theo khổ trang
      const w = Number(b.width) || 0;
      const h = Number(b.height) || 0;
      const rawX = Number(b.x) || 0;
      const rawY = Number(b.y) || 0;
      const isPercent = w <= 100 || h <= 100;
      const pxW = isPercent ? Math.round((w / 100) * pageDim.width) : Math.round(w);
      const pxH = isPercent ? Math.round((h / 100) * pageDim.height) : Math.round(h);
      const pxX = isPercent ? Math.round((rawX / 100) * pageDim.width) : Math.round(rawX);
      const pxY = isPercent ? Math.round((rawY / 100) * pageDim.height) : Math.round(rawY);

      const percentLeft = pageDim.width > 0 ? (pxX / pageDim.width) * 100 : 0;
      const percentTop = pageDim.height > 0 ? (pxY / pageDim.height) * 100 : 0;
      const percentWidth = pageDim.width > 0 ? (pxW / pageDim.width) * 100 : 0;
      const percentHeight = pageDim.height > 0 ? (pxH / pageDim.height) * 100 : 0;

      return { pxX, pxY, pxW, pxH, percentLeft, percentTop, percentWidth, percentHeight };
    },
    [pageDim.width, pageDim.height],
  );

  // Xử lý xung đột phiên bản BR-11
  const handleConcurrencyError = (err: any, elementId?: string) => {
    if (err.code === 'CHAPTER_READ_ONLY') {
      showToast('Chương chỉ đọc', err.message);
      return;
    }
    if (
      err.conflict === 'ELEMENT_VERSION_CONFLICT' ||
      err.code === 'CONFLICT' ||
      err.status === 409 ||
      err.message?.includes('ELEMENT_VERSION_CONFLICT')
    ) {
      setConflictElementId(elementId);
      setConflictErrorMsg(err.message);
      setConflictModalOpen(true);
    } else {
      showToast('Thao tác thất bại', err.message);
    }
  };

  // Click lên canvas để thêm balloon mới (POST /api/pages/{pageId}/elements) với toạ độ px chuẩn (Lỗi 1 & Lỗi 4)
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    if ((e.target as HTMLElement).closest('.speech-balloon')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * pageDim.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * pageDim.height;

    let elemType = 'SPEECH_BALLOON';
    if (toolMode === 'thought') elemType = 'THOUGHT_BALLOON';
    else if (toolMode === 'narration') elemType = 'NARRATION_BOX';
    else if (toolMode === 'sfx') elemType = 'SOUND_EFFECT';

    // Đơn vị px chuẩn trên canvas trang (Lỗi 1):
    // Balloon thông thường ~280px x 160px (chứa được ~90 ký tự theo LetteringLimits)
    const width = elemType === 'SOUND_EFFECT' ? 240 : 280;
    const height = elemType === 'SOUND_EFFECT' ? 120 : 160;
    const x = Math.max(0, Math.min(pageDim.width - width, Math.round(clickX - width / 2)));
    const y = Math.max(0, Math.min(pageDim.height - height, Math.round(clickY - height / 2)));

    const content = selectedScriptLine
      ? selectedScriptLine.dialogueText || selectedScriptLine.stageDirection || 'Nhập lời thoại...'
      : 'Lời thoại mới...';

    const clientElementId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `elem-${Date.now()}`;

    const newReq = {
      elementType: elemType,
      x,
      y,
      width,
      height,
      zIndex: elements.length + 1,
      content,
      scriptLineId: selectedScriptLine ? selectedScriptLine.id : undefined,
      clientElementId,
    };

    // Kiểm tra nếu offline -> enqueue vào offline queue (NFR-09)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ADD_ELEMENT',
        endpoint: `/pages/${activePageId}/elements`,
        method: 'POST',
        payload: newReq,
        clientRefId: clientElementId,
      });

      const tempItem: ElementSnapshotDto = {
        elementId: clientElementId,
        elementType: elemType,
        x,
        y,
        width,
        height,
        zIndex: newReq.zIndex,
        content,
        isRemoved: false,
        version: 1,
        scriptLineId: selectedScriptLine ? selectedScriptLine.id : null,
      };
      setElements((prev) => [...prev, tempItem]);
      setSelectedElementId(tempItem.elementId);
      setSelectedScriptLine(null);
      showToast('Đã lưu ngoại tuyến', 'Bóng thoại đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const res = await elementService.addElement(activePageId, newReq);
      const newElem: ElementSnapshotDto = {
        elementId: res.elementId,
        elementType: elemType,
        x,
        y,
        width,
        height,
        zIndex: newReq.zIndex,
        content,
        isRemoved: false,
        version: 1,
        scriptLineId: res.scriptLineId || (selectedScriptLine ? selectedScriptLine.id : null),
        speakerId: res.speakerId,
      };
      setElements((prev) => [...prev, newElem]);
      setSelectedElementId(newElem.elementId);
      setSelectedScriptLine(null);
      showToast('Đã thêm bóng thoại', `Đã đặt ${elemType} lên trang canvas.`);
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ADD_ELEMENT',
          endpoint: `/pages/${activePageId}/elements`,
          method: 'POST',
          payload: newReq,
          clientRefId: clientElementId,
        });
        const tempItem: ElementSnapshotDto = {
          elementId: clientElementId,
          elementType: elemType,
          x,
          y,
          width,
          height,
          zIndex: newReq.zIndex,
          content,
          isRemoved: false,
          version: 1,
          scriptLineId: selectedScriptLine ? selectedScriptLine.id : null,
        };
        setElements((prev) => [...prev, tempItem]);
        setSelectedElementId(tempItem.elementId);
        setSelectedScriptLine(null);
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Bóng thoại đã được lưu tạm vào hàng đợi.');
      } else {
        handleConcurrencyError(err);
      }
    }
  };

  // Di chuyển vị trí Balloon (PUT /api/pages/{pageId}/elements/{elementId}/position)
  const moveBalloon = async (
    elementId: string,
    newPxX: number,
    newPxY: number,
    newPxW?: number,
    newPxH?: number,
  ) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);
    const finalW = newPxW ?? box.pxW;
    const finalH = newPxH ?? box.pxH;
    const clampedX = Math.max(0, Math.min(pageDim.width - finalW, Math.round(newPxX)));
    const clampedY = Math.max(0, Math.min(pageDim.height - finalH, Math.round(newPxY)));

    setElements((prev) =>
      prev.map((b) =>
        b.elementId === elementId
          ? { ...b, x: clampedX, y: clampedY, width: finalW, height: finalH }
          : b,
      ),
    );

    const payload: MoveElementRequest = {
      newX: clampedX,
      newY: clampedY,
      newWidth: finalW,
      newHeight: finalH,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'MOVE_ELEMENT',
        endpoint: `/pages/${activePageId}/elements/${elementId}/position`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      return;
    }

    try {
      await elementService.moveElement(activePageId, elementId, payload);
      setElements((prev) =>
        prev.map((b) => (b.elementId === elementId ? { ...b, version: (b.version || 1) + 1 } : b)),
      );
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'MOVE_ELEMENT',
          endpoint: `/pages/${activePageId}/elements/${elementId}/position`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã lưu tạm vị trí bóng thoại.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Bắt đầu kéo thả bóng thoại trên canvas
  const handleBalloonPointerDown = (e: React.PointerEvent<HTMLDivElement>, elementId: string) => {
    if (isReadOnly) return;
    e.stopPropagation();
    setSelectedElementId(elementId);

    const target = elements.find((el) => el.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);

    draggingRef.current = {
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      initialPxX: box.pxX,
      initialPxY: box.pxY,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!draggingRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaScreenX = moveEvt.clientX - draggingRef.current.startX;
      const deltaScreenY = moveEvt.clientY - draggingRef.current.startY;
      const deltaPxX = (deltaScreenX / rect.width) * pageDim.width;
      const deltaPxY = (deltaScreenY / rect.height) * pageDim.height;

      const newX = draggingRef.current.initialPxX + deltaPxX;
      const newY = draggingRef.current.initialPxY + deltaPxY;

      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elementId
            ? { ...b, x: Math.round(newX), y: Math.round(newY), width: box.pxW, height: box.pxH }
            : b,
        ),
      );
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (!draggingRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaScreenX = upEvt.clientX - draggingRef.current.startX;
      const deltaScreenY = upEvt.clientY - draggingRef.current.startY;

      // Chỉ gửi request nếu có di chuyển
      if (Math.abs(deltaScreenX) > 2 || Math.abs(deltaScreenY) > 2) {
        const deltaPxX = (deltaScreenX / rect.width) * pageDim.width;
        const deltaPxY = (deltaScreenY / rect.height) * pageDim.height;
        const finalX = draggingRef.current.initialPxX + deltaPxX;
        const finalY = draggingRef.current.initialPxY + deltaPxY;
        moveBalloon(elementId, finalX, finalY, box.pxW, box.pxH);
      }
      draggingRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Cập nhật văn bản Element (PUT /api/pages/{pageId}/elements/{elementId}/text)
  const updateBalloonText = async (elementId: string, text: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    setElements((prev) =>
      prev.map((b) => (b.elementId === elementId ? { ...b, content: text } : b)),
    );

    const payload = {
      content: text,
      scriptLineId: target.scriptLineId || undefined,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'UPDATE_ELEMENT_TEXT',
        endpoint: `/pages/${activePageId}/elements/${elementId}/text`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      return;
    }

    try {
      await elementService.updateElementText(activePageId, elementId, payload);
      setElements((prev) =>
        prev.map((b) => (b.elementId === elementId ? { ...b, version: (b.version || 1) + 1 } : b)),
      );
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'UPDATE_ELEMENT_TEXT',
          endpoint: `/pages/${activePageId}/elements/${elementId}/text`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã lưu tạm chỉnh sửa thoại.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Cập nhật thứ tự đọc (PUT /api/pages/{pageId}/elements/{elementId}/reading-order)
  const handleSetReadingOrder = async (elementId: string, order: number | null) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    setElements((prev) =>
      prev.map((b) => (b.elementId === elementId ? { ...b, readingOrder: order } : b)),
    );

    const payload = {
      readingOrder: order,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'SET_READING_ORDER',
        endpoint: `/pages/${activePageId}/elements/${elementId}/reading-order`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      showToast('Đã lưu ngoại tuyến', `Đã lưu tạm thứ tự đọc #${order}.`);
      return;
    }

    try {
      await elementService.setReadingOrder(activePageId, elementId, payload);
      setElements((prev) =>
        prev.map((b) => (b.elementId === elementId ? { ...b, version: (b.version || 1) + 1 } : b)),
      );
      showToast('Thứ tự đọc', `Đã cập nhật thứ tự đọc #${order}.`);
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'SET_READING_ORDER',
          endpoint: `/pages/${activePageId}/elements/${elementId}/reading-order`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã lưu tạm thứ tự đọc #${order}.`);
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Xác nhận tràn chữ (POST /api/pages/{pageId}/elements/{elementId}/overflow-ack)
  const handleAckOverflow = async (elementId: string) => {
    const reason = ackReason.trim() || 'Letterer đã xem xét và chấp nhận bố cục';
    try {
      await elementService.acknowledgeOverflow(activePageId, elementId, { reason });
      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elementId ? { ...b, overflowAcknowledgedReason: reason } : b,
        ),
      );
      setAckReason('');
      showToast('Xác nhận tràn chữ', 'Đã lưu xác nhận tràn chữ thành công.');
    } catch (err: any) {
      handleConcurrencyError(err, elementId);
    }
  };

  // Xóa Element (DELETE /api/pages/{pageId}/elements/{elementId})
  const deleteBalloon = async (elementId: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    if (!confirm('Bạn có chắc muốn xóa phần tử bóng thoại này?')) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'DELETE_ELEMENT',
        endpoint: `/pages/${activePageId}/elements/${elementId}`,
        method: 'DELETE',
        payload: { expectedElementVersion: target.version },
        clientRefId: elementId,
      });
      setElements((prev) => prev.filter((b) => b.elementId !== elementId));
      setSelectedElementId(null);
      showToast('Đã lưu ngoại tuyến', 'Đã xóa tạm thời phần tử trên máy.');
      return;
    }

    try {
      await elementService.removeElement(activePageId, elementId, target.version);
      setElements((prev) => prev.filter((b) => b.elementId !== elementId));
      setSelectedElementId(null);
      showToast('Đã xóa bóng thoại', 'Phần tử đã được gỡ khỏi canvas.');
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'DELETE_ELEMENT',
          endpoint: `/pages/${activePageId}/elements/${elementId}`,
          method: 'DELETE',
          payload: { expectedElementVersion: target.version },
          clientRefId: elementId,
        });
        setElements((prev) => prev.filter((b) => b.elementId !== elementId));
        setSelectedElementId(null);
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã xóa tạm thời phần tử trên máy.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Đồng bộ lại thoại kịch bản khi kịch bản bị sửa đổi sau khi đặt (BR-05 / isStale)
  const handleSyncStaleText = async (elem: ElementSnapshotDto) => {
    if (!elem.currentLineText) return;
    try {
      await elementService.updateElementText(activePageId, elem.elementId, {
        content: elem.currentLineText,
        scriptLineId: elem.scriptLineId || undefined,
        expectedElementVersion: elem.version,
      });
      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elem.elementId
            ? {
                ...b,
                content: elem.currentLineText!,
                isStale: false,
                version: (b.version || 1) + 1,
              }
            : b,
        ),
      );
      showToast('Đã đồng bộ thoại mới', 'Bóng thoại đã được cập nhật khớp với kịch bản mới nhất.');
    } catch (err: any) {
      handleConcurrencyError(err, elem.elementId);
    }
  };

  const selectedElement = elements.find((e) => e.elementId === selectedElementId);
  const selectedElementBox = selectedElement ? getNormalizedElementBox(selectedElement) : null;

  if (!activePageId) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 text-center bg-[#FAF8F5]'>
        <div className='w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4'>
          <Type className='w-8 h-8' />
        </div>
        <h3 className='text-base font-bold text-zinc-800 mb-1'>Chọn một trang để bắt đầu</h3>
        <p className='text-xs text-zinc-500 max-w-sm'>
          Vui lòng chọn một chương và trang truyện từ danh sách phía trên để mở bàn làm việc chèn
          chữ.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full bg-[#FAF8F5] text-[#171717] overflow-hidden'>
      {/* Offline Status Indicator (NFR-09) */}
      <OfflineStatusBanner />

      {/* Top Action Bar */}
      <div className='h-14 border-b border-[#E7E7E7] bg-white px-4 flex items-center justify-between shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200/50'>
            <Type className='w-5 h-5' />
          </div>
          <div>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <span>Bàn Làm Việc Kỹ Thuật Chèn Chữ (Lettering Workspace)</span>
              {pageSnapshot && (
                <span className='font-mono text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600'>
                  v{pageSnapshot.version} • {pageDim.width}×{pageDim.height}px
                </span>
              )}
            </h3>
            <p className='text-[11px] text-[#888888]'>
              Đặt thoại, bóng thoại (Speech/Thought/SFX) &amp; neo dòng kịch bản chuẩn BR-11 &amp;
              BR-20
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={loadElements}
            disabled={loading}
            className='p-2 hover:bg-[#FAF8F5] rounded-xl text-zinc-600 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer'
            title='Tải lại canvas'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Drawer: Script Line Queue (320px) */}
        <div className='w-80 shrink-0 bg-white border-r border-[#E7E7E7] flex flex-col overflow-hidden'>
          <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F5] space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold text-[#171717] flex items-center gap-1.5'>
                <BookOpen className='w-4 h-4 text-purple-600' />
                <span>Kịch Bản Chương</span>
              </span>
              <span className='text-[11px] font-mono text-zinc-500'>{sceneLines.length} dòng</span>
            </div>

            {/* Scene Selector */}
            <select
              value={selectedSceneId || ''}
              onChange={(e) => setSelectedSceneId(e.target.value)}
              className='w-full p-2 bg-white border border-[#E7E7E7] rounded-xl text-xs font-semibold'
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Phân cảnh #{s.sceneNumber}: {s.heading || 'Không tiêu đề'}
                </option>
              ))}
            </select>
          </div>

          <div className='flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar'>
            {sceneLines.length === 0 ? (
              <div className='p-6 text-center text-xs text-zinc-400'>
                Chưa có dòng kịch bản nào trong phân cảnh này.
              </div>
            ) : (
              sceneLines.map((line) => {
                const isSelected = selectedScriptLine?.id === line.id;
                const isPlaced = elements.some((e) => e.scriptLineId === line.id);
                return (
                  <div
                    key={line.id}
                    onClick={() => setSelectedScriptLine(isSelected ? null : line)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-400/20 shadow-xs'
                        : isPlaced
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-[#E7E7E7] bg-[#FAF8F5] hover:bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-mono font-bold text-[10px] text-zinc-500'>
                        #{line.lineOrder} • {line.speakerName || 'Người dẫn truyện'}
                      </span>
                      {isPlaced && (
                        <span className='text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5'>
                          <CheckCircle2 className='w-2.5 h-2.5' /> Đã đặt
                        </span>
                      )}
                    </div>
                    <p className='font-medium text-zinc-800 line-clamp-2'>
                      {line.dialogueText || line.stageDirection}
                    </p>
                    {isSelected && (
                      <div className='text-[10px] font-semibold text-purple-700 flex items-center gap-1 pt-1 border-t border-purple-200'>
                        <Plus className='w-3 h-3' /> Bấm lên canvas để đặt dòng thoại này
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Canvas Area */}
        <div className='flex-1 flex flex-col overflow-hidden bg-[#EFECE6] p-4 items-center justify-center relative'>
          {/* Tool mode switch floating bar */}
          <div className='absolute top-6 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-black/5 flex items-center gap-1'>
            <button
              onClick={() => setToolMode('select')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'select'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Move className='w-3.5 h-3.5' /> Chọn / Kéo
            </button>
            <div className='w-px h-4 bg-zinc-200 mx-1'></div>
            <button
              onClick={() => setToolMode('balloon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'balloon'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <MessageCircle className='w-3.5 h-3.5' /> Thoại thường
            </button>
            <button
              onClick={() => setToolMode('thought')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'thought'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Sparkles className='w-3.5 h-3.5' /> Suy nghĩ
            </button>
            <button
              onClick={() => setToolMode('narration')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'narration'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <FileText className='w-3.5 h-3.5' /> Dẫn truyện
            </button>
            <button
              onClick={() => setToolMode('sfx')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'sfx'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className='font-display font-black text-xs'>SFX</span> Hiệu ứng âm
            </button>
          </div>

          {/* Interactive Page Canvas Container */}
          <div className='w-full max-w-[560px] h-[90%] flex items-center justify-center p-2'>
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className='relative w-full h-full bg-white rounded-lg shadow-2xl border border-black/10 overflow-hidden cursor-crosshair select-none'
              style={{
                aspectRatio: `${pageDim.width} / ${pageDim.height}`,
              }}
            >
              {/* Safe Margin Guides */}
              <div className='absolute inset-3 border border-blue-200/50 pointer-events-none'></div>

              {/* Elements on canvas */}
              {elements.map((b) => {
                const isSelected = selectedElementId === b.elementId;
                const isImageLayer = IMAGE_LAYER_TYPES.includes(b.elementType as any);
                const isThought = b.elementType === 'THOUGHT_BALLOON';
                const isNarration = b.elementType === 'NARRATION_BOX';
                const isSfx = b.elementType === 'SOUND_EFFECT';
                const box = getNormalizedElementBox(b);

                if (isImageLayer) {
                  return (
                    <div
                      key={b.elementId}
                      className='absolute pointer-events-none select-none border border-dashed border-purple-400/40 rounded overflow-hidden'
                      style={{
                        left: `${box.percentLeft}%`,
                        top: `${box.percentTop}%`,
                        width: `${box.percentWidth}%`,
                        height: `${box.percentHeight}%`,
                        transform: `rotate(${b.rotation || 0}deg)`,
                        transformOrigin: 'center center',
                        zIndex: b.zIndex || 1,
                      }}
                      data-testid={`letterer-image-layer-${b.elementId}`}
                    >
                      {b.content?.startsWith('http') || b.content?.startsWith('data:') ? (
                        <img
                          src={b.content}
                          alt={b.elementType}
                          className='w-full h-full object-contain'
                        />
                      ) : (
                        <div className='w-full h-full bg-purple-500/10 flex items-center justify-center p-1 text-center'>
                          <span className='text-[9px] font-semibold text-purple-700 font-mono'>
                            [{LAYER_LABELS[b.elementType] || b.elementType}]
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={b.elementId}
                    onPointerDown={(e) => handleBalloonPointerDown(e, b.elementId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(b.elementId);
                    }}
                    className={`speech-balloon absolute p-3 transition-all select-none cursor-move ${
                      isNarration
                        ? 'bg-[#FFFBEB] border-2 rounded-none'
                        : isThought
                          ? 'bg-white border-2 border-dashed rounded-[40px]'
                          : isSfx
                            ? 'bg-transparent border-0 font-display font-black text-red-600'
                            : 'bg-white border-2 rounded-3xl'
                    } ${
                      isSelected
                        ? 'border-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.25)] z-30'
                        : b.isStale
                          ? 'border-amber-500 ring-2 ring-amber-400/40 z-20'
                          : 'border-[#171717] hover:border-[#10B981] z-10'
                    }`}
                    style={{
                      left: `${box.percentLeft}%`,
                      top: `${box.percentTop}%`,
                      width: `${box.percentWidth}%`,
                      minHeight: `${box.percentHeight}%`,
                    }}
                  >
                    {/* Badge Thứ tự đọc */}
                    {b.readingOrder != null && (
                      <span className='absolute -top-2.5 -left-2 bg-[#171717] text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow-2xs'>
                        #{b.readingOrder}
                      </span>
                    )}

                    {/* Stale Warning Badge (BR-05) */}
                    {b.isStale && (
                      <span className='absolute -top-2.5 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs flex items-center gap-1 animate-pulse'>
                        <AlertTriangle className='w-2.5 h-2.5' /> Sửa đổi
                      </span>
                    )}

                    <textarea
                      value={b.content || ''}
                      onChange={(e) => updateBalloonText(b.elementId, e.target.value)}
                      readOnly={isReadOnly}
                      className='w-full bg-transparent text-center font-bold text-xs text-[#171717] resize-none focus:outline-none'
                      rows={2}
                    />

                    {/* Balloon tail indicator */}
                    {!isNarration && !isThought && !isSfx && (
                      <div className='absolute -bottom-[8px] left-1/2 transform -translate-x-1/2 w-3.5 h-3.5 bg-white border-b-2 border-r-2 border-[#171717] rotate-45 pointer-events-none'></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Drawer: Properties */}
        <div className='w-full md:w-80 shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col overflow-hidden'>
          <div className='p-4 border-b border-[#E7E7E7] flex items-center gap-2 bg-[#FAF8F5]'>
            <Type className='w-4 h-4 text-emerald-600' />
            <h4 className='font-bold text-sm uppercase tracking-wider text-[#171717]'>
              Thuộc Tính Phần Tử
            </h4>
          </div>

          {selectedElement && selectedElementBox ? (
            <div className='p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar text-xs'>
              {/* Stale Alert & Resolution */}
              {selectedElement.isStale && (
                <div className='p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-900'>
                  <div className='font-bold flex items-center gap-1.5 text-xs'>
                    <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
                    <span>Thoại gốc đã đổi trong kịch bản (BR-05)</span>
                  </div>
                  <p className='text-[11px] text-amber-800 leading-relaxed'>
                    Nội dung kịch bản mới: <strong>"{selectedElement.currentLineText}"</strong>
                  </p>
                  <button
                    onClick={() => handleSyncStaleText(selectedElement)}
                    className='w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer'
                  >
                    Cập nhật theo kịch bản mới
                  </button>
                </div>
              )}

              {/* Tọa độ và kích thước pixel thực tế trên canvas (Lỗi 1) */}
              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
                <div className='flex items-center justify-between text-zinc-500 text-[10px] uppercase font-mono'>
                  <span>Tọa độ canvas trang (px)</span>
                  <span className='text-emerald-700 font-bold'>
                    {pageDim.width}×{pageDim.height}px
                  </span>
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs font-mono'>
                  <div>
                    <label className='block text-zinc-400 text-[10px]'>X (px):</label>
                    <input
                      type='number'
                      value={Math.round(selectedElementBox.pxX || 0)}
                      onChange={(e) =>
                        moveBalloon(
                          selectedElement.elementId,
                          parseFloat(e.target.value) || 0,
                          selectedElementBox.pxY,
                        )
                      }
                      className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                    />
                  </div>
                  <div>
                    <label className='block text-zinc-400 text-[10px]'>Y (px):</label>
                    <input
                      type='number'
                      value={Math.round(selectedElementBox.pxY || 0)}
                      onChange={(e) =>
                        moveBalloon(
                          selectedElement.elementId,
                          selectedElementBox.pxX,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                    />
                  </div>
                  <div>
                    <label className='block text-zinc-400 text-[10px]'>Rộng (px):</label>
                    <input
                      type='number'
                      value={Math.round(selectedElementBox.pxW || 0)}
                      onChange={(e) =>
                        moveBalloon(
                          selectedElement.elementId,
                          selectedElementBox.pxX,
                          selectedElementBox.pxY,
                          parseFloat(e.target.value) || 100,
                          selectedElementBox.pxH,
                        )
                      }
                      className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                    />
                  </div>
                  <div>
                    <label className='block text-zinc-400 text-[10px]'>Cao (px):</label>
                    <input
                      type='number'
                      value={Math.round(selectedElementBox.pxH || 0)}
                      onChange={(e) =>
                        moveBalloon(
                          selectedElement.elementId,
                          selectedElementBox.pxX,
                          selectedElementBox.pxY,
                          selectedElementBox.pxW,
                          parseFloat(e.target.value) || 60,
                        )
                      }
                      className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                    />
                  </div>
                </div>
              </div>

              {/* Reading Order Override */}
              <div className='space-y-1.5'>
                <label className='block font-semibold text-zinc-700 flex items-center justify-between'>
                  <span className='flex items-center gap-1'>
                    <ListOrdered className='w-3.5 h-3.5 text-blue-600' />
                    <span>Thứ Tự Đọc (Reading Order)</span>
                  </span>
                  <span className='font-mono text-[10px] text-zinc-400'>
                    v{selectedElement.version || 1}
                  </span>
                </label>
                <div className='flex gap-2'>
                  <input
                    type='number'
                    value={selectedElement.readingOrder ?? ''}
                    placeholder='Tự động'
                    onChange={(e) =>
                      handleSetReadingOrder(
                        selectedElement.elementId,
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )
                    }
                    className='flex-1 p-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg font-mono text-xs'
                  />
                  <button
                    onClick={() => handleSetReadingOrder(selectedElement.elementId, null)}
                    className='px-2.5 py-1 text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg cursor-pointer'
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Element Type Details */}
              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1.5'>
                <div className='text-zinc-500 text-[10px] uppercase font-mono'>
                  Loại phần tử &amp; ID
                </div>
                <div className='font-bold text-[#171717]'>{selectedElement.elementType}</div>
                <div className='font-mono text-[10px] text-zinc-400 truncate select-all'>
                  {selectedElement.elementId}
                </div>
              </div>

              {/* Overflow Acknowledgment Section */}
              <div className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2'>
                <div className='font-semibold text-zinc-800 text-[11px]'>
                  Xác nhận cảnh báo tràn chữ (Overflow)
                </div>
                {selectedElement.overflowAcknowledgedReason ? (
                  <div className='text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200'>
                    ✓ Đã xác nhận: {selectedElement.overflowAcknowledgedReason}
                  </div>
                ) : (
                  <>
                    <input
                      type='text'
                      value={ackReason}
                      onChange={(e) => setAckReason(e.target.value)}
                      placeholder='Lý do chấp nhận tràn chữ...'
                      className='w-full p-1.5 bg-white border border-zinc-300 rounded text-[11px]'
                    />
                    <button
                      onClick={() => handleAckOverflow(selectedElement.elementId)}
                      className='w-full py-1 bg-zinc-800 hover:bg-black text-white text-[11px] font-semibold rounded transition-colors cursor-pointer'
                    >
                      Xác nhận tràn chữ
                    </button>
                  </>
                )}
              </div>

              {/* Delete Button */}
              {!isReadOnly && (
                <div className='pt-3 border-t border-[#E7E7E7]'>
                  <button
                    onClick={() => deleteBalloon(selectedElement.elementId)}
                    className='w-full py-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer'
                  >
                    <Trash2 className='w-4 h-4' /> Xóa phần tử này
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className='p-8 text-center text-xs text-zinc-400 flex-1 flex flex-col items-center justify-center'>
              <MessageCircle className='w-8 h-8 mb-2 opacity-40' />
              <p className='font-semibold text-zinc-600'>Chưa chọn bóng thoại</p>
              <p className='text-[11px] text-zinc-400 mt-1 max-w-xs'>
                Bấm vào một bóng thoại trên canvas hoặc chọn dòng kịch bản để đặt bóng mới.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Concurrency Conflict Modal (BR-11) */}
      <ElementConflictModal
        isOpen={conflictModalOpen}
        elementId={conflictElementId}
        errorMessage={conflictErrorMsg}
        onReload={loadElements}
        onClose={() => setConflictModalOpen(false)}
      />
    </div>
  );
};

export default LetteringWorkspace;

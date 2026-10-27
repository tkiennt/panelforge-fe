import type { AssignmentDto, PanelDto, ReturnWorkFromReviewRequest } from '@/types';
import type { ElementSnapshotDto } from '@/services/element.service';
import type { PipelineStageDto } from '@/services/pipeline.service';
import { parseBoundingBox } from '@/shared/utils/panelBoundingBox';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CHECKLIST_ITEMS = [
  { id: 'script', label: 'Thoại đúng kịch bản phân cảnh' },
  { id: 'bible', label: 'Nhất quán nhân vật & Series Bible' },
  { id: 'readingOrder', label: 'Thứ tự đọc manga (phải qua trái) chính xác' },
  { id: 'artQuality', label: 'Chất lượng nét vẽ & ảnh hoàn thiện' },
  { id: 'spelling', label: 'Chính tả & bố cục bóng thoại không che mặt' },
] as const;

export type ChecklistId = (typeof CHECKLIST_ITEMS)[number]['id'];

/** Làm tròn số toạ độ chuẩn hoá 4 chữ số thập phân */
export const roundCoord = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * Chuẩn hoá vùng khoanh kéo chuột sang hộp [0, 1] trên khổ trang.
 */
export function normalizeRegionBox(
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  width: number,
  height: number,
): Box {
  const w = width > 0 ? width : 1;
  const h = height > 0 ? height : 1;

  const nx1 = Math.min(1, Math.max(0, startX / w));
  const ny1 = Math.min(1, Math.max(0, startY / h));
  const nx2 = Math.min(1, Math.max(0, curX / w));
  const ny2 = Math.min(1, Math.max(0, curY / h));

  return {
    x: roundCoord(Math.min(nx1, nx2)),
    y: roundCoord(Math.min(ny1, ny2)),
    w: roundCoord(Math.abs(nx2 - nx1)),
    h: roundCoord(Math.abs(ny2 - ny1)),
  };
}

/**
 * Parse chuỗi JSON vùng khoanh lưu trữ sang Box chuẩn hoá.
 * Hỗ trợ cả {x, y, w, h} và {x, y, width, height}.
 */
export function parseRegionBox(regionJson?: string | null): Box | null {
  if (!regionJson) return null;
  try {
    const raw = JSON.parse(regionJson);
    const w = typeof raw.w === 'number' ? raw.w : typeof raw.width === 'number' ? raw.width : null;
    const h =
      typeof raw.h === 'number' ? raw.h : typeof raw.height === 'number' ? raw.height : null;
    if (typeof raw.x === 'number' && typeof raw.y === 'number' && w !== null && h !== null) {
      return {
        x: Math.min(1, Math.max(0, roundCoord(raw.x))),
        y: Math.min(1, Math.max(0, roundCoord(raw.y))),
        w: Math.min(1, Math.max(0, roundCoord(w))),
        h: Math.min(1, Math.max(0, roundCoord(h))),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tìm Panel có phần diện tích giao lớn nhất với vùng khoanh (chuẩn hoá 0..1).
 */
export function findIntersectingPanelId(box: Box, panels: PanelDto[]): string | undefined {
  if (!panels || panels.length === 0 || box.w <= 0 || box.h <= 0) return undefined;

  let maxArea = 0;
  let bestPanelId: string | undefined = undefined;

  for (const p of panels) {
    if (!p.boundingBox) continue;
    try {
      const parsed = parseBoundingBox(p.boundingBox);
      const pBox: Box = {
        x: parsed.percentX / 100,
        y: parsed.percentY / 100,
        w: parsed.percentW / 100,
        h: parsed.percentH / 100,
      };

      const ox = Math.max(0, Math.min(box.x + box.w, pBox.x + pBox.w) - Math.max(box.x, pBox.x));
      const oy = Math.max(0, Math.min(box.y + box.h, pBox.y + pBox.h) - Math.max(box.y, pBox.y));
      const area = ox * oy;

      if (area > maxArea) {
        maxArea = area;
        bestPanelId = p.id;
      }
    } catch {
      /* ignore invalid boundingBox */
    }
  }

  return bestPanelId;
}

/**
 * Kiểm tra xem vùng khoanh có đè lên phần tử chữ / bóng thoại nào trên trang hay không.
 */
export function isRegionOverlappingText(
  box: Box,
  elements: ElementSnapshotDto[],
  pageWidth = 1200,
  pageHeight = 1800,
): boolean {
  if (!elements || elements.length === 0 || box.w <= 0 || box.h <= 0) return false;

  const TEXT_TYPES = new Set([
    'SPEECH_BALLOON',
    'THOUGHT_BALLOON',
    'SHOUT_BALLOON',
    'NARRATION_BOX',
    'SFX',
    'TEXT',
  ]);

  for (const el of elements) {
    const elType = String(el.elementType || '').toUpperCase();
    if (!TEXT_TYPES.has(elType)) continue;

    // Toạ độ pixel hoặc chuẩn hoá
    const isPixel =
      (el.width ?? 0) > 1 || (el.height ?? 0) > 1 || (el.x ?? 0) > 1 || (el.y ?? 0) > 1;
    const elBox: Box = isPixel
      ? {
          x: (el.x ?? 0) / pageWidth,
          y: (el.y ?? 0) / pageHeight,
          w: (el.width ?? 200) / pageWidth,
          h: (el.height ?? 100) / pageHeight,
        }
      : {
          x: el.x ?? 0,
          y: el.y ?? 0,
          w: el.width ?? 0.2,
          h: el.height ?? 0.1,
        };

    const ox = Math.max(0, Math.min(box.x + box.w, elBox.x + elBox.w) - Math.max(box.x, elBox.x));
    const oy = Math.max(0, Math.min(box.y + box.h, elBox.y + elBox.h) - Math.max(box.y, elBox.y));
    if (ox * oy > 0.0001) {
      return true;
    }
  }

  return false;
}

/**
 * Gợi ý công đoạn cần sửa dựa trên vùng khoanh:
 * - Nếu đè bóng thoại / chữ: gợi ý stage Letter.
 * - Ngược lại: gợi ý Color (nếu có), fallback sang Ink hoặc Pencil.
 */
export function suggestTargetAssignment(
  box: Box,
  pageAssignments: AssignmentDto[],
  elements: ElementSnapshotDto[],
  stages: PipelineStageDto[],
  pageWidth = 1200,
  pageHeight = 1800,
): string | undefined {
  if (!pageAssignments || pageAssignments.length === 0) return undefined;

  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const hasTextOverlap = isRegionOverlappingText(box, elements, pageWidth, pageHeight);

  if (hasTextOverlap) {
    const letterAssign = pageAssignments.find((a) => {
      const st = stageMap.get(a.pipelineStageId);
      const name = (st?.name || a.assignedRole || '').toLowerCase();
      return (
        name.includes('letter') ||
        String(st?.slug || '')
          .toLowerCase()
          .includes('letter')
      );
    });
    if (letterAssign) return letterAssign.id;
  }

  // Ngược lại gợi ý Color -> Ink -> Pencil -> Thumbnail
  const priorities = ['color', 'ink', 'pencil', 'thumbnail'];
  for (const pri of priorities) {
    const match = pageAssignments.find((a) => {
      const st = stageMap.get(a.pipelineStageId);
      const name = (st?.name || '').toLowerCase();
      const slug = (st?.slug || '').toLowerCase();
      return name.includes(pri) || slug.includes(pri);
    });
    if (match) return match.id;
  }

  return pageAssignments[0]?.id;
}

/**
 * Xây dựng payload gọi POST .../return-work đảm bảo quy tắc backend:
 * - description bắt buộc
 * - regionJson dạng {"x","y","w","h"} chuẩn hoá 0-1 (KHÔNG dùng width/height)
 * - panelId chỉ gửi khi khung đó thuộc đúng việc được chọn (Page-level cùng trang hoặc Panel-level đúng panel)
 */
export function buildReturnWorkPayload(params: {
  targetAssignmentId: string;
  description: string;
  box?: Box | null;
  panelId?: string | null;
  targetAssignment?: AssignmentDto;
  dueDate?: string;
}): ReturnWorkFromReviewRequest {
  const { targetAssignmentId, description, box, panelId, targetAssignment, dueDate } = params;

  let safePanelId: string | undefined = undefined;
  if (panelId && targetAssignment) {
    if (targetAssignment.entityType === 'Panel') {
      if (targetAssignment.targetEntityId === panelId) {
        safePanelId = panelId;
      }
    } else if (targetAssignment.entityType === 'Page') {
      safePanelId = panelId;
    }
  }

  let regionJson: string | undefined = undefined;
  if (box && box.w > 0 && box.h > 0) {
    regionJson = JSON.stringify({
      x: roundCoord(box.x),
      y: roundCoord(box.y),
      w: roundCoord(box.w),
      h: roundCoord(box.h),
    });
  }

  return {
    targetAssignmentId,
    description: description.trim(),
    regionJson,
    panelId: safePanelId,
    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
  };
}

/**
 * Nhận diện lỗi 409 khi target assignment đang chờ duyệt.
 */
export function parse409AwaitingReview(
  error: any,
  targetAssignmentId?: string,
): { isAwaitingReview: boolean; message: string; targetAssignmentId?: string } {
  const data = error?.response?.data || error?.data;
  const status = error?.response?.status ?? error?.status;
  const rawMsg =
    (typeof data === 'string' ? data : data?.error || data?.message || error?.message) ?? '';

  const isAwaitingReview =
    status === 409 &&
    (rawMsg.toLowerCase().includes('đang chờ duyệt') ||
      rawMsg.toLowerCase().includes('chờ duyệt') ||
      rawMsg.toLowerCase().includes('cổng duyệt'));

  return {
    isAwaitingReview,
    message: rawMsg || 'Xung đột khi trả việc (409 Conflict).',
    targetAssignmentId,
  };
}

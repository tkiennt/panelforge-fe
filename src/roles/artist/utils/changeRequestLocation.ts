// Vị trí của một yêu cầu sửa trên bàn vẽ ("Xem vị trí"): trang, khung và vùng Editor đã khoanh.
import type { ChangeRequestDto, PanelDto } from '@/types';

export interface ChangeRequestLocation {
  pageId: string;
  panelId: string | null;
  /** Vùng khoanh, toạ độ 0–1 theo trang (đúng cách Editor lưu regionJson). */
  box: { x: number; y: number; w: number; h: number } | null;
  stageId: string | null;
}

/** regionJson Editor lưu: { x, y, w, h } 0–1 theo trang (bản cũ có thể dùng width / height). */
function parseRegion(regionJson?: string | null): ChangeRequestLocation['box'] {
  if (!regionJson) return null;
  try {
    const r = JSON.parse(regionJson);
    const w = typeof r.w === 'number' ? r.w : r.width;
    const h = typeof r.h === 'number' ? r.h : r.height;
    if ([r.x, r.y, w, h].some((v) => typeof v !== 'number') || w <= 0 || h <= 0) return null;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp(r.x), y: clamp(r.y), w: clamp(w), h: clamp(h) };
  } catch {
    return null;
  }
}

/** Yêu cầu có thông tin vị trí để hiện nút "Xem vị trí" hay không. */
export function hasChangeRequestLocation(cr: ChangeRequestDto): boolean {
  return Boolean(cr.pageId || cr.panelId);
}

/**
 * Trang ưu tiên `pageId` BE trả về; dữ liệu cũ chưa có thì tìm trang chứa `panelId`
 * (cả field panelId lẫn panelId nằm trong regionJson kiểu cũ). Không xác định được trang → null.
 */
export function resolveChangeRequestLocation(
  cr: ChangeRequestDto,
  panelsByPageId: Record<string, PanelDto[]>,
): ChangeRequestLocation | null {
  let panelId = cr.panelId ?? null;
  if (!panelId && cr.regionJson) {
    try {
      const legacy = JSON.parse(cr.regionJson);
      if (typeof legacy?.panelId === 'string') panelId = legacy.panelId;
    } catch {
      // regionJson không phải JSON: bỏ qua
    }
  }

  let pageId = cr.pageId ?? null;
  if (!pageId && panelId) {
    pageId =
      Object.entries(panelsByPageId).find(([, list]) => list.some((p) => p.id === panelId))?.[0] ??
      null;
  }
  if (!pageId) return null;

  return {
    pageId,
    panelId,
    box: parseRegion(cr.regionJson),
    stageId: cr.pipelineStageId ?? null,
  };
}

/** BE có thể trả status dạng chuỗi ('Open') hoặc số (0 = Open). */
export function isOpenChangeRequest(cr: ChangeRequestDto): boolean {
  const s = String(cr.status).toLowerCase();
  return s === 'open' || s === '0';
}

export interface PageChangeRequestMark extends ChangeRequestLocation {
  id: string;
  description: string;
  /** Vùng được khoanh trên một phiên bản tranh không còn hiện trên trang (Artist đã tải bản mới). */
  onOlderVersion: boolean;
}

/**
 * Vùng cần sửa hiện trên một trang: mọi yêu cầu còn Mở của các công đoạn Artist làm.
 * Vùng gắn với trạng thái yêu cầu, không gắn với ảnh: tải bản mới không xoá vùng
 * (chưa chắc đã sửa đúng), chỉ mất khi yêu cầu rời trạng thái Mở.
 */
export function changeRequestMarksForPage(
  changeRequests: ChangeRequestDto[],
  pageId: string,
  panelsByPageId: Record<string, PanelDto[]>,
  artistStageIds: string[],
  shownArtworkIds: string[],
): PageChangeRequestMark[] {
  return changeRequests.flatMap((cr) => {
    if (!isOpenChangeRequest(cr)) return [];
    // Yêu cầu của công đoạn khác (vd Script / Writer) không vẽ lên bàn vẽ Artist
    if (cr.pipelineStageId && !artistStageIds.includes(cr.pipelineStageId)) return [];
    const loc = resolveChangeRequestLocation(cr, panelsByPageId);
    if (!loc || loc.pageId !== pageId || (!loc.box && !loc.panelId)) return [];
    return [
      {
        ...loc,
        id: cr.id,
        description: cr.description,
        onOlderVersion: Boolean(
          cr.assetReferenceId && !shownArtworkIds.includes(cr.assetReferenceId),
        ),
      },
    ];
  });
}

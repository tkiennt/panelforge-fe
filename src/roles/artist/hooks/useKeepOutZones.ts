import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { translate } from '@/lib/i18n';
import { isGuid, pageService, type KeepOutZoneDto, type PageDto } from '@/services/page.service';
import type { PanelDto } from '@/types/pipeline';
import {
  MAX_KEEP_OUT_ZONES,
  normalizedToPixelZones,
  pixelToNormalizedZone,
  type KeepOutZone,
  type Rect,
} from '@/shared/lib/lettering/keepOutZones';
import { parseBoundingBox } from '../utils/panelBoundingBox';

interface Toaster {
  success: (title: string, desc?: string) => void;
  info: (title: string, desc?: string) => void;
  error?: (title: string, desc?: string) => void;
}

interface StoredZoneEntry {
  id: string;
  dto: KeepOutZoneDto;
}

const makeEntryId = (dto: KeepOutZoneDto, idx: number) =>
  `kz-${idx}-${Math.round(dto.x * 1e4)}-${Math.round(dto.y * 1e4)}-${Math.round(dto.width * 1e4)}`;

function findPanelIdForRect(
  rect: Rect,
  panels: PanelDto[],
  pageWidth: number,
  pageHeight: number,
): string | null {
  if (!panels.length) return null;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  let bestOverlapId: string | null = null;
  let bestOverlapArea = 0;

  for (const panel of panels) {
    if (!isGuid(panel.id)) continue;
    const b = parseBoundingBox(panel.boundingBox, pageWidth, pageHeight);
    if (
      cx >= b.pixelX &&
      cx <= b.pixelX + b.pixelW &&
      cy >= b.pixelY &&
      cy <= b.pixelY + b.pixelH
    ) {
      return panel.id;
    }
    const ox = Math.max(rect.x, b.pixelX);
    const oy = Math.max(rect.y, b.pixelY);
    const ex = Math.min(rect.x + rect.width, b.pixelX + b.pixelW);
    const ey = Math.min(rect.y + rect.height, b.pixelY + b.pixelH);
    if (ex > ox && ey > oy) {
      const area = (ex - ox) * (ey - oy);
      if (area > bestOverlapArea) {
        bestOverlapArea = area;
        bestOverlapId = panel.id;
      }
    }
  }
  return bestOverlapId;
}

/**
 * Quản lý Vùng cấm chữ (keep-out zones) theo trang qua API GET/PUT /api/pages/{pageId}/keep-out-zones.
 * Không dùng localStorage; gửi expectedVersion cho optimistic concurrency, xử lý 409 và 400.
 */
export function useKeepOutZones(
  selectedPage: PageDto | null | undefined,
  pagePanels: PanelDto[],
  toast: Toaster,
  readOnly = false,
) {
  const [entriesByPageId, setEntriesByPageId] = useState<Record<string, StoredZoneEntry[]>>({});
  const [versionByPageId, setVersionByPageId] = useState<Record<string, number>>({});
  const [conflictByPageId, setConflictByPageId] = useState<Record<string, string | null>>({});
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pageId = selectedPage?.id;
  const pageWidth = selectedPage?.widthPx || 1200;
  const pageHeight = selectedPage?.heightPx || 1800;

  const entriesRef = useRef(entriesByPageId);
  entriesRef.current = entriesByPageId;
  const versionRef = useRef(versionByPageId);
  versionRef.current = versionByPageId;

  const loadSeq = useRef(0);
  const reload = useCallback(async () => {
    if (!pageId || !isGuid(pageId) || typeof pageService?.getKeepOutZones !== 'function') {
      return;
    }
    const seq = ++loadSeq.current;
    setIsLoading(true);
    try {
      const res = await pageService.getKeepOutZones(pageId);
      if (seq !== loadSeq.current || !res) return;
      const nextEntries: StoredZoneEntry[] = (res.zones || []).map((dto, idx) => ({
        id: makeEntryId(dto, idx),
        dto,
      }));
      setEntriesByPageId((prev) => ({ ...prev, [pageId]: nextEntries }));
      setVersionByPageId((prev) => ({ ...prev, [pageId]: res.version ?? 0 }));
      setConflictByPageId((prev) => ({ ...prev, [pageId]: null }));
    } catch (err) {
      if (seq !== loadSeq.current) return;
      console.warn('Không thể tải vùng cấm chữ từ server:', err);
    } finally {
      if (seq === loadSeq.current) setIsLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    setIsDrawingMode(false);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (readOnly && isDrawingMode) setIsDrawingMode(false);
  }, [readOnly, isDrawingMode]);

  const currentEntries = useMemo(
    () => (pageId ? entriesByPageId[pageId] || [] : []),
    [pageId, entriesByPageId],
  );

  const zones: KeepOutZone[] = useMemo(() => {
    const pixelZones = normalizedToPixelZones(
      currentEntries.map((e) => e.dto),
      pageWidth,
      pageHeight,
    );
    return pixelZones.map((z, idx) => ({ ...z, id: currentEntries[idx]?.id ?? z.id }));
  }, [currentEntries, pageWidth, pageHeight]);

  const validPanelIds = useMemo(
    () => new Set(pagePanels.map((p) => p.id).filter((id) => isGuid(id))),
    [pagePanels],
  );

  const persistEntries = useCallback(
    async (
      nextEntries: StoredZoneEntry[],
      successMsg?: { title: string; desc: string },
    ): Promise<boolean> => {
      if (!pageId) return false;
      if (readOnly) {
        toast.error?.(translate('artist.keepOut.noPermissionOnPage'), '');
        return false;
      }
      if (!isGuid(pageId)) {
        toast.error?.(
          translate('artist.keepOut.pageNotCreatedTitle'),
          translate('artist.keepOut.pageNotCreatedDesc'),
        );
        return false;
      }
      if (nextEntries.length > MAX_KEEP_OUT_ZONES) {
        toast.error?.(
          translate('artist.keepOut.saveFailedTitle'),
          translate('artist.keepOut.maxZonesError', { max: MAX_KEEP_OUT_ZONES }),
        );
        return false;
      }

      const prevEntries = entriesRef.current[pageId] || [];
      const expectedVersion = versionRef.current[pageId] ?? 0;

      setEntriesByPageId((prev) => ({ ...prev, [pageId]: nextEntries }));
      setIsSaving(true);
      try {
        const res = await pageService.replaceKeepOutZones(pageId, {
          zones: nextEntries.map((e) => e.dto),
          expectedVersion,
        });
        const canonicalEntries: StoredZoneEntry[] = (
          res?.zones || nextEntries.map((e) => e.dto)
        ).map((dto, idx) => ({
          id: makeEntryId(dto, idx),
          dto,
        }));
        setEntriesByPageId((prev) => ({ ...prev, [pageId]: canonicalEntries }));
        if (typeof res?.version === 'number') {
          setVersionByPageId((prev) => ({ ...prev, [pageId]: res.version }));
        }
        setConflictByPageId((prev) => ({ ...prev, [pageId]: null }));
        if (successMsg) toast.success(successMsg.title, successMsg.desc);
        return true;
      } catch (err: any) {
        // Khôi phục lại danh sách trước khi gửi nếu server từ chối
        setEntriesByPageId((prev) => ({ ...prev, [pageId]: prevEntries }));

        const status = err?.status ?? err?.response?.status;
        const code = err?.code ?? err?.response?.data?.code;
        const serverMsg = err?.response?.data?.error || err?.message;

        if (status === 409) {
          const msg = serverMsg || translate('artist.keepOut.conflictDefaultMsg');
          if (code === 'CHAPTER_READ_ONLY') {
            toast.error?.(translate('artist.keepOut.chapterReadOnlyTitle'), msg);
          } else {
            setConflictByPageId((prev) => ({ ...prev, [pageId]: msg }));
            toast.error?.(translate('artist.keepOut.conflictTitle'), msg);
          }
        } else if (status === 400) {
          toast.error?.(
            translate('artist.keepOut.saveFailedTitle'),
            serverMsg || translate('artist.keepOut.invalidDataDesc'),
          );
        } else if (status === 403 || code === 'FORBIDDEN') {
          toast.error?.(translate('artist.keepOut.noPermissionTitle'), serverMsg || '');
        } else {
          toast.error?.(
            translate('artist.keepOut.saveFailedTitle'),
            serverMsg || translate('artist.keepOut.tryAgainLater'),
          );
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [pageId, readOnly, toast],
  );

  const addZone = useCallback(
    async (rectPx: Rect, customLabel?: string): Promise<boolean> => {
      if (!pageId) return false;
      const current = entriesRef.current[pageId] || [];
      const panelId = findPanelIdForRect(rectPx, pagePanels, pageWidth, pageHeight);
      const label =
        customLabel ?? translate('artist.keepOut.defaultZoneLabel', { index: current.length + 1 });
      const dto = pixelToNormalizedZone(
        { id: 'draft', ...rectPx, label, panelId },
        pageWidth,
        pageHeight,
        validPanelIds,
      );
      const nextEntries: StoredZoneEntry[] = [
        ...current,
        { id: makeEntryId(dto, current.length), dto },
      ];
      return persistEntries(nextEntries, {
        title: translate('artist.keepOut.addedTitle'),
        desc: translate('artist.keepOut.addedDesc', {
          label,
          width: Math.round(rectPx.width),
          height: Math.round(rectPx.height),
        }),
      });
    },
    [pageId, pagePanels, pageWidth, pageHeight, validPanelIds, persistEntries],
  );

  const deleteZone = useCallback(
    async (zoneId: string): Promise<boolean> => {
      if (!pageId) return false;
      const current = entriesRef.current[pageId] || [];
      const nextEntries = current.filter((e) => e.id !== zoneId);
      if (nextEntries.length === current.length) return false;
      return persistEntries(nextEntries, {
        title: translate('artist.keepOut.deletedTitle'),
        desc: translate('artist.keepOut.deletedDesc'),
      });
    },
    [pageId, persistEntries],
  );

  const toggleDrawingMode = useCallback(() => {
    if (readOnly) return;
    setIsDrawingMode((v) => !v);
  }, [readOnly]);

  return {
    zones,
    version: pageId ? (versionByPageId[pageId] ?? 0) : 0,
    conflictMessage: pageId ? (conflictByPageId[pageId] ?? null) : null,
    isDrawingMode,
    setIsDrawingMode,
    toggleDrawingMode,
    isLoading,
    isSaving,
    addZone,
    deleteZone,
    reload,
  };
}

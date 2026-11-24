// src/roles/artist/components/PageArtworkWorkflow.tsx
// Luồng "Tải cả trang": Tải ảnh → Rà soát vùng (gợi ý từ POST /api/pages/{pageId}/split-artwork) → Xác nhận.
// Kết quả nhận diện chỉ là bản nháp trên FE; chỉ khi Artist bấm Xác nhận mới tạo Panel / element SPEECH_BALLOON
// bằng các API sẵn có (POST /pages/{id}/panels, POST /pages/{id}/elements). Không xoá / ghi đè dữ liệu cũ.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileImage,
  Loader2,
  MessageCircle,
  Plus,
  ScanSearch,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Modal } from '@/shared/ui';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { artworkService } from '@/services/artwork.service';
import { isGuid } from '@/services/page.service';
import { buildBoundingBoxJson } from '@/shared/utils/panelBoundingBox';
import type { PanelDto } from '@/types/pipeline';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { cropPanelArtwork } from '../utils/cropPanelArtwork';
import { detectPanelsFromSketchImage } from '../lib/panelDetection';
import { useTranslation } from '@/lib/i18n';
import {
  clampRegion,
  draftFromSplitResult,
  imageRectToPage,
  MIN_REGION_PX,
  newRegion,
  type DraftKind,
  type DraftRegion,
  type SplitDraft,
} from '../utils/splitDraft';

/** Giới hạn của POST /api/pages/{pageId}/split-artwork (HANDOFF 2026-10-20). */
const SPLIT_MAX_BYTES = 20 * 1024 * 1024;
const SPLIT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const formatBytes = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

export interface PageArtworkRef {
  id: string;
  versionNumber: number;
  url: string;
  /** Ảnh chỉ nằm trên máy (blob URL), chưa lưu lên máy chủ: chỉ các khung cắt ra mới được tải lên. */
  isLocal?: boolean;
}

interface WorkflowProps {
  page: { id: string; pageNumber: number; widthPx: number; heightPx: number };
  chapterId?: string;
  stageId?: string;
  stageName?: string;
  assignmentBrief?: string;
  /** Artwork toàn trang đang hiển thị (đã tải lên); null = chưa có. */
  artwork: PageArtworkRef | null;
  /** File đã chọn nhưng chưa tải lên. */
  pendingFile: File | null;
  uploading: boolean;
  uploadProgressMsg: string | null;
  canEdit: boolean;
  existingPanels: PanelDto[];
  defaultRightToLeft: boolean;
  forceOpenReview?: boolean;
  onCloseReview?: () => void;
  onPickFile: () => void;
  onCancelPending: () => void;
  onUploadPending: () => void;
  /** Gọi sau khi đã lưu panel/element thật để màn cha nạp lại. */
  onApplied: () => Promise<void> | void;
}

export const PageArtworkWorkflow: React.FC<WorkflowProps> = ({
  page,
  chapterId,
  stageId,
  stageName,
  assignmentBrief,
  artwork,
  pendingFile,
  uploading,
  uploadProgressMsg,
  canEdit,
  existingPanels,
  defaultRightToLeft,
  forceOpenReview,
  onCloseReview,
  onPickFile,
  onCancelPending,
  onUploadPending,
  onApplied,
}) => {
  const { t } = useTranslation('artist');
  const [internalReviewOpen, setInternalReviewOpen] = useState(false);
  const reviewOpen = forceOpenReview ?? internalReviewOpen;
  const handleCloseReview = () => {
    setInternalReviewOpen(false);
    onCloseReview?.();
  };
  const step = pendingFile || !artwork ? 1 : reviewOpen ? 2 : 1;

  return (
    <div
      className='shrink-0 rounded-xl border border-[#D8D2C5] bg-[#F7F4EE] px-3 py-2 space-y-2'
      data-testid='page-artwork-workflow'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <ol
          className='flex items-center gap-1.5 text-[11px] font-semibold'
          aria-label={t('pageArtwork.stepsAriaLabel')}
        >
          {[
            t('pageArtwork.stepUpload'),
            t('pageArtwork.stepReview'),
            t('pageArtwork.stepConfirm'),
          ].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? 'step' : undefined}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                step === i + 1
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : 'bg-white text-[#57534E] border-[#D8D2C5]'
              }`}
            >
              <span className='font-mono'>{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <p
          className='text-[11px] text-[#57534E] truncate max-w-full'
          data-testid='workflow-context'
        >
          {t('pageArtwork.pagePrefix', { page: page.pageNumber })}
          {stageName ? t('pageArtwork.stageSuffix', { stage: stageName }) : ''}
          {assignmentBrief
            ? t('pageArtwork.assignmentSuffix', { brief: assignmentBrief })
            : t('pageArtwork.noAssignmentSuffix')}
        </p>
      </div>

      {pendingFile ? (
        <PendingFileRow
          file={pendingFile}
          uploading={uploading}
          progressMsg={uploadProgressMsg}
          onChange={onPickFile}
          onCancel={onCancelPending}
          onUpload={onUploadPending}
        />
      ) : artwork ? (
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-[11px] font-mono font-bold text-[#C2410C] bg-white border border-[#D8D2C5] rounded px-1.5 py-0.5'>
            {artwork.isLocal ? t('pageArtwork.localUnsaved') : `Artwork v${artwork.versionNumber}`}
          </span>
          {canEdit && (
            <button
              type='button'
              onClick={onPickFile}
              disabled={uploading}
              data-testid='workflow-new-version-btn'
              className='px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] text-[#1C1917] flex items-center gap-1 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
            >
              <Upload className='w-3 h-3' aria-hidden />{' '}
              {artwork.isLocal ? t('pageArtwork.changeImage') : t('pageArtwork.uploadNewVersion')}
            </button>
          )}
          <button
            type='button'
            onClick={() => setInternalReviewOpen(true)}
            data-testid='workflow-detect-btn'
            className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
          >
            <ScanSearch className='w-3 h-3' aria-hidden /> {t('pageArtwork.detectPanels')}
          </button>
        </div>
      ) : (
        <div className='flex flex-wrap items-center gap-2 text-xs text-[#57534E]'>
          {canEdit && (
            <button
              type='button'
              onClick={onPickFile}
              data-testid='workflow-pick-btn'
              className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
            >
              <FileImage className='w-3 h-3' aria-hidden /> {t('pageArtwork.pickPageImage')}
            </button>
          )}
          <span>{t('pageArtwork.dropHint')}</span>
        </div>
      )}

      {reviewOpen && artwork && (
        <SplitReviewDialog
          key={`${page.id}:${artwork.id}`}
          page={page}
          chapterId={chapterId}
          stageId={stageId}
          artwork={artwork}
          canEdit={canEdit}
          existingPanels={existingPanels}
          defaultRightToLeft={defaultRightToLeft}
          onClose={handleCloseReview}
          onApplied={onApplied}
        />
      )}
    </div>
  );
};

const PendingFileRow: React.FC<{
  file: File;
  uploading: boolean;
  progressMsg: string | null;
  onChange: () => void;
  onCancel: () => void;
  onUpload: () => void;
}> = ({ file, uploading, progressMsg, onChange, onCancel, onUpload }) => {
  const { t } = useTranslation('artist');
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className='flex flex-wrap items-center gap-2' data-testid='pending-file-row'>
      {thumb && (
        <img
          src={thumb}
          alt=''
          className='w-9 h-12 object-cover rounded border border-[#D8D2C5] bg-white'
        />
      )}
      <div className='min-w-0 flex-1'>
        <p
          className='text-xs font-semibold text-[#1C1917] truncate'
          data-testid='pending-file-name'
        >
          {file.name}
        </p>
        <p className='text-[11px] text-[#57534E]' aria-live='polite'>
          {formatBytes(file.size)} ·{' '}
          {uploading ? progressMsg || t('pageArtwork.uploading') : t('pageArtwork.previewing')}
        </p>
      </div>
      <button
        type='button'
        onClick={onUpload}
        disabled={uploading}
        data-testid='pending-upload-btn'
        className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
      >
        {uploading ? (
          <Loader2 className='w-3 h-3 animate-spin' aria-hidden />
        ) : (
          <Upload className='w-3 h-3' aria-hidden />
        )}
        {uploading ? t('pageArtwork.uploadingShort') : t('pageArtwork.uploadBtn')}
      </button>
      <button
        type='button'
        onClick={onChange}
        disabled={uploading}
        data-testid='pending-change-btn'
        className='px-2 py-1 text-xs font-semibold rounded-lg border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
      >
        {t('pageArtwork.changeImage')}
      </button>
      <button
        type='button'
        onClick={onCancel}
        disabled={uploading}
        data-testid='pending-cancel-btn'
        className='px-2 py-1 text-xs font-semibold rounded-lg text-[#57534E] hover:text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
      >
        {t('pageArtwork.cancelBtn')}
      </button>
    </div>
  );
};

// ─────────────────────────────── Dialog rà soát ───────────────────────────────

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface DialogProps {
  page: { id: string; pageNumber: number; widthPx: number; heightPx: number };
  chapterId?: string;
  stageId?: string;
  artwork: PageArtworkRef;
  canEdit: boolean;
  existingPanels: PanelDto[];
  defaultRightToLeft: boolean;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
}

export const SplitReviewDialog: React.FC<DialogProps> = ({
  page,
  chapterId,
  stageId,
  artwork,
  canEdit,
  existingPanels,
  defaultRightToLeft,
  onClose,
  onApplied,
}) => {
  const { t } = useTranslation('artist');
  const confirm = useConfirm();
  const [rtl, setRtl] = useState(defaultRightToLeft);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<SplitDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fit, setFit] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [savePanels, setSavePanels] = useState(true);
  const [saveBubbles, setSaveBubbles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);
  const [drag, setDrag] = useState<{
    id: string;
    mode: DragMode;
    sx: number;
    sy: number;
    start: DraftRegion;
  } | null>(null);

  // Huỷ response cũ khi đóng dialog / đổi trang / đổi ảnh (component được key theo page + artwork)
  useEffect(
    () => () => {
      reqRef.current += 1;
    },
    [],
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => dialogRef.current?.focus(), []);

  const iw = draft?.imageWidth ?? 0;
  const ih = draft?.imageHeight ?? 0;
  const fitScale =
    iw && ih && viewport.w > 32 && viewport.h > 32
      ? Math.min((viewport.w - 32) / iw, (viewport.h - 32) / ih)
      : 1;
  const scale = Math.max(0.05, fit ? fitScale : zoom);

  const confirmDiscard = async () => {
    if (!dirty) return true;
    return await confirm({
      title: t('pageArtwork.discardTitle'),
      description: t('pageArtwork.discardDescription'),
      confirmText: t('pageArtwork.discardConfirm'),
      cancelText: t('pageArtwork.discardCancel'),
      variant: 'warning',
    });
  };

  const close = async () => {
    if (saving) return;
    if (!(await confirmDiscard())) return;
    onClose();
  };

  const detect = async () => {
    if (detecting) return;
    if (!(await confirmDiscard())) return;
    const req = ++reqRef.current;
    setDetecting(true);
    setError(null);
    setNotice(null);
    setSaveMsg(null);
    try {
      const res = await fetch(artwork.url);
      if (!res.ok) throw new Error(t('pageArtwork.fetchArtworkExpiredError'));
      const blob = await res.blob();
      if (!SPLIT_TYPES.includes(blob.type)) throw new Error(t('pageArtwork.unsupportedTypeError'));
      if (blob.size > SPLIT_MAX_BYTES)
        throw new Error(t('pageArtwork.sizeLimitError', { size: formatBytes(blob.size) }));
      const file = new File([blob], `page-${page.pageNumber}-v${artwork.versionNumber}`, {
        type: blob.type,
      });
      const result = await panelService.splitArtwork(page.id, file, rtl);
      if (req !== reqRef.current) return; // response cũ: bỏ qua
      // Chỉ lấy panel: bỏ nhận diện bóng thoại ở bước này (theo yêu cầu người dùng 2026-11-11);
      // bóng thoại do Letterer đặt ở khâu Letter.
      const d = { ...draftFromSplitResult(result), bubbles: [] };
      setDraft(d);
      setDirty(false);
      setSelectedId(null);
      setFit(true);
      setNotice(t('pageArtwork.foundPanelsNotice', { count: d.panels.length }));
    } catch (err: unknown) {
      if (req !== reqRef.current) return;
      setError(err instanceof Error ? err.message : t('pageArtwork.detectFailedError'));
    } finally {
      if (req === reqRef.current) setDetecting(false);
    }
  };

  /** Phương án dự phòng: Tách rãnh trực tiếp trên trình duyệt khi Backend / PanelSplitter không khả dụng */
  const detectWithBrowser = async () => {
    if (detecting) return;
    if (!(await confirmDiscard())) return;
    const req = ++reqRef.current;
    setDetecting(true);
    setError(null);
    setNotice(null);
    setSaveMsg(null);
    try {
      const res = await fetch(artwork.url);
      if (!res.ok) throw new Error(t('pageArtwork.fetchArtworkError'));
      const blob = await res.blob();
      const file = new File([blob], `page-${page.pageNumber}-v${artwork.versionNumber}`, {
        type: blob.type,
      });
      const W = page.widthPx || 1200;
      const H = page.heightPx || 1800;
      const fallback = await detectPanelsFromSketchImage(file, {
        pageWidth: W,
        pageHeight: H,
      });
      if (req !== reqRef.current) return;
      const d = draftFromSplitResult({
        width: W,
        height: H,
        panels: fallback.panels.map((p, idx) => ({
          order: p.readingOrder || idx + 1,
          bbox: [
            Math.round(p.x * W),
            Math.round(p.y * H),
            Math.round(p.w * W),
            Math.round(p.h * H),
          ] as [number, number, number, number],
        })),
        bubbles: [],
      });
      setDraft(d);
      setDirty(false);
      setSelectedId(null);
      setFit(true);
      setNotice(t('pageArtwork.browserSplitNotice', { count: d.panels.length }));
    } catch (err: unknown) {
      if (req !== reqRef.current) return;
      setError(err instanceof Error ? err.message : t('pageArtwork.browserSplitFailedError'));
    } finally {
      if (req === reqRef.current) setDetecting(false);
    }
  };

  const update = useCallback((id: string, fn: (r: DraftRegion) => DraftRegion) => {
    setDraft((d) => {
      if (!d) return d;
      const apply = (list: DraftRegion[]) =>
        list.map((r) => (r.id === id ? clampRegion(fn(r), d.imageWidth, d.imageHeight) : r));
      return { ...d, panels: apply(d.panels), bubbles: apply(d.bubbles) };
    });
    setDirty(true);
  }, []);

  const remove = (id: string) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            panels: d.panels.filter((p) => p.id !== id),
            bubbles: d.bubbles
              .filter((b) => b.id !== id)
              .map((b) => (b.panelId === id ? { ...b, panelId: null } : b)),
          }
        : d,
    );
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  };

  const add = (kind: DraftKind) => {
    if (!draft) return;
    const r = newRegion(kind, draft.imageWidth, draft.imageHeight);
    setDraft({
      ...draft,
      panels: kind === 'panel' ? [...draft.panels, r] : draft.panels,
      bubbles: kind === 'bubble' ? [...draft.bubbles, r] : draft.bubbles,
    });
    setSelectedId(r.id);
    setDirty(true);
  };

  const movePanel = (id: string, delta: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const i = d.panels.findIndex((p) => p.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= d.panels.length) return d;
      const panels = [...d.panels];
      [panels[i], panels[j]] = [panels[j], panels[i]];
      return { ...d, panels };
    });
    setDirty(true);
  };

  // Kéo / đổi cỡ: delta pixel màn hình ÷ scale hiện tại = delta pixel ảnh gốc
  const onRegionPointerDown = (e: React.PointerEvent, r: DraftRegion, mode: DragMode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(r.id);
    if (!canEdit) return;
    e.preventDefault();
    setDrag({ id: r.id, mode, sx: e.clientX, sy: e.clientY, start: r });
  };

  useEffect(() => {
    if (!drag) return;
    const d = drag;
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - d.sx) / scale;
      const dy = (e.clientY - d.sy) / scale;
      const s = d.start;
      update(d.id, (r) => {
        if (d.mode === 'move') return { ...r, x: s.x + dx, y: s.y + dy };
        // Đổi cỡ: mép đối diện đứng yên, mép đang kéo bị chặn trong ảnh (không đẩy cả vùng đi)
        const left = d.mode === 'nw' || d.mode === 'sw' || d.mode === 'w';
        const right = d.mode === 'ne' || d.mode === 'se' || d.mode === 'e';
        const top = d.mode === 'nw' || d.mode === 'ne' || d.mode === 'n';
        const bottom = d.mode === 'sw' || d.mode === 'se' || d.mode === 's';

        const x = left ? Math.max(0, Math.min(s.x + dx, s.x + s.w - MIN_REGION_PX)) : s.x;
        const y = top ? Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_REGION_PX)) : s.y;
        const w = left
          ? s.x + s.w - x
          : right
            ? Math.max(MIN_REGION_PX, Math.min(s.w + dx, iw - s.x))
            : s.w;
        const h = top
          ? s.y + s.h - y
          : bottom
            ? Math.max(MIN_REGION_PX, Math.min(s.h + dy, ih - s.y))
            : s.h;
        return { ...r, x, y, w, h };
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, scale, update, iw, ih]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    const tag = (e.target as HTMLElement).tagName;
    if (!selectedId || !canEdit || tag === 'INPUT' || tag === 'SELECT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(selectedId);
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (delta[e.key]) {
      e.preventDefault();
      const [dx, dy] = delta[e.key];
      update(selectedId, (r) => ({ ...r, x: r.x + dx, y: r.y + dy }));
    }
  };

  const save = async () => {
    if (!draft || saving) return;
    const panelsToSave = savePanels ? draft.panels : [];
    const bubblesToSave = saveBubbles ? draft.bubbles : [];
    if (panelsToSave.length + bubblesToSave.length === 0) return;
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    const created = new Map<string, string>();
    let savedPanels = 0;
    let savedBubbles = 0;
    let failedCrops = 0;
    // Tải ảnh gốc 1 lần thành File: cắt từ <img src="http://localhost:5044/..."> (khác origin, không crossOrigin)
    // làm canvas bị "tainted" → toBlob lỗi → khung lưu xong mà không có tranh. File local thì không bị.
    let sourceFile: File | null = null;
    if (chapterId && artwork?.url && panelsToSave.length > 0) {
      try {
        const res = await fetch(artwork.url);
        if (res.ok) sourceFile = new File([await res.blob()], 'page-source.png');
      } catch {
        sourceFile = null;
      }
    }
    try {
      let next = existingPanels.reduce((m, p) => Math.max(m, p.panelNumber, p.readingOrder), 0) + 1;
      for (const p of panelsToSave) {
        const r = imageRectToPage(
          p,
          draft.imageWidth,
          draft.imageHeight,
          page.widthPx,
          page.heightPx,
        );
        const panel = await panelService.createPanel(page.id, {
          panelNumber: next,
          readingOrder: next,
          boundingBox: buildBoundingBoxJson(
            (r.x / page.widthPx) * 100,
            (r.y / page.heightPx) * 100,
            (r.w / page.widthPx) * 100,
            (r.h / page.heightPx) * 100,
            page.widthPx,
            page.heightPx,
            // corners tương đối theo hộp: ảnh → trang chỉ co giãn đều nên giữ nguyên
            p.corners ? { corners: p.corners } : undefined,
          ),
        });
        created.set(p.id, panel.id);

        // Cắt tranh theo khung và upload lên R2 nếu có chapterId và link ảnh
        if (chapterId && artwork?.url && isGuid(panel.id)) {
          try {
            const croppedFile = await cropPanelArtwork(
              sourceFile ?? artwork.url,
              [p.x, p.y, p.w, p.h],
              `panel-${next}.png`,
              p.corners,
            );
            await artworkService.uploadArtwork(
              chapterId,
              page.id,
              croppedFile,
              stageId,
              undefined,
              undefined,
              panel.id,
            );
          } catch (cropErr: any) {
            failedCrops += 1;
            const cropStatus = cropErr?.status ?? cropErr?.response?.status;
            if (cropStatus === 403 || cropErr?.code === 'FORBIDDEN') {
              const forbiddenMsg =
                cropErr?.response?.data?.message ||
                cropErr?.response?.data?.error ||
                cropErr?.message;
              if (forbiddenMsg) {
                setError(forbiddenMsg);
              }
            }
            console.warn(`Lỗi cắt/tải ảnh cho khung ${next}:`, cropErr);
          }
        }

        next += 1;
        savedPanels += 1;
      }
      for (const [i, b] of bubblesToSave.entries()) {
        const r = imageRectToPage(
          b,
          draft.imageWidth,
          draft.imageHeight,
          page.widthPx,
          page.heightPx,
        );
        await elementService.addElement(page.id, {
          elementType: b.isCaption ? 'NARRATION_BOX' : 'SPEECH_BALLOON',
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.w),
          height: Math.round(r.h),
          zIndex: 100 + i,
          content: '',
          panelId: (b.panelId && created.get(b.panelId)) || null,
          clientElementId: crypto.randomUUID(),
        });
        savedBubbles += 1;
      }
      setDirty(false);
      setSaveMsg(t('pageArtwork.savedPanelsMsg', { count: savedPanels, page: page.pageNumber }));
      if (failedCrops > 0) {
        setError((prev) => prev || t('pageArtwork.failedCropsError', { count: failedCrops }));
      }
      await onApplied();
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        code?: string;
        message?: string;
        response?: { status?: number };
      };
      const status = e.status ?? e.response?.status;
      const done = t('pageArtwork.savedBeforeError', { count: savedPanels });
      setError(
        status === 403 || e.code === 'FORBIDDEN'
          ? t('pageArtwork.noOpenSlotError')
          : status === 409
            ? t('pageArtwork.conflict409Error', { done })
            : `${e.message || t('pageArtwork.saveFailedFallback')} ${done}`,
      );
      if (savedPanels + savedBubbles > 0) await onApplied();
    } finally {
      setSaving(false);
    }
  };

  const regionBox = (r: DraftRegion, label: string) => {
    const isSelected = selectedId === r.id;
    const isPanel = r.kind === 'panel';
    const isCaption = !isPanel && Boolean(r.isCaption);
    const slanted = isPanel && Boolean(r.corners && r.corners.length >= 3);
    return (
      <div
        key={r.id}
        role='button'
        tabIndex={0}
        aria-label={
          isPanel
            ? t('pageArtwork.regionPanelAria', { label })
            : isCaption
              ? t('pageArtwork.regionCaptionAria', { label })
              : t('pageArtwork.regionBubbleAria', { label })
        }
        aria-pressed={isSelected}
        data-testid={`split-region-${r.kind}`}
        data-region-id={r.id}
        onPointerDown={(e) => onRegionPointerDown(e, r, 'move')}
        onFocus={() => setSelectedId(r.id)}
        className={`absolute ${canEdit ? 'cursor-move' : 'cursor-pointer'} focus-visible:outline-2 focus-visible:outline-[#1C1917] ${
          slanted
            ? // Khung cắt chéo: viền vẽ bằng SVG đa giác bên dưới; giữ viền chấm mờ của hộp để thấy vùng kéo / co giãn
              `border border-dashed ${isSelected ? 'border-[#C2410C]/70' : 'border-[#F97316]/40'}`
            : isPanel
              ? `border-[3px] ${isSelected ? 'border-[#C2410C] bg-[#F97316]/15' : 'border-[#F97316] bg-[#F97316]/5'}`
              : isCaption
                ? `border-2 border-dashed rounded-md ${isSelected ? 'border-sky-700 bg-sky-500/20' : 'border-sky-600 bg-sky-500/10'}`
                : `border-2 border-dashed rounded-[40%] ${isSelected ? 'border-emerald-700 bg-emerald-500/20' : 'border-emerald-600 bg-emerald-500/10'}`
        }`}
        style={{
          left: r.x * scale,
          top: r.y * scale,
          width: r.w * scale,
          height: r.h * scale,
          zIndex: isSelected ? (isPanel ? 15 : 30) : isPanel ? 10 : 20,
          touchAction: 'none',
        }}
      >
        {slanted && (
          <svg
            aria-hidden
            data-testid='split-panel-polygon'
            className='absolute inset-0 w-full h-full pointer-events-none overflow-visible'
            viewBox='0 0 100 100'
            preserveAspectRatio='none'
          >
            <polygon
              points={r.corners!.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')}
              fill={isSelected ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.05)'}
              stroke={isSelected ? '#C2410C' : '#F97316'}
              strokeWidth={3}
              vectorEffect='non-scaling-stroke'
            />
          </svg>
        )}
        <span
          className={`absolute -top-0.5 -left-0.5 px-1 text-[10px] font-bold font-mono leading-4 pointer-events-none ${
            isPanel
              ? 'bg-[#F97316] text-white'
              : isCaption
                ? 'bg-sky-600 text-white rounded'
                : 'bg-emerald-600 text-white rounded'
          }`}
        >
          {isPanel ? `#${label}` : isCaption ? `C${label}` : `B${label}`}
        </span>
        {isSelected &&
          canEdit &&
          (['nw', 'ne', 'sw', 'se'] as const).map((m) => (
            <span
              key={m}
              aria-hidden
              data-testid={`split-handle-${m}`}
              onPointerDown={(e) => onRegionPointerDown(e, r, m)}
              className='absolute w-3.5 h-3.5 bg-white border-2 border-[#C2410C] rounded-sm transition-transform hover:scale-125'
              style={{
                left: m.endsWith('w') ? -7 : undefined,
                right: m.endsWith('e') ? -7 : undefined,
                top: m.startsWith('n') ? -7 : undefined,
                bottom: m.startsWith('s') ? -7 : undefined,
                cursor: m === 'nw' || m === 'se' ? 'nwse-resize' : 'nesw-resize',
              }}
            />
          ))}
        {isSelected &&
          canEdit &&
          (['n', 's', 'e', 'w'] as const).map((m) => (
            <span
              key={m}
              aria-hidden
              data-testid={`split-handle-${m}`}
              onPointerDown={(e) => onRegionPointerDown(e, r, m)}
              className='absolute w-3 h-3 bg-white border-2 border-[#C2410C] rounded-full transition-transform hover:scale-125'
              style={{
                left: m === 'w' ? -6 : m === 'e' ? undefined : 'calc(50% - 6px)',
                right: m === 'e' ? -6 : undefined,
                top: m === 'n' ? -6 : m === 's' ? undefined : 'calc(50% - 6px)',
                bottom: m === 's' ? -6 : undefined,
                cursor: m === 'n' || m === 's' ? 'ns-resize' : 'ew-resize',
              }}
            />
          ))}
      </div>
    );
  };

  const selected = draft
    ? [...draft.panels, ...draft.bubbles].find((r) => r.id === selectedId)
    : undefined;
  const selectedPanelNo = selected
    ? (draft?.panels.findIndex((p) => p.id === selected.id) ?? -1) + 1
    : 0;
  const toSaveCount = draft
    ? (savePanels ? draft.panels.length : 0) + (saveBubbles ? draft.bubbles.length : 0)
    : 0;
  const iconBtn =
    'p-1.5 rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-white disabled:opacity-30 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]';

  return (
    <Modal
      isOpen={true}
      onClose={close}
      size='full'
      closeLabel={t('pageArtwork.closeLabel')}
      data-testid='split-review-dialog'
      className='w-full max-w-6xl h-[92vh] flex flex-col'
      title={
        <div className='flex items-center justify-between w-full'>
          <div className='min-w-0'>
            <h2 id='split-review-title' className='text-sm font-bold text-[#1C1917]'>
              {t('pageArtwork.dialogTitle', {
                page: page.pageNumber,
                source: artwork.isLocal
                  ? t('pageArtwork.dialogSourceLocal')
                  : t('pageArtwork.dialogSourceVersion', { version: artwork.versionNumber }),
              })}
            </h2>
          </div>
          <button
            type='button'
            onClick={close}
            aria-label={t('pageArtwork.closeLabel')}
            data-testid='split-close-btn'
            className='hidden'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      }
      description={t('pageArtwork.dialogDescription')}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className='flex flex-col flex-1 min-h-0 outline-none'
      >
        <div className='shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#D8D2C5] bg-[#F7F4EE]'>
          <fieldset className='inline-flex items-center p-0.5 bg-white rounded-lg border border-[#D8D2C5]'>
            <legend className='sr-only'>{t('pageArtwork.readingDirectionLegend')}</legend>
            {[
              { v: false, label: t('pageArtwork.ltr') },
              { v: true, label: t('pageArtwork.rtl') },
            ].map((o) => (
              <label
                key={o.label}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#F97316] ${
                  rtl === o.v ? 'bg-[#F97316] text-white' : 'text-[#57534E]'
                }`}
              >
                <input
                  type='radio'
                  name='split-direction'
                  className='sr-only'
                  checked={rtl === o.v}
                  onChange={() => setRtl(o.v)}
                  disabled={detecting}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <button
            type='button'
            onClick={detect}
            disabled={detecting}
            data-testid='split-run-btn'
            className='px-3 py-1 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
          >
            {detecting ? (
              <Loader2 className='w-3 h-3 animate-spin' aria-hidden />
            ) : (
              <ScanSearch className='w-3 h-3' aria-hidden />
            )}
            {detecting
              ? t('pageArtwork.detecting')
              : draft
                ? t('pageArtwork.redetect')
                : t('pageArtwork.detect')}
          </button>

          {draft && (
            <>
              <span className='w-px h-5 bg-[#D8D2C5]' aria-hidden />
              <button
                type='button'
                onClick={() => setShowOverlay((v) => !v)}
                aria-pressed={!showOverlay}
                data-testid='split-toggle-overlay'
                className={iconBtn}
                aria-label={
                  showOverlay ? t('pageArtwork.hideOverlay') : t('pageArtwork.showOverlay')
                }
                title={showOverlay ? t('pageArtwork.hideOverlay') : t('pageArtwork.showOverlay')}
              >
                {showOverlay ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
              <div className='inline-flex items-center bg-white rounded-lg border border-[#D8D2C5]'>
                <button
                  type='button'
                  className={iconBtn}
                  aria-label={t('pageArtwork.zoomOut')}
                  data-testid='split-zoom-out'
                  disabled={scale <= 0.1}
                  onClick={() => {
                    setZoom(Math.max(0.1, scale / 1.25));
                    setFit(false);
                  }}
                >
                  <ZoomOut className='w-3.5 h-3.5' />
                </button>
                <span
                  className='px-1 text-[11px] font-mono w-11 text-center'
                  data-testid='split-zoom-label'
                >
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type='button'
                  className={iconBtn}
                  aria-label={t('pageArtwork.zoomIn')}
                  data-testid='split-zoom-in'
                  disabled={scale >= 4}
                  onClick={() => {
                    setZoom(Math.min(4, scale * 1.25));
                    setFit(false);
                  }}
                >
                  <ZoomIn className='w-3.5 h-3.5' />
                </button>
                <button
                  type='button'
                  onClick={() => setFit(true)}
                  aria-pressed={fit}
                  data-testid='split-fit-btn'
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                    fit ? 'text-[#C2410C]' : 'text-[#57534E]'
                  }`}
                >
                  {t('pageArtwork.fit')}
                </button>
              </div>
            </>
          )}
        </div>

        {(error || notice || saveMsg) && (
          <div className='shrink-0 px-4 pt-2 space-y-1' aria-live='polite'>
            {error && (
              <div
                role='alert'
                data-testid='split-error'
                className='text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2'
              >
                <span>{error}</span>
                <button
                  type='button'
                  onClick={detectWithBrowser}
                  data-testid='split-fallback-btn'
                  className='px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 font-semibold text-[11px] cursor-pointer transition-colors'
                >
                  {t('pageArtwork.fallbackBrowserSplit')}
                </button>
              </div>
            )}
            {notice && !error && (
              <p
                data-testid='split-notice'
                className='text-xs text-[#1C1917] bg-white border border-[#D8D2C5] rounded-lg px-2.5 py-1.5'
              >
                {notice}
              </p>
            )}
            {saveMsg && (
              <p
                data-testid='split-saved'
                className='text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5'
              >
                {saveMsg}
              </p>
            )}
          </div>
        )}

        <div className='flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-y-auto lg:overflow-hidden'>
          {/* Ảnh vẽ đúng kích thước gốc × scale (không dùng object-fit), nên toạ độ overlay = pixel ảnh × scale */}
          <div
            ref={viewportRef}
            data-testid='split-viewport'
            className='relative flex-1 min-h-[320px] lg:min-h-0 overflow-auto rounded-xl border border-[#D8D2C5] bg-[#ECE7DC]'
            onPointerDown={() => setSelectedId(null)}
          >
            <div
              className='min-w-full min-h-full flex p-4'
              style={{ width: 'max-content', height: 'max-content' }}
            >
              <div
                className='relative m-auto shrink-0 bg-white shadow-lg'
                data-testid='split-stage'
                style={draft ? { width: iw * scale, height: ih * scale } : undefined}
              >
                <img
                  src={artwork.url}
                  alt={t('pageArtwork.artworkAlt', { page: page.pageNumber })}
                  draggable={false}
                  data-testid='split-image'
                  className='block select-none'
                  style={
                    draft
                      ? { width: iw * scale, height: ih * scale, maxWidth: 'none' }
                      : { maxWidth: '100%', maxHeight: 480 }
                  }
                />
                {draft && showOverlay && (
                  <div className='absolute inset-0' data-testid='split-overlay'>
                    {draft.panels.map((p, i) => regionBox(p, String(i + 1)))}
                    {draft.bubbles.map((b, i) => regionBox(b, String(i + 1)))}
                  </div>
                )}
                {detecting && (
                  <div className='absolute inset-0 bg-stone-900/30 flex items-center justify-center'>
                    <span className='text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded flex items-center gap-1.5'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden />{' '}
                      {t('pageArtwork.detecting')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!draft && !detecting && (
              <p className='sticky bottom-3 mx-auto w-fit text-xs text-[#57534E] bg-white/90 border border-[#D8D2C5] rounded-lg px-2.5 py-1'>
                {t('pageArtwork.emptyDraftHint')}
              </p>
            )}
          </div>

          {draft && (
            <aside className='lg:w-72 shrink-0 flex flex-col min-h-0 gap-2 max-h-[45vh] lg:max-h-none'>
              <div className='flex-1 min-h-0 overflow-auto space-y-3 pr-1'>
                <RegionList
                  title={t('pageArtwork.panelListTitle')}
                  kind='panel'
                  items={draft.panels}
                  selectedId={selectedId}
                  canEdit={canEdit}
                  onSelect={setSelectedId}
                  onRemove={remove}
                  onAdd={() => add('panel')}
                  renderExtra={(p, i) => (
                    <>
                      <button
                        type='button'
                        className={iconBtn}
                        aria-label={t('pageArtwork.movePanelUp', { number: i + 1 })}
                        disabled={!canEdit || i === 0}
                        onClick={() => movePanel(p.id, -1)}
                      >
                        <ArrowUp className='w-3 h-3' />
                      </button>
                      <button
                        type='button'
                        className={iconBtn}
                        aria-label={t('pageArtwork.movePanelDown', { number: i + 1 })}
                        disabled={!canEdit || i === draft.panels.length - 1}
                        onClick={() => movePanel(p.id, 1)}
                      >
                        <ArrowDown className='w-3 h-3' />
                      </button>
                    </>
                  )}
                />
                {selected && (
                  <p
                    className='text-[11px] font-mono text-[#57534E]'
                    data-testid='split-selected-rect'
                  >
                    {t('pageArtwork.selectedRectHint', {
                      kind:
                        selected.kind === 'panel'
                          ? t('pageArtwork.selectedPanelLabel', { number: selectedPanelNo })
                          : t('pageArtwork.selectedBubbleLabel'),
                      x: selected.x,
                      y: selected.y,
                      w: selected.w,
                      h: selected.h,
                      iw,
                      ih,
                    })}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className='shrink-0 border-t border-[#D8D2C5] pt-2 space-y-1.5'>
                  <label className='flex items-center gap-1.5 text-xs'>
                    <input
                      type='checkbox'
                      checked={savePanels}
                      onChange={(e) => setSavePanels(e.target.checked)}
                    />
                    {t('pageArtwork.createPanelsCheckbox', { count: draft.panels.length })}
                  </label>
                  {existingPanels.length > 0 && savePanels && (
                    <p
                      className='text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1'
                      data-testid='split-existing-warning'
                    >
                      {t('pageArtwork.existingPanelsWarning', { count: existingPanels.length })}
                    </p>
                  )}
                  <button
                    type='button'
                    onClick={save}
                    disabled={saving || toSaveCount === 0}
                    data-testid='split-confirm-btn'
                    className='w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1C1917] hover:bg-black text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]'
                  >
                    {saving && <Loader2 className='w-3 h-3 animate-spin' aria-hidden />}
                    {saving ? t('pageArtwork.saving') : t('pageArtwork.confirmAndSave')}
                  </button>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </Modal>
  );
};

const RegionList: React.FC<{
  title: string;
  kind: DraftKind;
  items: DraftRegion[];
  selectedId: string | null;
  canEdit: boolean;
  empty?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  renderExtra: (r: DraftRegion, i: number) => React.ReactNode;
}> = ({
  title,
  kind,
  items,
  selectedId,
  canEdit,
  empty,
  onSelect,
  onRemove,
  onAdd,
  renderExtra,
}) => {
  const { t } = useTranslation('artist');
  return (
    <section aria-label={title}>
      <div className='flex items-center justify-between mb-1'>
        <h3 className='text-[11px] font-bold uppercase tracking-wide text-[#57534E] flex items-center gap-1'>
          {kind === 'bubble' && <MessageCircle className='w-3 h-3' aria-hidden />}
          {title} ({items.length})
        </h3>
        {canEdit && (
          <button
            type='button'
            onClick={onAdd}
            data-testid={`split-add-${kind}`}
            className='text-[11px] font-semibold text-[#C2410C] hover:underline flex items-center gap-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] rounded'
          >
            <Plus className='w-3 h-3' aria-hidden /> {t('pageArtwork.addRegion')}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className='text-[11px] text-[#57534E] italic' data-testid={`split-empty-${kind}`}>
          {empty ?? t('pageArtwork.emptyRegions')}
        </p>
      ) : (
        <ul className='space-y-1'>
          {items.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 ${
                selectedId === r.id ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#D8D2C5] bg-white'
              }`}
            >
              <button
                type='button'
                onClick={() => onSelect(r.id)}
                aria-pressed={selectedId === r.id}
                className='flex-1 text-left text-xs font-semibold text-[#1C1917] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] rounded'
              >
                {kind === 'panel' ? `#${i + 1}` : r.isCaption ? `C${i + 1}` : `B${i + 1}`}
                {r.isCaption && (
                  <span className='ml-1 text-[9px] px-1 py-0.2 rounded bg-sky-100 text-sky-800 font-medium'>
                    Cap
                  </span>
                )}
                <span className='ml-1 font-mono text-[10px] text-[#57534E]'>
                  {r.w}×{r.h}
                </span>
              </button>
              {renderExtra(r, i)}
              {canEdit && (
                <button
                  type='button'
                  onClick={() => onRemove(r.id)}
                  aria-label={
                    kind === 'panel'
                      ? t('pageArtwork.removePanelAria', { number: i + 1 })
                      : t('pageArtwork.removeBubbleAria', { number: i + 1 })
                  }
                  className='p-1 rounded-md text-[#57534E] hover:text-rose-700 hover:bg-rose-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
                >
                  <Trash2 className='w-3 h-3' />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

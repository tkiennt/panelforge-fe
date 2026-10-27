// src/roles/artist/components/PageArtworkWorkflow.tsx
// Luồng "Tải cả trang": Tải ảnh → Rà soát vùng (gợi ý từ POST /api/pages/{pageId}/split-artwork) → Xác nhận.
// Kết quả nhận diện chỉ là bản nháp trên FE; chỉ khi Artist bấm Xác nhận mới tạo Panel / element SPEECH_BALLOON
// bằng các API sẵn có (POST /pages/{id}/panels, POST /pages/{id}/elements). Không xoá / ghi đè dữ liệu cũ.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { buildBoundingBoxJson } from '@/shared/utils/panelBoundingBox';
import type { PanelDto } from '@/types/pipeline';
import { useConfirm } from '@/shared/context/ConfirmContext';
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
}

interface WorkflowProps {
  page: { id: string; pageNumber: number; widthPx: number; heightPx: number };
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
  onPickFile: () => void;
  onCancelPending: () => void;
  onUploadPending: () => void;
  /** Gọi sau khi đã lưu panel/element thật để màn cha nạp lại. */
  onApplied: () => Promise<void> | void;
}

export const PageArtworkWorkflow: React.FC<WorkflowProps> = ({
  page,
  stageName,
  assignmentBrief,
  artwork,
  pendingFile,
  uploading,
  uploadProgressMsg,
  canEdit,
  existingPanels,
  defaultRightToLeft,
  onPickFile,
  onCancelPending,
  onUploadPending,
  onApplied,
}) => {
  const [reviewOpen, setReviewOpen] = useState(false);
  const step = pendingFile || !artwork ? 1 : reviewOpen ? 2 : 1;

  return (
    <div
      className='shrink-0 rounded-xl border border-[#D8D2C5] bg-[#F7F4EE] px-3 py-2 space-y-2'
      data-testid='page-artwork-workflow'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <ol className='flex items-center gap-1.5 text-[11px] font-semibold' aria-label='Các bước'>
          {['Tải ảnh', 'Rà soát vùng', 'Xác nhận'].map((label, i) => (
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
          Trang {page.pageNumber}
          {stageName ? ` · Công đoạn ${stageName}` : ''}
          {assignmentBrief
            ? ` · Việc: ${assignmentBrief}`
            : ' · Chưa có việc đang làm cho trang này'}
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
            Artwork v{artwork.versionNumber}
          </span>
          {canEdit && (
            <button
              type='button'
              onClick={onPickFile}
              disabled={uploading}
              data-testid='workflow-new-version-btn'
              className='px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] text-[#1C1917] flex items-center gap-1 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
            >
              <Upload className='w-3 h-3' aria-hidden /> Tải phiên bản mới
            </button>
          )}
          <button
            type='button'
            onClick={() => setReviewOpen(true)}
            data-testid='workflow-detect-btn'
            className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
          >
            <ScanSearch className='w-3 h-3' aria-hidden /> Nhận diện panel &amp; bóng thoại
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
              <FileImage className='w-3 h-3' aria-hidden /> Chọn ảnh trang truyện
            </button>
          )}
          <span>hoặc kéo thả một ảnh PNG / JPEG / WEBP vào khung trang bên dưới.</span>
        </div>
      )}

      {reviewOpen && artwork && (
        <SplitReviewDialog
          key={`${page.id}:${artwork.id}`}
          page={page}
          artwork={artwork}
          canEdit={canEdit}
          existingPanels={existingPanels}
          defaultRightToLeft={defaultRightToLeft}
          onClose={() => setReviewOpen(false)}
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
          {uploading
            ? progressMsg || 'Đang tải lên…'
            : 'Chưa tải lên — đang xem trước trên khung trang'}
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
        {uploading ? 'Đang tải…' : 'Tải lên'}
      </button>
      <button
        type='button'
        onClick={onChange}
        disabled={uploading}
        data-testid='pending-change-btn'
        className='px-2 py-1 text-xs font-semibold rounded-lg border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
      >
        Đổi ảnh
      </button>
      <button
        type='button'
        onClick={onCancel}
        disabled={uploading}
        data-testid='pending-cancel-btn'
        className='px-2 py-1 text-xs font-semibold rounded-lg text-[#57534E] hover:text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#F97316]'
      >
        Hủy
      </button>
    </div>
  );
};

// ─────────────────────────────── Dialog rà soát ───────────────────────────────

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DialogProps {
  page: { id: string; pageNumber: number; widthPx: number; heightPx: number };
  artwork: PageArtworkRef;
  canEdit: boolean;
  existingPanels: PanelDto[];
  defaultRightToLeft: boolean;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
}

const SplitReviewDialog: React.FC<DialogProps> = ({
  page,
  artwork,
  canEdit,
  existingPanels,
  defaultRightToLeft,
  onClose,
  onApplied,
}) => {
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
      title: 'Bỏ bản nháp chưa lưu?',
      description: 'Bạn có các chỉnh sửa phân vùng chưa lưu trong bản nháp này.',
      confirmText: 'Bỏ bản nháp',
      cancelText: 'Giữ lại chỉnh sửa',
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
      if (!res.ok)
        throw new Error(
          'Không tải được artwork để nhận diện (link có thể đã hết hạn), hãy thử lại.',
        );
      const blob = await res.blob();
      if (!SPLIT_TYPES.includes(blob.type))
        throw new Error('Nhận diện chỉ hỗ trợ ảnh PNG, JPEG, WEBP.');
      if (blob.size > SPLIT_MAX_BYTES)
        throw new Error(`Ảnh ${formatBytes(blob.size)} vượt giới hạn nhận diện 20 MB.`);
      const file = new File([blob], `page-${page.pageNumber}-v${artwork.versionNumber}`, {
        type: blob.type,
      });
      const result = await panelService.splitArtwork(page.id, file, rtl);
      if (req !== reqRef.current) return; // response cũ: bỏ qua
      const d = draftFromSplitResult(result);
      setDraft(d);
      setDirty(false);
      setSelectedId(null);
      setFit(true);
      setNotice(
        `Tìm thấy ${d.panels.length} panel` +
          (d.bubbles.length
            ? `, ${d.bubbles.length} bóng thoại.`
            : '. Không phát hiện bóng thoại.'),
      );
    } catch (err: unknown) {
      if (req !== reqRef.current) return;
      setError(err instanceof Error ? err.message : 'Nhận diện thất bại.');
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
        const left = d.mode === 'nw' || d.mode === 'sw';
        const top = d.mode === 'nw' || d.mode === 'ne';
        const x = left ? Math.max(0, Math.min(s.x + dx, s.x + s.w - MIN_REGION_PX)) : s.x;
        const y = top ? Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_REGION_PX)) : s.y;
        const w = left ? s.x + s.w - x : Math.min(s.w + dx, iw - s.x);
        const h = top ? s.y + s.h - y : Math.min(s.h + dy, ih - s.y);
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
          ),
        });
        created.set(p.id, panel.id);
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
          elementType: 'SPEECH_BALLOON',
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
      setSaveMsg(
        `Đã lưu ${savedPanels} panel và ${savedBubbles} bóng thoại vào trang ${page.pageNumber}.`,
      );
      await onApplied();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; response?: { status?: number } };
      const status = e.status ?? e.response?.status;
      const done = `Đã lưu ${savedPanels} panel, ${savedBubbles} bóng thoại trước khi lỗi.`;
      setError(
        status === 409
          ? `Dữ liệu trang vừa thay đổi ở nơi khác (409). ${done} Hãy đóng hộp này, tải lại trang và rà soát phiên bản trước khi lưu tiếp.`
          : `${e.message || 'Lưu thất bại.'} ${done}`,
      );
      if (savedPanels + savedBubbles > 0) await onApplied();
    } finally {
      setSaving(false);
    }
  };

  const regionBox = (r: DraftRegion, label: string) => {
    const isSelected = selectedId === r.id;
    const isPanel = r.kind === 'panel';
    return (
      <div
        key={r.id}
        role='button'
        tabIndex={0}
        aria-label={isPanel ? `Panel ${label}` : `Bóng thoại ${label}`}
        aria-pressed={isSelected}
        data-testid={`split-region-${r.kind}`}
        data-region-id={r.id}
        onPointerDown={(e) => onRegionPointerDown(e, r, 'move')}
        onFocus={() => setSelectedId(r.id)}
        className={`absolute ${canEdit ? 'cursor-move' : 'cursor-pointer'} focus-visible:outline-2 focus-visible:outline-[#1C1917] ${
          isPanel
            ? `border-[3px] ${isSelected ? 'border-[#C2410C] bg-[#F97316]/15' : 'border-[#F97316] bg-[#F97316]/5'}`
            : `border-2 border-dashed rounded-[40%] ${isSelected ? 'border-emerald-700 bg-emerald-500/20' : 'border-emerald-600 bg-emerald-500/10'}`
        }`}
        style={{
          left: r.x * scale,
          top: r.y * scale,
          width: r.w * scale,
          height: r.h * scale,
          zIndex: isSelected ? 30 : isPanel ? 10 : 20,
          touchAction: 'none',
        }}
      >
        <span
          className={`absolute -top-0.5 -left-0.5 px-1 text-[10px] font-bold font-mono leading-4 pointer-events-none ${
            isPanel ? 'bg-[#F97316] text-white' : 'bg-emerald-600 text-white rounded'
          }`}
        >
          {isPanel ? `#${label}` : `B${label}`}
        </span>
        {isSelected &&
          canEdit &&
          (['nw', 'ne', 'sw', 'se'] as const).map((m) => (
            <span
              key={m}
              aria-hidden
              data-testid={`split-handle-${m}`}
              onPointerDown={(e) => onRegionPointerDown(e, r, m)}
              className='absolute w-3 h-3 bg-white border-2 border-[#C2410C] rounded-sm'
              style={{
                left: m.endsWith('w') ? -6 : undefined,
                right: m.endsWith('e') ? -6 : undefined,
                top: m.startsWith('n') ? -6 : undefined,
                bottom: m.startsWith('s') ? -6 : undefined,
                cursor: m === 'nw' || m === 'se' ? 'nwse-resize' : 'nesw-resize',
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

  const content = (
    <div className='fixed inset-0 z-[1000] bg-stone-900/50 flex items-stretch justify-center sm:p-4'>
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='split-review-title'
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-testid='split-review-dialog'
        className='bg-[#FCFBF8] w-full max-w-6xl sm:rounded-2xl border border-[#D8D2C5] shadow-2xl flex flex-col min-h-0 outline-none'
      >
        <header className='shrink-0 flex items-start justify-between gap-2 px-4 py-2.5 border-b border-[#D8D2C5]'>
          <div className='min-w-0'>
            <h2 id='split-review-title' className='text-sm font-bold text-[#1C1917]'>
              Nhận diện panel &amp; bóng thoại — Trang {page.pageNumber}, artwork v
              {artwork.versionNumber}
            </h2>
            <p className='text-[11px] text-[#57534E]'>
              Gợi ý tự động phù hợp với panel có viền rõ và có thể nhận nhầm vùng trắng; hãy kiểm
              tra trước khi xác nhận.
            </p>
          </div>
          <button
            type='button'
            onClick={close}
            aria-label='Đóng'
            data-testid='split-close-btn'
            className={iconBtn}
          >
            <X className='w-4 h-4' />
          </button>
        </header>

        <div className='shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#D8D2C5] bg-[#F7F4EE]'>
          <fieldset className='inline-flex items-center p-0.5 bg-white rounded-lg border border-[#D8D2C5]'>
            <legend className='sr-only'>Hướng đọc</legend>
            {[
              { v: false, label: 'Trái → phải' },
              { v: true, label: 'Phải → trái' },
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
            {detecting ? 'Đang nhận diện…' : draft ? 'Nhận diện lại' : 'Nhận diện'}
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
                aria-label={showOverlay ? 'Ẩn lớp gợi ý' : 'Hiện lớp gợi ý'}
                title={showOverlay ? 'Ẩn lớp gợi ý' : 'Hiện lớp gợi ý'}
              >
                {showOverlay ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
              <div className='inline-flex items-center bg-white rounded-lg border border-[#D8D2C5]'>
                <button
                  type='button'
                  className={iconBtn}
                  aria-label='Thu nhỏ'
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
                  aria-label='Phóng to'
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
                  Vừa khung
                </button>
              </div>
            </>
          )}
        </div>

        {(error || notice || saveMsg) && (
          <div className='shrink-0 px-4 pt-2 space-y-1' aria-live='polite'>
            {error && (
              <p
                role='alert'
                data-testid='split-error'
                className='text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5'
              >
                {error}
              </p>
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
                  alt={`Artwork trang ${page.pageNumber}`}
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
                      <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden /> Đang nhận diện…
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!draft && !detecting && (
              <p className='sticky bottom-3 mx-auto w-fit text-xs text-[#57534E] bg-white/90 border border-[#D8D2C5] rounded-lg px-2.5 py-1'>
                Chọn hướng đọc rồi bấm “Nhận diện”. Kết quả chỉ là bản nháp, chưa lưu gì.
              </p>
            )}
          </div>

          {draft && (
            <aside className='lg:w-72 shrink-0 flex flex-col min-h-0 gap-2 max-h-[45vh] lg:max-h-none'>
              <div className='flex-1 min-h-0 overflow-auto space-y-3 pr-1'>
                <RegionList
                  title='Panel (thứ tự đọc)'
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
                        aria-label={`Đưa panel ${i + 1} lên trước`}
                        disabled={!canEdit || i === 0}
                        onClick={() => movePanel(p.id, -1)}
                      >
                        <ArrowUp className='w-3 h-3' />
                      </button>
                      <button
                        type='button'
                        className={iconBtn}
                        aria-label={`Đưa panel ${i + 1} xuống sau`}
                        disabled={!canEdit || i === draft.panels.length - 1}
                        onClick={() => movePanel(p.id, 1)}
                      >
                        <ArrowDown className='w-3 h-3' />
                      </button>
                    </>
                  )}
                />
                <RegionList
                  title='Bóng thoại'
                  kind='bubble'
                  items={draft.bubbles}
                  selectedId={selectedId}
                  canEdit={canEdit}
                  onSelect={setSelectedId}
                  onRemove={remove}
                  onAdd={() => add('bubble')}
                  empty='Không phát hiện bóng thoại. Bạn vẫn có thể lưu panel hoặc thêm bóng thủ công.'
                  renderExtra={(b, i) => (
                    <select
                      aria-label={`Panel chứa bóng thoại ${i + 1}`}
                      value={b.panelId ?? ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update(b.id, (r) => ({ ...r, panelId: e.target.value || null }))
                      }
                      className='text-[11px] border border-[#D8D2C5] rounded bg-white px-1 py-0.5 max-w-[92px] focus-visible:outline-2 focus-visible:outline-[#F97316]'
                    >
                      <option value=''>Không gắn</option>
                      {draft.panels.map((p, pi) => (
                        <option key={p.id} value={p.id}>
                          Panel {pi + 1}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {selected && (
                  <p
                    className='text-[11px] font-mono text-[#57534E]'
                    data-testid='split-selected-rect'
                  >
                    {selected.kind === 'panel' ? `Panel ${selectedPanelNo}` : 'Bóng thoại'}: x{' '}
                    {selected.x}, y {selected.y}, {selected.w}×{selected.h}px (ảnh gốc {iw}×{ih}).
                    Mũi tên để dịch 1px, Shift + mũi tên 10px, Delete để xoá.
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
                    Tạo {draft.panels.length} panel mới
                  </label>
                  <label className='flex items-center gap-1.5 text-xs'>
                    <input
                      type='checkbox'
                      checked={saveBubbles}
                      onChange={(e) => setSaveBubbles(e.target.checked)}
                    />
                    Tạo {draft.bubbles.length} bóng thoại trống cho Letterer
                  </label>
                  {existingPanels.length > 0 && savePanels && (
                    <p
                      className='text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1'
                      data-testid='split-existing-warning'
                    >
                      Trang đã có {existingPanels.length} panel. Xác nhận sẽ thêm panel mới (đánh số
                      tiếp theo), không xoá hay sửa panel cũ.
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
                    {saving ? 'Đang lưu…' : 'Xác nhận & lưu vào trang'}
                  </button>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
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
}) => (
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
          <Plus className='w-3 h-3' aria-hidden /> Thêm
        </button>
      )}
    </div>
    {items.length === 0 ? (
      <p className='text-[11px] text-[#57534E] italic' data-testid={`split-empty-${kind}`}>
        {empty ?? 'Chưa có vùng nào.'}
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
              {kind === 'panel' ? `#${i + 1}` : `B${i + 1}`}
              <span className='ml-1 font-mono text-[10px] text-[#57534E]'>
                {r.w}×{r.h}
              </span>
            </button>
            {renderExtra(r, i)}
            {canEdit && (
              <button
                type='button'
                onClick={() => onRemove(r.id)}
                aria-label={`Xoá ${kind === 'panel' ? 'panel' : 'bóng thoại'} ${i + 1}`}
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

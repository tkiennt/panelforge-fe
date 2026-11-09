import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Info,
  LayoutTemplate,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AssetReferenceDto, ChangeRequestDto, PanelDto, SubmissionDto } from '@/types';
import {
  artworkService,
  computeFileSha256,
  resolveArtworkUrl,
  toThumbnailUrl,
} from '@/services/artwork.service';
import { errorMessage, parseRegionBox } from './collaborationRules';
import { parseBoundingBox } from '@/shared/utils/panelBoundingBox';

/** Kiểm tra xem tên file có phải là chuỗi GUID/UUID ngẫu nhiên kỹ thuật không */
const isUuidString = (str: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    str.replace(/\.[^/.]+$/, ''),
  );

/** Lấy tên hiển thị thân thiện, chuyển chuỗi UUID dài vào chi tiết và dùng fallback trung thực */
const getDisplayArtworkTitle = (
  art: AssetReferenceDto,
  matchedPanel?: PanelDto | null,
  isDeletedPanel?: boolean,
) => {
  if (!isUuidString(art.fileName)) {
    return art.fileName;
  }
  if (isDeletedPanel) {
    return `Ảnh của khung đã xóa (v${art.versionNumber})`;
  }
  if (matchedPanel) {
    return `Bản vẽ Khung #${matchedPanel.panelNumber} (v${art.versionNumber})`;
  }
  return `Bản vẽ cả trang (v${art.versionNumber})`;
};

/** Phạm vi của một phiên bản: ảnh cả trang, ảnh của khung đang có, hay ảnh của khung đã bị xoá. */
const ScopeBadge: React.FC<{ art: AssetReferenceDto; matchedPanelNumber?: number }> = ({
  art,
  matchedPanelNumber,
}) =>
  !art.panelId ? (
    <span className='px-1.5 py-0.5 rounded border text-xs font-bold bg-zinc-100 text-zinc-700 border-zinc-200'>
      Cả trang
    </span>
  ) : matchedPanelNumber != null ? (
    <span className='px-1.5 py-0.5 rounded border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200'>
      Khung #{matchedPanelNumber}
    </span>
  ) : (
    <span
      className='px-1.5 py-0.5 rounded border text-xs font-semibold bg-stone-100 text-stone-600 border-stone-300'
      title='Khung này đã bị xoá; ảnh vẫn giữ trong lịch sử (append-only)'
    >
      Khung đã xoá
    </span>
  );

interface ZoomedArtworkState {
  src: string;
  alt: string;
  artId?: string;
  versionNumber: number;
  friendlyTitle: string;
  contextTitle: string;
  triggerEl?: HTMLElement | null;
}

interface ArtworkPreviewCardProps {
  art: AssetReferenceDto;
  src: string;
  alt: string;
  friendlyTitle: string;
  contextTitle: string;
  onOpenZoom: (zoomData: ZoomedArtworkState) => void;
  onRetry: () => Promise<void>;
  onClose: () => void;
  renderOverlay?: React.ReactNode;
}

/** Vùng preview inline bảo toàn đúng tỷ lệ ảnh gốc, có nền trung tính nhẹ, nút mở lớn và xử lý retry */
const ArtworkPreviewCard: React.FC<ArtworkPreviewCardProps> = ({
  art,
  src,
  alt,
  friendlyTitle,
  contextTitle,
  onOpenZoom,
  onRetry,
  onClose,
  renderOverlay,
}) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isRetrying, setIsRetrying] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);

  // Khi src thay đổi (ví dụ retry thành công), reset imageStatus về loading
  useEffect(() => {
    setImageStatus('loading');
  }, [src]);

  return (
    <div
      id={`artwork-preview-container-${art.id}`}
      className='mt-2 w-full rounded-xl border border-stone-200/90 bg-[#F5F2EB]/60 p-2 sm:p-3 overflow-hidden transition-all'
    >
      <div className='flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-200/80 text-xs'>
        <div className='flex items-center gap-1.5 min-w-0'>
          <span className='font-mono font-bold text-stone-900 bg-stone-200/90 px-1.5 py-0.5 rounded text-[11px]'>
            v{art.versionNumber}
          </span>
          <span className='text-stone-500 font-medium text-[11px] truncate' title={contextTitle}>
            {contextTitle}
          </span>
        </div>
        <div className='flex items-center gap-1.5 shrink-0'>
          <button
            type='button'
            ref={zoomTriggerRef}
            title='Mở lớn để kiểm tra chi tiết'
            onClick={() =>
              onOpenZoom({
                src,
                alt,
                artId: art.id,
                versionNumber: art.versionNumber,
                friendlyTitle,
                contextTitle,
                triggerEl: zoomTriggerRef.current,
              })
            }
            className='px-2 py-1 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
          >
            <Maximize2 className='w-3 h-3 text-[#F97316]' />
            <span>Mở lớn</span>
          </button>
          <button
            type='button'
            title='Ẩn xem nhanh'
            onClick={onClose}
            className='px-2 py-1 rounded-md border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
          >
            <EyeOff className='w-3 h-3' />
            <span>Ẩn</span>
          </button>
        </div>
      </div>

      <div className='relative w-full flex items-center justify-center min-h-[160px] max-h-[480px] rounded-lg bg-stone-950/5 p-2 overflow-hidden'>
        {imageStatus === 'loading' && (
          <div className='flex flex-col items-center justify-center gap-2 py-8 text-stone-500 text-xs'>
            <Loader2 className='w-5 h-5 animate-spin text-[#F97316]' />
            <span>Đang tải hình ảnh…</span>
          </div>
        )}

        {imageStatus === 'error' && (
          <div className='flex flex-col items-center justify-center gap-2 py-6 px-4 text-center'>
            <AlertTriangle className='w-5 h-5 text-amber-600' />
            <p className='text-xs text-stone-700 font-medium'>
              Không thể tải ảnh (link tạm thời có thể đã hết hạn).
            </p>
            <button
              type='button'
              disabled={isRetrying}
              onClick={async () => {
                setIsRetrying(true);
                try {
                  await onRetry();
                } catch {
                  setImageStatus('error');
                } finally {
                  setIsRetrying(false);
                }
              }}
              className='px-2.5 py-1 rounded-md bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
            >
              {isRetrying ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <RefreshCw className='w-3 h-3 text-[#F97316]' />
              )}
              <span>Thử tải lại</span>
            </button>
          </div>
        )}

        <div className={`relative max-w-full ${imageStatus === 'loaded' ? 'block' : 'hidden'}`}>
          <button
            type='button'
            title='Bấm để phóng to'
            onClick={() =>
              onOpenZoom({
                src,
                alt,
                artId: art.id,
                versionNumber: art.versionNumber,
                friendlyTitle,
                contextTitle,
                triggerEl: zoomTriggerRef.current,
              })
            }
            className='block cursor-zoom-in relative'
          >
            <img
              src={src}
              alt={alt}
              onLoad={() => setImageStatus('loaded')}
              onError={() => setImageStatus('error')}
              className='max-h-[440px] max-w-full w-auto h-auto object-contain block mx-auto rounded shadow-xs'
            />
          </button>
          {renderOverlay}
        </div>
      </div>
    </div>
  );
};

interface ArtworkLightboxModalProps {
  zoomed: ZoomedArtworkState;
  onClose: () => void;
  renderBoundingBoxes: (artId: string, isZoom: boolean) => React.ReactNode;
}

/** Trình xem chi tiết lightbox dùng Portal, hỗ trợ zoom, fit, pan 4 mép và phím Escape */
const ArtworkLightboxModal: React.FC<ArtworkLightboxModalProps> = ({
  zoomed,
  onClose,
  renderBoundingBoxes,
}) => {
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [scale, setScale] = useState<number>(1);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (zoomed.triggerEl && typeof zoomed.triggerEl.focus === 'function') {
        zoomed.triggerEl.focus();
      }
    };
  }, [onClose, zoomed.triggerEl]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMode('custom');
    setScale((prev) => Math.min(4, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMode('custom');
    setScale((prev) => Math.max(0.25, +(prev - 0.25).toFixed(2)));
  };

  const handleResetFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMode('fit');
    setScale(1);
  };

  const handleReset100 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMode('custom');
    setScale(1);
  };

  const displayWidth = zoomMode === 'custom' && naturalSize ? naturalSize.width * scale : undefined;
  const displayHeight =
    zoomMode === 'custom' && naturalSize ? naturalSize.height * scale : undefined;

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label={zoomed.alt}
      data-testid='artwork-zoom'
      className='fixed inset-0 z-[200] bg-black/85 backdrop-blur-xs flex flex-col select-none'
    >
      {/* Top Header Toolbar */}
      <div
        className='shrink-0 bg-stone-900/95 text-white px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-stone-800 z-30'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center gap-2 min-w-0'>
          <span className='font-mono font-bold bg-[#F97316] text-white px-2 py-0.5 rounded text-xs shrink-0 shadow-xs'>
            v{zoomed.versionNumber}
          </span>
          <div className='min-w-0 flex items-center gap-2'>
            <span
              className='font-semibold text-xs sm:text-sm text-stone-100 truncate'
              title={zoomed.friendlyTitle}
            >
              {zoomed.friendlyTitle}
            </span>
            <span className='text-[11px] text-stone-400 hidden sm:inline-block px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 truncate'>
              {zoomed.contextTitle}
            </span>
          </div>
        </div>

        {/* Zoom Controls & Close Button */}
        <div className='flex items-center gap-1.5 shrink-0'>
          <div className='flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700 text-xs'>
            <button
              type='button'
              title='Thu nhỏ (-)'
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              className='p-1.5 rounded-md hover:bg-stone-700 disabled:opacity-40 cursor-pointer transition-colors'
            >
              <ZoomOut className='w-3.5 h-3.5' />
            </button>
            <span className='px-2 font-mono text-[11px] text-stone-300 min-w-[54px] text-center'>
              {zoomMode === 'fit' ? 'Vừa khung' : `${Math.round(scale * 100)}%`}
            </span>
            <button
              type='button'
              title='Phóng to (+)'
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className='p-1.5 rounded-md hover:bg-stone-700 disabled:opacity-40 cursor-pointer transition-colors'
            >
              <ZoomIn className='w-3.5 h-3.5' />
            </button>
          </div>

          <button
            type='button'
            title='Vừa khung hình'
            onClick={handleResetFit}
            className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors hidden sm:flex items-center gap-1 ${
              zoomMode === 'fit'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
          >
            <RotateCcw className='w-3 h-3' />
            <span>Vừa khung</span>
          </button>

          <button
            type='button'
            title='Kích thước gốc (100%)'
            onClick={handleReset100}
            className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors hidden sm:inline-block ${
              zoomMode === 'custom' && scale === 1
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
          >
            100%
          </button>

          <button
            type='button'
            aria-label='Đóng'
            onClick={onClose}
            className='p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white cursor-pointer ml-1 transition-colors border border-stone-700'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Main Viewport with Full 4-edge Scroll and Pan */}
      <div
        className='flex-1 w-full h-full overflow-auto p-4 sm:p-8 flex items-center justify-center'
        onClick={onClose}
      >
        <div
          className='relative m-auto shrink-0 select-none'
          onClick={(e) => e.stopPropagation()}
          style={
            zoomMode === 'custom' && naturalSize
              ? {
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                }
              : undefined
          }
        >
          <img
            src={zoomed.src}
            alt={zoomed.alt}
            onLoad={(e) => {
              setNaturalSize({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              });
            }}
            className={
              zoomMode === 'fit'
                ? 'max-h-[calc(100vh-120px)] max-w-[calc(100vw-48px)] w-auto h-auto object-contain block mx-auto rounded shadow-2xl'
                : 'w-full h-full object-contain block rounded shadow-2xl'
            }
          />
          {zoomed.artId && renderBoundingBoxes(zoomed.artId, true)}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const PageArtCrop: React.FC<{
  src: string;
  boundingBox?: string | null;
  alt: string;
  testId: string;
}> = ({ src, boundingBox, alt, testId }) => {
  const b = parseBoundingBox(boundingBox);
  const w = Math.max(0.01, b.percentW / 100);
  const h = Math.max(0.01, b.percentH / 100);
  const x = b.percentX / 100;
  const y = b.percentY / 100;
  return (
    <div
      role='img'
      aria-label={alt}
      data-testid={testId}
      className='rounded-lg border border-zinc-200 bg-zinc-50 max-w-full'
      style={{
        width: 240,
        aspectRatio: `${Math.max(1, b.pixelW)} / ${Math.max(1, b.pixelH)}`,
        backgroundImage: `url("${src}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${100 / w}% ${100 / h}%`,
        backgroundPosition: `${w >= 1 ? 0 : (x / (1 - w)) * 100}% ${h >= 1 ? 0 : (y / (1 - h)) * 100}%`,
      }}
    />
  );
};

/** Khớp giới hạn của Backend (25 MB, PNG/JPEG/WebP); Backend vẫn kiểm lại nội dung thật. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

interface ArtworkPanelProps {
  chapterId: string;
  pageId: string | null;
  stageId: string;
  assignedPanelId?: string | null;
  artworks: AssetReferenceDto[];
  panels?: PanelDto[];
  submissions?: SubmissionDto[];
  changeRequests?: ChangeRequestDto[];
  highlightedChangeRequestId?: string | null;
  targetArtworkId?: string | null;
  canUpload: boolean;
  onChanged: () => void;
  onToast?: (title: string, desc: string) => void;
  onOpenBible?: (panelId: string, panelNumber?: number) => void;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Artwork của một Page ở một stage (CF2 bước 10). Client tính SHA-256 rồi gửi kèm; Backend tính lại và từ chối nếu lệch (BR-04).
 * Hỗ trợ cả tải ảnh cả trang và tải ảnh theo từng khung Panel (CF2).
 * Ảnh chỉ xem qua link ngắn hạn xin theo từng lần bấm "Xem" (BR-16), không có URL công khai.
 */
export const ArtworkPanel: React.FC<ArtworkPanelProps> = ({
  chapterId,
  pageId,
  stageId,
  assignedPanelId,
  artworks,
  panels = [],
  submissions,
  changeRequests = [],
  highlightedChangeRequestId,
  targetArtworkId,
  canUpload,
  onChanged,
  onToast,
  onOpenBible,
}) => {
  const assignedPanelObj = assignedPanelId ? panels.find((p) => p.id === assignedPanelId) : null;
  const fileInput = useRef<HTMLInputElement>(null);
  const panelFileInput = useRef<HTMLInputElement>(null);
  const [activeUploadPanelId, setActiveUploadPanelId] = useState<string | null>(null);

  const [phase, setPhase] = useState<'idle' | 'hashing' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [openPreviewIds, setOpenPreviewIds] = useState<Record<string, boolean>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<ZoomedArtworkState | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState<Record<string, boolean>>({});
  const activePreviewRequests = useRef<Record<string, number>>({});
  const requestCounter = useRef(0);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  // Theo thời gian tải lên; trong cùng phạm vi (Page, Panel, Stage) thứ tự này trùng thứ tự version
  const mine = artworks
    .filter((a) => a.pageId === pageId && a.pipelineStageId === stageId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.versionNumber - b.versionNumber,
    );

  const handleFile = async (file: File | undefined, targetPanelId?: string) => {
    if (!file || !pageId) return;
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File vượt giới hạn 25 MB.');
      return;
    }

    try {
      setPhase('hashing');
      const sha256 = await computeFileSha256(file);
      setPhase('uploading');
      const effectivePanelId = targetPanelId ?? (assignedPanelId || undefined);
      const result = await artworkService.uploadArtwork(
        chapterId,
        pageId,
        file,
        stageId,
        sha256,
        undefined,
        effectivePanelId,
      );
      const targetPanel = panels.find((p) => p.id === effectivePanelId);
      const scopeDesc = targetPanel ? `khung #${targetPanel.panelNumber}` : 'cả trang';
      onToast?.(
        `Đã tải artwork v${result.versionNumber} cho ${scopeDesc}`,
        result.reused
          ? 'Nội dung đã có trong Workspace nên không tốn thêm dung lượng.'
          : `${result.fileName} (${formatSize(result.sizeBytes)})`,
      );
      onChanged();
    } catch (err) {
      const msg = errorMessage(err, 'Không thể tải artwork lên.');
      setError(msg);
      onToast?.('Tải artwork thất bại', msg);
    } finally {
      setPhase('idle');
      if (fileInput.current) fileInput.current.value = '';
      if (panelFileInput.current) panelFileInput.current.value = '';
      setActiveUploadPanelId(null);
    }
  };

  const handlePreview = async (art: AssetReferenceDto) => {
    if (openPreviewIds[art.id]) {
      setOpenPreviewIds((prev) => ({ ...prev, [art.id]: false }));
      return;
    }

    if (previews[art.id]) {
      setOpenPreviewIds((prev) => ({ ...prev, [art.id]: true }));
      return;
    }

    const reqId = ++requestCounter.current;
    activePreviewRequests.current[art.id] = reqId;
    setPreviewLoading(art.id);
    setError(null);
    try {
      const link = await artworkService.getArtworkAccessLink(chapterId, art.id);
      if (activePreviewRequests.current[art.id] === reqId) {
        setPreviews((p) => ({ ...p, [art.id]: toThumbnailUrl(resolveArtworkUrl(link.url)) }));
        setOpenPreviewIds((prev) => ({ ...prev, [art.id]: true }));
      }
    } catch (err) {
      if (activePreviewRequests.current[art.id] === reqId) {
        setError(errorMessage(err, 'Không thể xin link xem artwork.'));
      }
    } finally {
      if (activePreviewRequests.current[art.id] === reqId) {
        setPreviewLoading(null);
      }
    }
  };

  const handleRetryPreview = async (art: AssetReferenceDto) => {
    const reqId = ++requestCounter.current;
    activePreviewRequests.current[art.id] = reqId;
    const link = await artworkService.getArtworkAccessLink(chapterId, art.id);
    if (activePreviewRequests.current[art.id] === reqId) {
      setPreviews((p) => ({ ...p, [art.id]: toThumbnailUrl(resolveArtworkUrl(link.url)) }));
      setOpenPreviewIds((prev) => ({ ...prev, [art.id]: true }));
    }
  };

  const handleTogglePreview = (art: AssetReferenceDto) => {
    setOpenPreviewIds((prev) => ({ ...prev, [art.id]: !prev[art.id] }));
  };

  const [expandedPanelHistory, setExpandedPanelHistory] = useState<Record<string, boolean>>({});
  const [showDeletedPanelArts, setShowDeletedPanelArts] = useState(false);

  const busy = phase !== 'idle';

  // VersionNumber chỉ tăng trong từng phạm vi (Page, Panel, Stage) nên KHÔNG so version giữa các phạm vi:
  // tách 3 nhóm, mỗi nhóm có bản hiện tại riêng.
  const livePanelIds = new Set(panels.map((p) => p.id));
  const fullPageArts = mine.filter((a) => !a.panelId);
  const panelScopedArts = mine.filter((a) => a.panelId && livePanelIds.has(a.panelId));
  const deletedPanelArts = mine.filter((a) => a.panelId && !livePanelIds.has(a.panelId));

  // Nhóm các phiên bản thuộc khung đã xoá theo panelId để không làm lẫn các chuỗi phiên bản khác nhau
  const deletedPanelGroups = (() => {
    const map = new Map<string, AssetReferenceDto[]>();
    for (const art of deletedPanelArts) {
      const pid = art.panelId || 'unknown';
      if (!map.has(pid)) {
        map.set(pid, []);
      }
      map.get(pid)!.push(art);
    }
    return Array.from(map.entries()).map(([panelId, arts]) => {
      const sortedDesc = [...arts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          b.versionNumber - a.versionNumber,
      );
      return {
        panelId,
        arts: sortedDesc,
        latestArt: sortedDesc[0],
      };
    });
  })();
  // Khung chưa có ảnh riêng dùng phần tương ứng của ảnh cả trang mới nhất (luồng "Tải cả trang")
  const latestPageArt = fullPageArts.length > 0 ? fullPageArts[fullPageArts.length - 1] : null;
  const latestArt = latestPageArt;
  const olderArts = fullPageArts.length > 1 ? fullPageArts.slice(0, -1).reverse() : [];
  const displayArtworks = showOlder ? [...fullPageArts].reverse() : latestArt ? [latestArt] : [];
  const isLatestInOwnScope = (art: AssetReferenceDto) => {
    const scope = mine.filter((a) => (a.panelId ?? null) === (art.panelId ?? null));
    return scope.length > 0 && scope[scope.length - 1].id === art.id;
  };

  const getStatusBadges = (art: AssetReferenceDto) => {
    const badges: { label: string; cls: string }[] = [];
    const scopeArts = art.panelId
      ? mine.filter((a) => a.panelId === art.panelId)
      : mine.filter((a) => !a.panelId);
    const isLatestInScope = scopeArts.length > 0 && scopeArts[scopeArts.length - 1].id === art.id;
    if (isLatestInScope) {
      badges.push({
        label: 'Mới nhất',
        cls: 'bg-violet-100 text-violet-900 border-violet-300 font-bold',
      });
    }
    if (submissions && submissions.length > 0) {
      const isPending = submissions.some(
        (s) =>
          (s.status === 'Pending' || s.status === 0) && s.artworkReferenceIds?.includes(art.id),
      );
      const isApproved = submissions.some(
        (s) =>
          (s.status === 'Approved' || s.status === 1) && s.artworkReferenceIds?.includes(art.id),
      );
      const isRejected = submissions.some(
        (s) =>
          (s.status === 'Rejected' || s.status === 2) && s.artworkReferenceIds?.includes(art.id),
      );
      if (isPending) {
        badges.push({
          label: 'Đang duyệt',
          cls: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        });
      } else if (isApproved) {
        badges.push({
          label: 'Đã duyệt',
          cls: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
        });
      } else if (isRejected) {
        badges.push({
          label: 'Bị trả về',
          cls: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold',
        });
      }
    }
    return badges;
  };

  useEffect(() => {
    if (!targetArtworkId) return;
    const art = mine.find((a) => a.id === targetArtworkId);
    if (!art) return;
    if (olderArts.some((a) => a.id === targetArtworkId)) {
      setShowOlder(true);
    }
    if (art.panelId) {
      setExpandedPanelHistory((prev) => ({ ...prev, [art.panelId!]: true }));
    }
    if (!previews[targetArtworkId]) {
      void handlePreview(art);
    }
    const timer = setTimeout(() => {
      if (highlightedChangeRequestId) {
        const boxEl = document.getElementById(`cr-box-${highlightedChangeRequestId}`);
        if (boxEl) {
          boxEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      const containerEl = document.getElementById(`artwork-preview-container-${targetArtworkId}`);
      if (containerEl) {
        containerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetArtworkId, highlightedChangeRequestId]);

  const getChangeRequestsForArt = (artId: string) => {
    if (!changeRequests || changeRequests.length === 0) return [];
    return changeRequests.filter((cr) => {
      if (cr.assetReferenceId === artId) return true;
      if (!cr.assetReferenceId && cr.submissionId && submissions && submissions.length > 0) {
        const sub = submissions.find((s) => s.id === cr.submissionId);
        if (sub?.artworkReferenceIds?.includes(artId)) return true;
      }
      return false;
    });
  };

  const renderBoundingBoxes = (artId: string, isZoom: boolean) => {
    const reqs = getChangeRequestsForArt(artId);
    if (reqs.length === 0) return null;

    return (
      <div
        className='absolute inset-0 pointer-events-none'
        data-testid={isZoom ? 'artwork-zoom-boxes' : `artwork-boxes-${artId}`}
      >
        {reqs.map((cr, idx) => {
          const box = parseRegionBox(cr.regionJson);
          if (!box) return null;

          const st = String(cr.status);
          const isHighlighted = highlightedChangeRequestId === cr.id;

          let borderClass = 'border-2 border-red-500 bg-red-500/15 text-red-700';
          let badgeBg = 'bg-red-600 text-white';
          if (st === 'Resolved' || st === 'Verified') {
            borderClass = 'border-2 border-emerald-500 bg-emerald-500/15 text-emerald-700';
            badgeBg = 'bg-emerald-600 text-white';
          } else if (st === 'Rejected') {
            borderClass = 'border-2 border-dashed border-zinc-400 bg-zinc-400/15 text-zinc-600';
            badgeBg = 'bg-zinc-600 text-white';
          }

          const left = `${(box.x * 100).toFixed(2)}%`;
          const top = `${(box.y * 100).toFixed(2)}%`;
          const width = `${(box.w * 100).toFixed(2)}%`;
          const height = `${(box.h * 100).toFixed(2)}%`;

          return (
            <div
              key={cr.id}
              id={isZoom ? undefined : `cr-box-${cr.id}`}
              data-testid={`cr-box-${cr.id}`}
              className={`absolute rounded transition-all pointer-events-auto ${borderClass} ${
                isHighlighted ? 'ring-4 ring-orange-500 ring-offset-1 animate-pulse z-20' : 'z-10'
              }`}
              style={{ left, top, width, height }}
              title={`#${idx + 1}: ${cr.description} (${st})`}
            >
              <span
                className={`absolute -top-3.5 -left-1.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono shadow-xs ${badgeBg}`}
              >
                #{idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className='space-y-3' data-testid='artwork-panel'>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <span className='flex items-center gap-1.5 text-xs font-bold text-[#171717]'>
          <ImageIcon className='w-3.5 h-3.5 text-[#F97316]' />
          Artwork của trang ({mine.length} phiên bản)
          {mine.length > 0 && (
            <span
              className='font-normal text-zinc-500'
              data-testid='artwork-version-breakdown'
              title='Mỗi phạm vi (cả trang / từng khung) đánh số phiên bản riêng'
            >
              · {fullPageArts.length} cả trang · {panelScopedArts.length} theo khung
              {deletedPanelArts.length > 0 && ` · ${deletedPanelArts.length} của khung đã xoá`}
            </span>
          )}
        </span>

        {canUpload && (
          <div className='flex items-center gap-1.5'>
            {!assignedPanelId ? (
              <>
                <input
                  ref={fileInput}
                  type='file'
                  accept={ACCEPTED.join(',')}
                  className='hidden'
                  data-testid='artwork-file-input'
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <button
                  type='button'
                  disabled={busy || !pageId}
                  onClick={() => fileInput.current?.click()}
                  data-testid='artwork-upload-btn'
                  className='px-2.5 py-1 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs'
                >
                  {busy ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Upload className='w-3 h-3 text-[#F97316]' />
                  )}
                  <span>
                    {phase === 'hashing'
                      ? 'Đang chuẩn bị ảnh…'
                      : phase === 'uploading'
                        ? 'Đang tải lên…'
                        : 'Tải artwork lên'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type='button'
                disabled={busy || !pageId}
                onClick={() => {
                  setActiveUploadPanelId(assignedPanelId);
                  panelFileInput.current?.click();
                }}
                data-testid='artwork-upload-assigned-panel-btn'
                className='px-2.5 py-1 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs'
              >
                {busy ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <Upload className='w-3 h-3 text-[#F97316]' />
                )}
                <span>
                  {phase === 'hashing'
                    ? 'Đang chuẩn bị ảnh…'
                    : phase === 'uploading'
                      ? 'Đang tải lên…'
                      : `Tải ảnh cho khung${assignedPanelObj ? ` #${assignedPanelObj.panelNumber}` : ''}`}
                </span>
              </button>
            )}
            <input
              ref={panelFileInput}
              type='file'
              accept={ACCEPTED.join(',')}
              className='hidden'
              data-testid='panel-artwork-file-input'
              onChange={(e) =>
                void handleFile(
                  e.target.files?.[0],
                  activeUploadPanelId ?? assignedPanelId ?? undefined,
                )
              }
            />
          </div>
        )}
      </div>

      {!pageId && canUpload && (
        <p className='text-xs text-amber-700'>
          Chưa xác định được trang của việc này (việc cấp Panel cần có Panel đã bắt đầu).
        </p>
      )}

      {error && (
        <div
          role='alert'
          className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs'
        >
          {error}
        </div>
      )}

      {panels.length > 0 && (
        <div
          className='p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE6DB] space-y-2.5'
          data-testid='panel-artworks-section'
        >
          <div className='flex items-center justify-between text-xs font-bold text-[#171717]'>
            <span className='flex items-center gap-1.5'>
              <LayoutTemplate className='w-3.5 h-3.5 text-blue-600' />
              <span>Ảnh theo từng khung ({panels.length} Panels)</span>
            </span>
            <span className='text-xs text-zinc-500 font-normal'>
              Mỗi khung quản lý bản hiện tại và lịch sử riêng biệt
            </span>
          </div>

          <div className='space-y-2'>
            {panels.map((p) => {
              const panelArts = mine.filter((a) => a.panelId === p.id);
              const latestPanelArt = panelArts.length > 0 ? panelArts[panelArts.length - 1] : null;
              const olderPanelArts = panelArts.length > 1 ? panelArts.slice(0, -1).reverse() : [];
              const isHistoryOpen = Boolean(expandedPanelHistory[p.id]);

              return (
                <div
                  key={p.id}
                  className='p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-2 transition-all group hover:border-zinc-300 hover:shadow-soft-sm'
                >
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2 flex-wrap min-w-0'>
                      <span className='font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-xs border border-zinc-200'>
                        Khung #{p.panelNumber}
                      </span>
                      <span className='text-zinc-500 font-mono text-xs'>Đọc #{p.readingOrder}</span>
                      {latestPanelArt ? (
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <span className='font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-xs'>
                            v{latestPanelArt.versionNumber}
                          </span>
                          <span className='inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-xs'>
                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                            Bản hiện tại
                          </span>
                          <span
                            className='text-zinc-700 font-medium text-xs truncate max-w-[200px]'
                            title={latestPanelArt.fileName}
                          >
                            {latestPanelArt.fileName}
                          </span>
                          <strong className='font-mono font-bold text-emerald-800 text-xs'>
                            (v{latestPanelArt.versionNumber})
                          </strong>
                          {getStatusBadges(latestPanelArt).map((b) => (
                            <span
                              key={b.label}
                              className={`px-1.5 py-0.5 rounded border text-xs font-bold ${b.cls}`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      ) : latestPageArt ? (
                        <span
                          data-testid={`panel-uses-page-art-${p.id}`}
                          className='font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-xs'
                          title='Khung chưa có ảnh riêng; đang dùng phần tương ứng của ảnh cả trang'
                        >
                          Dùng ảnh cả trang v{latestPageArt.versionNumber}
                        </span>
                      ) : (
                        <span className='text-zinc-400 italic text-xs'>Chưa có ảnh</span>
                      )}
                    </div>

                    <div className='flex items-center gap-1.5 shrink-0'>
                      {olderPanelArts.length > 0 && (
                        <button
                          type='button'
                          onClick={() =>
                            setExpandedPanelHistory((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                          className='px-2 py-1 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer transition-colors'
                        >
                          {isHistoryOpen ? (
                            <ChevronUp className='w-3 h-3 text-zinc-500' />
                          ) : (
                            <ChevronDown className='w-3 h-3 text-zinc-500' />
                          )}
                          <span>{olderPanelArts.length} bản cũ</span>
                        </button>
                      )}
                      {latestPanelArt && (
                        <button
                          type='button'
                          onClick={() => void handlePreview(latestPanelArt)}
                          className='px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                        >
                          <Eye className='w-3 h-3' />
                          <span>
                            {openPreviewIds[latestPanelArt.id] && previews[latestPanelArt.id]
                              ? 'Ẩn'
                              : 'Xem'}
                          </span>
                        </button>
                      )}
                      {!latestPanelArt && latestPageArt && (
                        <button
                          type='button'
                          onClick={() => void handlePreview(latestPageArt)}
                          data-testid={`panel-page-art-preview-btn-${p.id}`}
                          className='px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                        >
                          <Eye className='w-3 h-3' />
                          <span>
                            {openPreviewIds[latestPageArt.id] && previews[latestPageArt.id]
                              ? 'Ẩn'
                              : 'Xem'}
                          </span>
                        </button>
                      )}
                      {onOpenBible && (
                        <button
                          type='button'
                          onClick={() => onOpenBible(p.id, p.panelNumber)}
                          data-testid={`panel-bible-btn-${p.id}`}
                          title='Xem tham chiếu thiết kế nhân vật trong khung tranh này'
                          className='px-2.5 py-1 rounded-md border border-orange-300 bg-orange-50 hover:bg-orange-100 text-xs font-semibold text-orange-900 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                        >
                          <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
                          <span>Bible</span>
                        </button>
                      )}
                      {canUpload && (!assignedPanelId || assignedPanelId === p.id) && (
                        <button
                          type='button'
                          disabled={busy}
                          data-testid={`upload-panel-btn-${p.id}`}
                          onClick={() => {
                            setActiveUploadPanelId(p.id);
                            panelFileInput.current?.click();
                          }}
                          className='px-2.5 py-1 rounded-md bg-stone-900 text-white hover:bg-stone-800 border border-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
                        >
                          <Upload className='w-3.5 h-3.5' />
                          <span>Tải ảnh cho khung</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {latestPanelArt &&
                    openPreviewIds[latestPanelArt.id] &&
                    previews[latestPanelArt.id] && (
                      <ArtworkPreviewCard
                        art={latestPanelArt}
                        src={previews[latestPanelArt.id]}
                        alt={`Artwork v${latestPanelArt.versionNumber} của khung #${p.panelNumber}`}
                        friendlyTitle={getDisplayArtworkTitle(latestPanelArt, p, false)}
                        contextTitle={`Khung #${p.panelNumber} (Đọc #${p.readingOrder})`}
                        onOpenZoom={(zoomData) => setZoomed(zoomData)}
                        onRetry={() => handleRetryPreview(latestPanelArt)}
                        onClose={() => handleTogglePreview(latestPanelArt)}
                        renderOverlay={renderBoundingBoxes(latestPanelArt.id, false)}
                      />
                    )}

                  {!latestPanelArt && latestPageArt && previews[latestPageArt.id] && (
                    <PageArtCrop
                      src={previews[latestPageArt.id]}
                      boundingBox={p.boundingBox}
                      alt={`Khung #${p.panelNumber} cắt từ ảnh cả trang v${latestPageArt.versionNumber}`}
                      testId={`panel-page-art-crop-${p.id}`}
                    />
                  )}

                  {olderPanelArts.length > 0 && isHistoryOpen && (
                    <div className='mt-2 pt-2 border-t border-dashed border-zinc-200 space-y-1.5 pl-2 border-l-2 border-l-amber-400'>
                      <p className='text-xs font-semibold text-zinc-500 uppercase tracking-wider'>
                        Lịch sử bản vẽ cũ của Khung #{p.panelNumber} ({olderPanelArts.length} bản
                        cũ):
                      </p>
                      {olderPanelArts.map((art) => (
                        <div
                          key={art.id}
                          className='p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-1.5'
                        >
                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                            <div className='flex items-center gap-2 flex-wrap min-w-0'>
                              <span className='font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 text-xs'>
                                v{art.versionNumber} (Bản cũ)
                              </span>
                              <span
                                className='text-zinc-700 font-medium text-xs truncate max-w-[200px]'
                                title={art.fileName}
                              >
                                {getDisplayArtworkTitle(art, p, false)}
                              </span>
                              <strong className='font-mono font-bold text-zinc-600 text-xs'>
                                (v{art.versionNumber})
                              </strong>
                              <span className='text-xs text-zinc-500 font-mono'>
                                {formatSize(art.sizeBytes)} ·{' '}
                                {new Date(art.createdAt).toLocaleString('vi-VN')}
                              </span>
                              {getStatusBadges(art).map((b) => (
                                <span
                                  key={b.label}
                                  className={`px-1.5 py-0.5 rounded border text-xs font-bold ${b.cls}`}
                                >
                                  {b.label}
                                </span>
                              ))}
                            </div>
                            <div className='flex items-center gap-1.5'>
                              <button
                                type='button'
                                onClick={() =>
                                  setDetailsExpanded((prev) => ({
                                    ...prev,
                                    [art.id]: !prev[art.id],
                                  }))
                                }
                                className='text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer font-medium'
                              >
                                <Info className='w-3 h-3' />
                                {detailsExpanded[art.id] ? 'Ẩn chi tiết' : 'Chi tiết'}
                              </button>
                              <button
                                type='button'
                                onClick={() => void handlePreview(art)}
                                className='px-2 py-0.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs'
                              >
                                <Eye className='w-3 h-3' />
                                <span>
                                  {openPreviewIds[art.id] && previews[art.id] ? 'Ẩn' : 'Xem bản cũ'}
                                </span>
                              </button>
                            </div>
                          </div>
                          {detailsExpanded[art.id] && (
                            <div
                              data-testid={`artwork-details-${art.id}`}
                              className='p-2 rounded bg-white border border-zinc-200 text-xs font-mono text-zinc-600 space-y-0.5'
                            >
                              <div>
                                Tên file:{' '}
                                <span className='text-zinc-900 font-medium'>{art.fileName}</span>
                              </div>
                              <div>
                                Dung lượng: {formatSize(art.sizeBytes)} (
                                {art.sizeBytes.toLocaleString()} bytes)
                              </div>
                              <div>Trạng thái bảo chứng: <span className='text-emerald-700 font-medium'>Đã niêm phong an toàn</span></div>
                      <div className='truncate text-[11px] text-zinc-500'>Mã toàn vẹn: {art.sha256}</div>
                              <div>
                                Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                          )}
                          {openPreviewIds[art.id] && previews[art.id] && (
                            <ArtworkPreviewCard
                              art={art}
                              src={previews[art.id]}
                              alt={`Artwork v${art.versionNumber} của khung #${p.panelNumber}`}
                              friendlyTitle={getDisplayArtworkTitle(art, p, false)}
                              contextTitle={`Khung #${p.panelNumber} • Bản cũ v${art.versionNumber}`}
                              onOpenZoom={(zoomData) => setZoomed(zoomData)}
                              onRetry={() => handleRetryPreview(art)}
                              onClose={() => handleTogglePreview(art)}
                              renderOverlay={renderBoundingBoxes(art.id, false)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mine.length === 0 ? (
        <p className='text-xs text-[#888888]'>Chưa có artwork nào ở công đoạn này.</p>
      ) : fullPageArts.length > 0 ? (
        <div className='space-y-2'>
          {panels.length > 0 && (
            <p className='text-xs font-bold text-zinc-800 flex items-center gap-1.5'>
              <ImageIcon className='w-3.5 h-3.5 text-orange-600' />
              <span>Ảnh artwork cả trang ({fullPageArts.length} phiên bản)</span>
            </p>
          )}
          <ul className='space-y-2'>
            {displayArtworks.map((art) => {
              const matchedPanel = art.panelId ? panels.find((p) => p.id === art.panelId) : null;
              const isCurrent = art.id === latestArt?.id;

              return (
                <li
                  key={art.id}
                  className={`p-2.5 rounded-xl border text-xs space-y-2 transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/30 border-emerald-200/90 shadow-2xs'
                      : 'bg-zinc-50/70 border-zinc-200'
                  }`}
                >
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <span className='font-mono font-bold text-zinc-900'>
                          v{art.versionNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            isCurrent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {isCurrent ? 'Bản hiện tại' : 'Bản cũ'}
                        </span>
                        <span className='truncate font-semibold text-zinc-900'>{art.fileName}</span>
                        <strong className='font-mono font-bold text-emerald-800 text-xs'>
                          (v{art.versionNumber})
                        </strong>
                        <ScopeBadge art={art} matchedPanelNumber={matchedPanel?.panelNumber} />
                        {getStatusBadges(art).map((b) => (
                          <span
                            key={b.label}
                            className={`px-1.5 py-0.5 rounded border text-xs font-bold ${b.cls}`}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                      <div className='mt-1 flex items-center gap-2 flex-wrap'>
                        <button
                          type='button'
                          onClick={() =>
                            setDetailsExpanded((prev) => ({ ...prev, [art.id]: !prev[art.id] }))
                          }
                          className='text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer font-medium'
                        >
                          <Info className='w-3 h-3' />
                          {detailsExpanded[art.id] ? 'Ẩn chi tiết' : 'Chi tiết'}
                        </button>
                        <span className='text-xs text-zinc-500 font-mono'>
                          {formatSize(art.sizeBytes)} ·{' '}
                          {new Date(art.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={() => void handlePreview(art)}
                      disabled={previewLoading === art.id}
                      className='px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs'
                    >
                      {previewLoading === art.id ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Eye className='w-3 h-3' />
                      )}
                      <span>{openPreviewIds[art.id] && previews[art.id] ? 'Ẩn' : 'Xem'}</span>
                    </button>
                  </div>
                  {detailsExpanded[art.id] && (
                    <div
                      data-testid={`artwork-details-${art.id}`}
                      className='mt-1 p-2 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-600 space-y-0.5'
                    >
                      <div>
                        Tên file: <span className='text-zinc-900 font-medium'>{art.fileName}</span>
                      </div>
                      <div>
                        Dung lượng: {formatSize(art.sizeBytes)} ({art.sizeBytes.toLocaleString()}{' '}
                        bytes)
                      </div>
                      <div>Trạng thái bảo chứng: <span className='text-emerald-700 font-medium'>Đã niêm phong an toàn</span></div>
                      <div className='truncate text-[11px] text-zinc-500'>Mã toàn vẹn: {art.sha256}</div>
                      <div>Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}</div>
                    </div>
                  )}
                  {openPreviewIds[art.id] && previews[art.id] && (
                    <ArtworkPreviewCard
                      art={art}
                      src={previews[art.id]}
                      alt={`Artwork v${art.versionNumber} của ${getDisplayArtworkTitle(art, matchedPanel, false)}`}
                      friendlyTitle={getDisplayArtworkTitle(art, matchedPanel, false)}
                      contextTitle={
                        isCurrent
                          ? 'Bản vẽ cả trang (Hiện tại)'
                          : `Bản vẽ cả trang (Bản cũ v${art.versionNumber})`
                      }
                      onOpenZoom={(zoomData) => setZoomed(zoomData)}
                      onRetry={() => handleRetryPreview(art)}
                      onClose={() => handleTogglePreview(art)}
                      renderOverlay={renderBoundingBoxes(art.id, false)}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {olderArts.length > 0 && (
            <button
              type='button'
              onClick={() => setShowOlder((prev) => !prev)}
              className='w-full py-1.5 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs'
            >
              {showOlder ? (
                <ChevronUp className='w-3.5 h-3.5' />
              ) : (
                <ChevronDown className='w-3.5 h-3.5' />
              )}
              <span>
                {showOlder ? 'Thu gọn phiên bản cũ' : `Xem ${olderArts.length} phiên bản cũ`}
              </span>
            </button>
          )}
        </div>
      ) : mine.length > 1 ? (
        /* When page has panels and all arts are assigned to panels, keep an overall history drawer */
        <div className='pt-1'>
          <button
            type='button'
            onClick={() => setShowOlder((prev) => !prev)}
            className='w-full py-1.5 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs'
          >
            {showOlder ? (
              <ChevronUp className='w-3.5 h-3.5' />
            ) : (
              <ChevronDown className='w-3.5 h-3.5' />
            )}
            <span>
              {showOlder
                ? 'Thu gọn danh sách tất cả phiên bản'
                : `Xem toàn bộ lịch sử (${mine.length} bản ghi)`}
            </span>
          </button>
          {showOlder && (
            <div className='mt-2 space-y-2'>
              <p className='text-xs font-semibold text-zinc-500 uppercase tracking-wider'>
                Lịch sử tải lên toàn trang ({mine.length} bản ghi):
              </p>
              <ul className='space-y-2'>
                {[...mine].reverse().map((art) => {
                  const matchedPanel = art.panelId
                    ? panels.find((p) => p.id === art.panelId)
                    : null;
                  const isCurrent = isLatestInOwnScope(art);

                  return (
                    <li
                      key={art.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                        isCurrent
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-zinc-50/70 border-zinc-200'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <span className='font-mono font-bold text-zinc-900'>
                              v{art.versionNumber}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                isCurrent
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {isCurrent ? 'Bản hiện tại' : 'Bản cũ'}
                            </span>
                            <span className='truncate font-semibold text-zinc-900'>
                              {art.fileName}
                            </span>
                            <ScopeBadge art={art} matchedPanelNumber={matchedPanel?.panelNumber} />
                            {getStatusBadges(art).map((b) => (
                              <span
                                key={b.label}
                                className={`px-1.5 py-0.5 rounded border text-xs font-bold ${b.cls}`}
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                          <div className='mt-1 flex items-center gap-2 flex-wrap'>
                            <button
                              type='button'
                              onClick={() =>
                                setDetailsExpanded((prev) => ({
                                  ...prev,
                                  [art.id]: !prev[art.id],
                                }))
                              }
                              className='text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer font-medium'
                            >
                              <Info className='w-3 h-3' />
                              {detailsExpanded[art.id] ? 'Ẩn chi tiết' : 'Chi tiết'}
                            </button>
                            <span className='text-xs text-zinc-500 font-mono'>
                              {formatSize(art.sizeBytes)} ·{' '}
                              {new Date(art.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => void handlePreview(art)}
                          disabled={previewLoading === art.id}
                          className='px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs'
                        >
                          {previewLoading === art.id ? (
                            <Loader2 className='w-3 h-3 animate-spin' />
                          ) : (
                            <Eye className='w-3 h-3' />
                          )}
                          <span>{openPreviewIds[art.id] && previews[art.id] ? 'Ẩn' : 'Xem'}</span>
                        </button>
                      </div>
                      {detailsExpanded[art.id] && (
                        <div
                          data-testid={`artwork-details-${art.id}`}
                          className='p-2 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-600 space-y-0.5'
                        >
                          <div>
                            Tên file:{' '}
                            <span className='text-zinc-900 font-medium'>{art.fileName}</span>
                          </div>
                          <div>
                            Dung lượng: {formatSize(art.sizeBytes)} (
                            {art.sizeBytes.toLocaleString()} bytes)
                          </div>
                          <div className='truncate'>SHA-256: {art.sha256}</div>
                          <div>
                            Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      )}
                      {openPreviewIds[art.id] && previews[art.id] && (
                        <ArtworkPreviewCard
                          art={art}
                          src={previews[art.id]}
                          alt={`Artwork v${art.versionNumber} của ${getDisplayArtworkTitle(art, matchedPanel, !matchedPanel && Boolean(art.panelId))}`}
                          friendlyTitle={getDisplayArtworkTitle(
                            art,
                            matchedPanel,
                            !matchedPanel && Boolean(art.panelId),
                          )}
                          contextTitle={
                            matchedPanel
                              ? `Khung #${matchedPanel.panelNumber}`
                              : art.panelId
                                ? 'Khung trước đây'
                                : 'Cả trang'
                          }
                          onOpenZoom={(zoomData) => setZoomed(zoomData)}
                          onRetry={() => handleRetryPreview(art)}
                          onClose={() => handleTogglePreview(art)}
                          renderOverlay={renderBoundingBoxes(art.id, false)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {/* Ảnh của khung đã xoá: giữ trong lịch sử (append-only) nhưng tách riêng, nhóm theo từng khung */}
      {deletedPanelArts.length > 0 && (
        <div className='space-y-1.5' data-testid='deleted-panel-artworks'>
          <button
            type='button'
            onClick={() => setShowDeletedPanelArts((v) => !v)}
            aria-expanded={showDeletedPanelArts}
            className='w-full py-1.5 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs'
          >
            {showDeletedPanelArts ? (
              <ChevronUp className='w-3.5 h-3.5' />
            ) : (
              <ChevronDown className='w-3.5 h-3.5' />
            )}
            <span>
              {showDeletedPanelArts ? 'Ẩn' : 'Xem'} {deletedPanelArts.length} phiên bản của khung đã
              xoá
            </span>
          </button>
          {showDeletedPanelArts && (
            <div className='space-y-2.5 pt-1'>
              {deletedPanelGroups.map((group, groupIdx) => (
                <div
                  key={group.panelId}
                  className='p-2.5 rounded-xl border border-stone-200/90 bg-[#F5F2EB]/35 space-y-2'
                >
                  <div className='flex items-center justify-between text-xs text-stone-600 px-0.5 flex-wrap gap-1'>
                    <span className='font-semibold flex items-center gap-1.5 text-stone-800'>
                      <span className='w-1.5 h-1.5 rounded-full bg-stone-400' />
                      <span>
                        Khung trước đây {deletedPanelGroups.length > 1 ? `#${groupIdx + 1}` : ''} (
                        {group.arts.length} phiên bản)
                      </span>
                    </span>
                    <span className='font-mono text-[11px] text-stone-400'>
                      ID: {group.panelId.slice(0, 8)}…
                    </span>
                  </div>

                  <ul className='space-y-1.5'>
                    {group.arts.map((art) => {
                      const isLatestInGroup = art.id === group.latestArt.id;
                      const isPreviewOpen = Boolean(openPreviewIds[art.id] && previews[art.id]);
                      const friendlyTitle = getDisplayArtworkTitle(art, null, true);

                      return (
                        <li
                          key={art.id}
                          className='p-2.5 rounded-lg border border-stone-200 bg-white text-xs space-y-2 shadow-2xs'
                        >
                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                            <div className='flex items-center gap-1.5 flex-wrap min-w-0'>
                              <span className='font-mono font-bold text-stone-800'>
                                v{art.versionNumber}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                  isLatestInGroup
                                    ? 'bg-stone-200 text-stone-800'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {isLatestInGroup ? 'Bản cuối của khung' : 'Bản cũ'}
                              </span>
                              <ScopeBadge art={art} />
                              <span
                                className='truncate font-medium text-stone-900 max-w-[220px]'
                                title={art.fileName}
                              >
                                {friendlyTitle}
                              </span>
                              <span className='font-mono text-stone-500 text-[11px]'>
                                {formatSize(art.sizeBytes)} ·{' '}
                                {new Date(art.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className='flex items-center gap-1.5 shrink-0'>
                              <button
                                type='button'
                                onClick={() =>
                                  setDetailsExpanded((prev) => ({
                                    ...prev,
                                    [art.id]: !prev[art.id],
                                  }))
                                }
                                className='text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer font-medium'
                              >
                                <Info className='w-3 h-3' />
                                {detailsExpanded[art.id] ? 'Ẩn chi tiết' : 'Chi tiết'}
                              </button>
                              <button
                                type='button'
                                onClick={() => void handlePreview(art)}
                                disabled={previewLoading === art.id}
                                className='px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shadow-2xs'
                              >
                                {previewLoading === art.id ? (
                                  <Loader2 className='w-3 h-3 animate-spin' />
                                ) : (
                                  <Eye className='w-3 h-3' />
                                )}
                                <span>{isPreviewOpen ? 'Ẩn' : 'Xem'}</span>
                              </button>
                            </div>
                          </div>

                          {detailsExpanded[art.id] && (
                            <div
                              data-testid={`artwork-details-${art.id}`}
                              className='p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs font-mono text-stone-600 space-y-0.5'
                            >
                              <div>
                                Tên file:{' '}
                                <span className='text-zinc-900 font-medium'>{art.fileName}</span>
                              </div>
                              <div>
                                Dung lượng: {formatSize(art.sizeBytes)} (
                                {art.sizeBytes.toLocaleString()} bytes)
                              </div>
                              <div className='truncate'>SHA-256: {art.sha256}</div>
                              <div>
                                Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}
                              </div>
                              {art.panelId && <div>Mã khung (panelId): {art.panelId}</div>}
                            </div>
                          )}

                          {isPreviewOpen && previews[art.id] && (
                            <ArtworkPreviewCard
                              art={art}
                              src={previews[art.id]}
                              alt={`Artwork v${art.versionNumber} của khung đã xoá`}
                              friendlyTitle={friendlyTitle}
                              contextTitle={`Khung trước đây (ID: ${group.panelId.slice(0, 8)}…)`}
                              onOpenZoom={(zoomData) => setZoomed(zoomData)}
                              onRetry={() => handleRetryPreview(art)}
                              onClose={() => handleTogglePreview(art)}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {zoomed && (
        <ArtworkLightboxModal
          zoomed={zoomed}
          onClose={() => setZoomed(null)}
          renderBoundingBoxes={renderBoundingBoxes}
        />
      )}
    </div>
  );
};

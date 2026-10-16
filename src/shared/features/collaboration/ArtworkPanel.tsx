import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  ImageIcon,
  Info,
  LayoutTemplate,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type { AssetReferenceDto, ChangeRequestDto, PanelDto, SubmissionDto } from '@/types';
import { artworkService, computeFileSha256, resolveArtworkUrl } from '@/services/artwork.service';
import { errorMessage, parseRegionBox } from './collaborationRules';

/** Khớp giới hạn của Backend (25 MB, PNG/JPEG/WebP); Backend vẫn kiểm lại nội dung thật. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

interface ArtworkPanelProps {
  chapterId: string;
  pageId: string | null;
  stageId: string;
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
  const fileInput = useRef<HTMLInputElement>(null);
  const panelFileInput = useRef<HTMLInputElement>(null);
  const [activeUploadPanelId, setActiveUploadPanelId] = useState<string | null>(null);

  const [phase, setPhase] = useState<'idle' | 'hashing' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string; artId?: string } | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  const mine = artworks
    .filter((a) => a.pageId === pageId && a.pipelineStageId === stageId)
    .sort((a, b) => {
      if (a.versionNumber !== b.versionNumber) {
        return a.versionNumber - b.versionNumber;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

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
      const result = await artworkService.uploadArtwork(
        chapterId,
        pageId,
        file,
        stageId,
        sha256,
        undefined,
        targetPanelId,
      );
      const targetPanel = panels.find((p) => p.id === targetPanelId);
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
    if (previews[art.id]) {
      setPreviews((p) => {
        const { [art.id]: _removed, ...rest } = p;
        return rest;
      });
      return;
    }
    setPreviewLoading(art.id);
    setError(null);
    try {
      const link = await artworkService.getArtworkAccessLink(chapterId, art.id);
      setPreviews((p) => ({ ...p, [art.id]: resolveArtworkUrl(link.url) }));
    } catch (err) {
      setError(errorMessage(err, 'Không thể xin link xem artwork.'));
    } finally {
      setPreviewLoading(null);
    }
  };

  const [expandedPanelHistory, setExpandedPanelHistory] = useState<Record<string, boolean>>({});

  const busy = phase !== 'idle';

  const fullPageArts = mine.filter((a) => !a.panelId);
  const latestArt = mine.length > 0 ? mine[mine.length - 1] : null;
  const olderArts = mine.length > 1 ? mine.slice(0, -1).reverse() : [];
  const displayArtworks = showOlder ? [...mine].reverse() : latestArt ? [latestArt] : [];

  const getStatusBadges = (art: AssetReferenceDto) => {
    const badges: { label: string; cls: string }[] = [];
    const scopeArts = art.panelId
      ? mine.filter((a) => a.panelId === art.panelId)
      : mine.filter((a) => !a.panelId);
    const isLatestInScope = scopeArts.length > 0 && scopeArts[scopeArts.length - 1].id === art.id;
    if (isLatestInScope) {
      badges.push({ label: 'Mới nhất', cls: 'bg-blue-50 text-blue-700 border-blue-200' });
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
        badges.push({ label: 'Đang duyệt', cls: 'bg-amber-50 text-amber-700 border-amber-200' });
      } else if (isApproved) {
        badges.push({
          label: 'Đã duyệt',
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        });
      } else if (isRejected) {
        badges.push({ label: 'Bị trả về', cls: 'bg-red-50 text-red-700 border-red-200' });
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
        </span>

        {canUpload && (
          <div className='flex items-center gap-1.5'>
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
              className='px-2.5 py-1 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs'
            >
              {busy ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Upload className='w-3 h-3 text-[#F97316]' />
              )}
              <span>
                {phase === 'hashing'
                  ? 'Đang tính SHA-256…'
                  : phase === 'uploading'
                    ? 'Đang tải lên…'
                    : 'Tải artwork lên'}
              </span>
            </button>
            <input
              ref={panelFileInput}
              type='file'
              accept={ACCEPTED.join(',')}
              className='hidden'
              data-testid='panel-artwork-file-input'
              onChange={(e) =>
                void handleFile(e.target.files?.[0], activeUploadPanelId ?? undefined)
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
                  className='p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-2 transition-all'
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
                          {getStatusBadges(latestPanelArt).map((b) => (
                            <span
                              key={b.label}
                              className={`px-1.5 py-0.5 rounded border text-xs font-bold ${b.cls}`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
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
                          <span>{previews[latestPanelArt.id] ? 'Ẩn' : 'Xem'}</span>
                        </button>
                      )}
                      {onOpenBible && (
                        <button
                          type='button'
                          onClick={() => onOpenBible(p.id, p.panelNumber)}
                          data-testid={`panel-bible-btn-${p.id}`}
                          title='Xem tham chiếu thiết kế nhân vật trong khung tranh này'
                          className='px-2.5 py-1 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[10px] font-semibold text-orange-800 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                        >
                          <BookOpen className='w-3 h-3 text-[#F97316]' />
                          <span>Bible</span>
                        </button>
                      )}
                      {canUpload && (
                        <button
                          type='button'
                          disabled={busy}
                          data-testid={`upload-panel-btn-${p.id}`}
                          onClick={() => {
                            setActiveUploadPanelId(p.id);
                            panelFileInput.current?.click();
                          }}
                          className='px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors'
                        >
                          <Upload className='w-3 h-3' />
                          <span>Tải ảnh cho khung</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {latestPanelArt && previews[latestPanelArt.id] && (
                    <div
                      id={`artwork-preview-container-${latestPanelArt.id}`}
                      className='relative inline-block max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950/5 p-1'
                    >
                      <button
                        type='button'
                        title='Bấm để phóng to'
                        onClick={() =>
                          setZoomed({
                            src: previews[latestPanelArt.id],
                            alt: `Artwork v${latestPanelArt.versionNumber} của khung #${p.panelNumber}`,
                            artId: latestPanelArt.id,
                          })
                        }
                        className='block cursor-zoom-in'
                      >
                        <img
                          src={previews[latestPanelArt.id]}
                          alt={`Artwork v${latestPanelArt.versionNumber} của khung #${p.panelNumber}`}
                          className='max-h-60 w-auto block rounded'
                        />
                      </button>
                      {renderBoundingBoxes(latestPanelArt.id, false)}
                    </div>
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
                              <span className='text-zinc-700 font-medium text-xs truncate max-w-[200px]'>
                                {art.fileName}
                              </span>
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
                                <span>{previews[art.id] ? 'Ẩn' : 'Xem bản cũ'}</span>
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
                              <div className='truncate'>SHA-256: {art.sha256}</div>
                              <div>
                                Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                          )}
                          {previews[art.id] && (
                            <div
                              id={`artwork-preview-container-${art.id}`}
                              className='relative inline-block max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950/5 p-1'
                            >
                              <button
                                type='button'
                                title='Bấm để phóng to'
                                onClick={() =>
                                  setZoomed({
                                    src: previews[art.id],
                                    alt: `Artwork v${art.versionNumber} của khung #${p.panelNumber}`,
                                    artId: art.id,
                                  })
                                }
                                className='block cursor-zoom-in'
                              >
                                <img
                                  src={previews[art.id]}
                                  alt={`Artwork v${art.versionNumber} của khung #${p.panelNumber}`}
                                  className='max-h-56 w-auto block rounded'
                                />
                              </button>
                              {renderBoundingBoxes(art.id, false)}
                            </div>
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
      ) : panels.length === 0 || fullPageArts.length > 0 ? (
        <div className='space-y-2'>
          {panels.length > 0 && fullPageArts.length > 0 && (
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
                        {matchedPanel ? (
                          <span className='px-1.5 py-0.5 rounded border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200'>
                            Khung #{matchedPanel.panelNumber}
                          </span>
                        ) : (
                          <span className='px-1.5 py-0.5 rounded border text-xs font-bold bg-zinc-100 text-zinc-700 border-zinc-200'>
                            Cả trang
                          </span>
                        )}
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
                          {formatSize(art.sizeBytes)} · sha256 {art.sha256.slice(0, 10)}… ·{' '}
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
                      <span>{previews[art.id] ? 'Ẩn' : 'Xem'}</span>
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
                      <div className='truncate'>SHA-256: {art.sha256}</div>
                      <div>Thời gian tải: {new Date(art.createdAt).toLocaleString('vi-VN')}</div>
                    </div>
                  )}
                  {previews[art.id] && (
                    <div
                      id={`artwork-preview-container-${art.id}`}
                      className='relative inline-block max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950/5 p-1'
                    >
                      <button
                        type='button'
                        title='Bấm để phóng to'
                        onClick={() =>
                          setZoomed({
                            src: previews[art.id],
                            alt: `Artwork v${art.versionNumber} của ${art.fileName}`,
                            artId: art.id,
                          })
                        }
                        className='block cursor-zoom-in'
                      >
                        <img
                          src={previews[art.id]}
                          alt={`Artwork v${art.versionNumber} của ${art.fileName}`}
                          className='max-h-72 w-auto block rounded'
                        />
                      </button>
                      {renderBoundingBoxes(art.id, false)}
                    </div>
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
      ) : olderArts.length > 0 ? (
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
                : `Xem ${olderArts.length} phiên bản cũ`}
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
                  const panelArts = art.panelId
                    ? mine.filter((a) => a.panelId === art.panelId)
                    : [];
                  const isCurrent =
                    panelArts.length > 0 && panelArts[panelArts.length - 1].id === art.id;

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
                            {matchedPanel && (
                              <span className='px-1.5 py-0.5 rounded border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200'>
                                Khung #{matchedPanel.panelNumber}
                              </span>
                            )}
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
                              {formatSize(art.sizeBytes)} · sha256 {art.sha256.slice(0, 10)}… ·{' '}
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
                          <span>{previews[art.id] ? 'Ẩn' : 'Xem'}</span>
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
                      {previews[art.id] && (
                        <div
                          id={`artwork-preview-container-${art.id}`}
                          className='relative inline-block max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950/5 p-1'
                        >
                          <button
                            type='button'
                            title='Bấm để phóng to'
                            onClick={() =>
                              setZoomed({
                                src: previews[art.id],
                                alt: `Artwork v${art.versionNumber} của ${art.fileName}`,
                                artId: art.id,
                              })
                            }
                            className='block cursor-zoom-in'
                          >
                            <img
                              src={previews[art.id]}
                              alt={`Artwork v${art.versionNumber} của ${art.fileName}`}
                              className='max-h-72 w-auto block rounded'
                            />
                          </button>
                          {renderBoundingBoxes(art.id, false)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {zoomed && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label={zoomed.alt}
          data-testid='artwork-zoom'
          onClick={() => setZoomed(null)}
          className='fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out'
        >
          <button
            type='button'
            aria-label='Đóng'
            onClick={() => setZoomed(null)}
            className='absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white cursor-pointer z-30'
          >
            <X className='w-4 h-4' />
          </button>
          <div
            className='relative inline-block max-h-[90vh] max-w-[90vw]'
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomed.src}
              alt={zoomed.alt}
              className='max-h-[90vh] max-w-[90vw] w-auto h-auto block bg-white rounded object-contain'
            />
            {zoomed.artId && renderBoundingBoxes(zoomed.artId, true)}
          </div>
        </div>
      )}
    </div>
  );
};

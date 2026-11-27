import React, { useRef } from 'react';
import { Eye, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { PanelDto } from '@/types/pipeline';
import { parseBoundingBox } from '../../utils/panelBoundingBox';

export interface PanelArtworkData {
  id: string;
  panelId: string;
  panelNumber: number;
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
  /** 'auto-split': ảnh cắt tự động từ ảnh phác thảo toàn trang (chỉ có ở máy, chưa tải lên). */
  source?: 'auto-split' | 'upload';
  /** Ảnh mới chỉ ở máy (bố cục chưa lưu): được tải lên server khi lưu bố cục. */
  pendingUpload?: boolean;
}

const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp';
const HOVER_ACTION =
  'focus-ring w-9 h-9 flex items-center justify-center rounded-lg shadow-sm cursor-pointer transition-colors';

interface PanelFrameOverlayProps {
  panels: PanelDto[];
  pageWidth: number;
  pageHeight: number;
  templateCode?: string;
  artworks: Record<string, PanelArtworkData>;
  isLayoutSaved: boolean;
  canUploadArtwork?: boolean;
  selectedPanelId?: string | null;
  onSelectPanel?: (panelId: string | null) => void;
  onUploadArtwork: (panelId: string, panelNumber: number, file: File) => void;
  onRemoveArtwork: (panelId: string, panelNumber: number) => void;
  onPreviewArtwork: (preview: { imageUrl: string; title: string }) => void;
}

const frameClass = (borderless: boolean, locked: boolean, inset: boolean): string => {
  if (borderless) return 'border-2 border-dashed border-orange-500/85 bg-orange-50/15';
  if (locked)
    return inset
      ? 'border-2 border-stone-900 bg-white'
      : 'border-2 border-stone-900 bg-stone-50/20';
  return inset
    ? 'border-2 border-dashed border-stone-600 bg-white'
    : 'border-2 border-dashed border-stone-400/80 bg-stone-100/30';
};

export const PanelFrameOverlay: React.FC<PanelFrameOverlayProps> = ({
  panels,
  pageWidth,
  pageHeight,
  templateCode,
  artworks,
  isLayoutSaved,
  canUploadArtwork = true,
  selectedPanelId = null,
  onSelectPanel,
  onUploadArtwork,
  onRemoveArtwork,
  onPreviewArtwork,
}) => {
  const { t } = useTranslation('artist');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const boxes = panels.map((p) => parseBoundingBox(p.boundingBox, pageWidth, pageHeight));

  return (
    <div
      data-testid='canvas-panel-template-overlay'
      className='absolute inset-0 z-20 pointer-events-none'
    >
      {panels.map((pnl, idx) => {
        const box = boxes[idx];
        const panelNum = pnl.panelNumber || idx + 1;
        const artwork = artworks[pnl.id];
        const corners = box.corners && box.corners.length >= 3 ? box.corners : null;
        // An inset panel is a small frame drawn on top of a full-width one (TPL-MANGA-06 is the inset template).
        const isInset =
          (templateCode === 'TPL-MANGA-06' && idx > 0) ||
          (box.percentW < 50 &&
            box.percentH < 50 &&
            boxes.some((b, i) => i !== idx && b.percentW > 80));
        const openPicker = () => {
          if (!canUploadArtwork) return;
          fileInputs.current[pnl.id]?.click();
        };

        const isSelected = selectedPanelId === pnl.id;

        return (
          <div
            key={pnl.id}
            data-testid={`canvas-panel-frame-${panelNum}`}
            data-panel-selected={isSelected ? 'true' : 'false'}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPanel?.(isSelected ? null : pnl.id);
            }}
            className={`absolute overflow-hidden ${isInset ? 'z-30 shadow-md bg-white' : 'z-20'} ${
              corners ? '' : frameClass(!!box.borderless, isLayoutSaved, isInset)
            } ${isSelected ? 'ring-2 ring-[#F97316]' : ''} pointer-events-auto`}
            style={{
              left: `${box.percentX}%`,
              top: `${box.percentY}%`,
              width: `${box.percentW}%`,
              height: `${box.percentH}%`,
              clipPath: corners
                ? `polygon(${corners.map((c) => `${c.x * 100}% ${c.y * 100}%`).join(', ')})`
                : undefined,
            }}
          >
            {corners && (
              <svg
                className='absolute inset-0 w-full h-full pointer-events-none z-10'
                viewBox='0 0 100 100'
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                <polygon
                  points={corners.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')}
                  fill={
                    isInset
                      ? '#ffffff'
                      : isLayoutSaved
                        ? 'rgba(250, 250, 249, 0.2)'
                        : 'rgba(245, 245, 244, 0.3)'
                  }
                  stroke={box.borderless ? '#f97316' : isLayoutSaved ? '#1c1917' : '#78716c'}
                  strokeWidth={isLayoutSaved ? '2.5' : '2'}
                  strokeDasharray={box.borderless || !isLayoutSaved ? '6 4' : undefined}
                  vectorEffect='non-scaling-stroke'
                />
              </svg>
            )}

            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onSelectPanel?.(isSelected ? null : pnl.id);
              }}
              data-testid={`canvas-panel-badge-${panelNum}`}
              title={t('panelFrame.selectPanelTitle', { panelNum })}
              className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                isSelected || !artwork
                  ? 'bg-[#EA580C] text-white'
                  : 'bg-white text-stone-900 border border-stone-200 hover:border-[#EA580C]'
              }`}
            >
              {panelNum}
            </button>

            {artwork ? (
              <div className='relative w-full h-full group'>
                <img
                  src={artwork.imageUrl}
                  alt={artwork.fileName}
                  className='w-full h-full object-cover select-none'
                />
                <div className='absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                  <button
                    type='button'
                    onClick={() =>
                      onPreviewArtwork({
                        imageUrl: artwork.imageUrl,
                        title: t('panelFrame.previewTitle', {
                          panelNum,
                          fileName: artwork.fileName,
                        }),
                      })
                    }
                    data-testid={`panel-btn-view-${panelNum}`}
                    className={`${HOVER_ACTION} bg-white/90 hover:bg-white text-stone-800`}
                    title={t('panelFrame.zoomTitle')}
                    aria-label={t('panelFrame.zoomAria', { panelNum })}
                  >
                    <Eye className='w-4 h-4' aria-hidden='true' />
                  </button>
                  <button
                    type='button'
                    disabled={!canUploadArtwork}
                    onClick={openPicker}
                    data-testid={`panel-btn-replace-${panelNum}`}
                    className={`${HOVER_ACTION} bg-white/90 hover:bg-white text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={
                      canUploadArtwork
                        ? t('panelFrame.replaceTitle')
                        : t('common.noOpenSlotForPageStage')
                    }
                    aria-label={t('panelFrame.replaceAria', { panelNum })}
                  >
                    <UploadCloud className='w-4 h-4' aria-hidden='true' />
                  </button>
                  <button
                    type='button'
                    disabled={!canUploadArtwork}
                    onClick={() => canUploadArtwork && onRemoveArtwork(pnl.id, panelNum)}
                    data-testid={`panel-btn-remove-${panelNum}`}
                    className={`${HOVER_ACTION} bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={
                      canUploadArtwork
                        ? t('panelFrame.removeTitle')
                        : t('common.noOpenSlotForPageStage')
                    }
                    aria-label={t('panelFrame.removeAria', { panelNum })}
                  >
                    <Trash2 className='w-4 h-4' aria-hidden='true' />
                  </button>
                </div>
              </div>
            ) : (
              // Khung trống là giấy trắng (che phác thảo/ảnh trang bên dưới) kèm ô nạp ảnh mới,
              // kể cả khi bố cục chưa lưu; bị khoá khi trang không có ô đang mở.
              <button
                type='button'
                disabled={!canUploadArtwork}
                onDragOver={(e) => {
                  if (canUploadArtwork) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canUploadArtwork) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) onUploadArtwork(pnl.id, panelNum, file);
                }}
                onClick={openPicker}
                data-testid={`panel-dropzone-${panelNum}`}
                title={canUploadArtwork ? undefined : t('common.noOpenSlotForPageStage')}
                className='group focus-ring w-full h-full flex flex-col items-center justify-center gap-1 p-2 bg-white text-stone-600 hover:text-stone-900 hover:bg-orange-50/30 cursor-pointer transition-colors border-2 border-dashed border-stone-300 hover:border-[#EA580C] disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-stone-300'
              >
                <span
                  className='w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 group-hover:text-[#EA580C] group-disabled:opacity-40 transition-colors'
                  aria-hidden='true'
                >
                  <ImagePlus className='w-4 h-4' />
                </span>
                <span className='text-xs font-semibold text-stone-800 text-center group-disabled:opacity-40'>
                  {t('panelFrame.uploadPanel', { panelNum })}
                </span>
                <span className='text-[11px] text-stone-500 text-center group-disabled:opacity-40'>
                  {t('panelFrame.dropOrClick')}
                </span>
              </button>
            )}

            <input
              type='file'
              disabled={!canUploadArtwork}
              ref={(el) => {
                fileInputs.current[pnl.id] = el;
              }}
              accept={ACCEPTED_IMAGES}
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && canUploadArtwork) {
                  onUploadArtwork(pnl.id, panelNum, file);
                  e.target.value = '';
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

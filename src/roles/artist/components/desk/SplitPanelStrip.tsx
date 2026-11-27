import React from 'react';
import { Download, Eye, ImageOff, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { PanelDto } from '@/types/pipeline';
import type { PanelArtworkData } from './PanelFrameOverlay';

interface SplitPanelStripProps {
  panels: PanelDto[];
  artworks: Record<string, PanelArtworkData>;
  canEdit: boolean;
  selectedPanelId?: string | null;
  onSelectPanel: (panelId: string | null) => void;
  onPreviewArtwork: (preview: { imageUrl: string; title: string }) => void;
  onRemoveArtwork: (panelId: string, panelNumber: number) => void;
}

const ACTION =
  'focus-ring w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer';

/**
 * Dải ảnh của từng khung trên trang (sau khi tách từ ảnh phác thảo hoặc tải lên):
 * mỗi khung là một ảnh độc lập có thể xem, tải xuống hoặc gỡ (khung vẫn giữ nguyên).
 */
export const SplitPanelStrip: React.FC<SplitPanelStripProps> = ({
  panels,
  artworks,
  canEdit,
  selectedPanelId = null,
  onSelectPanel,
  onPreviewArtwork,
  onRemoveArtwork,
}) => {
  const { t } = useTranslation('artist');
  const ordered = [...panels].sort(
    (a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
  );
  const filled = ordered.filter((p) => artworks[p.id]).length;

  return (
    <section
      data-testid='split-panel-strip'
      aria-label={t('splitStrip.title')}
      className='shrink-0 border-t border-stone-200 bg-white px-3 py-2.5'
    >
      <div className='mb-2 flex items-center justify-between gap-3'>
        <h2 className='text-xs font-bold text-stone-900'>{t('splitStrip.title')}</h2>
        <div className='flex items-center gap-2 text-xs text-stone-600'>
          <span>{t('splitStrip.regionsCount', { count: ordered.length })}</span>
          <span aria-hidden='true'>·</span>
          <span>{t('splitStrip.imagesCount', { count: filled })}</span>
        </div>
      </div>
      <ul className='flex gap-2 overflow-x-auto pb-1'>
        {ordered.map((panel, idx) => {
          const panelNum = panel.panelNumber || idx + 1;
          const artwork = artworks[panel.id];
          const isSelected = selectedPanelId === panel.id;
          return (
            <li
              key={panel.id}
              data-testid={`split-strip-item-${panelNum}`}
              className={`relative shrink-0 w-36 rounded-lg border bg-stone-50 p-1 ${
                isSelected ? 'border-[#EA580C] ring-1 ring-[#EA580C]' : 'border-stone-200'
              }`}
            >
              <button
                type='button'
                onClick={() => onSelectPanel(isSelected ? null : panel.id)}
                aria-pressed={isSelected}
                aria-label={t('splitStrip.selectAria', { panelNum })}
                className='focus-ring block w-full h-20 overflow-hidden rounded-md bg-white cursor-pointer'
              >
                {artwork ? (
                  <img
                    src={artwork.imageUrl}
                    alt={t('splitStrip.imageAlt', { panelNum })}
                    width={112}
                    height={64}
                    loading='lazy'
                    className='w-full h-full object-contain select-none'
                  />
                ) : (
                  <span className='flex h-full w-full flex-col items-center justify-center gap-0.5 border border-dashed border-stone-300 rounded-md text-xs text-stone-400'>
                    <ImageOff className='w-4 h-4' aria-hidden='true' />
                    {t('splitStrip.empty')}
                  </span>
                )}
              </button>
              <span className='absolute top-1.5 left-1.5 min-w-5 h-5 px-1 rounded-full bg-stone-900/80 text-white text-xs font-bold flex items-center justify-center pointer-events-none'>
                {panelNum}
              </span>
              {artwork && (
                <div className='mt-1 flex items-center justify-center gap-1'>
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
                    data-testid={`split-strip-view-${panelNum}`}
                    title={t('panelFrame.zoomTitle')}
                    aria-label={t('panelFrame.zoomAria', { panelNum })}
                    className={`${ACTION} text-stone-600 hover:bg-stone-200`}
                  >
                    <Eye className='w-3.5 h-3.5' aria-hidden='true' />
                  </button>
                  <a
                    href={artwork.imageUrl}
                    download={artwork.fileName}
                    data-testid={`split-strip-download-${panelNum}`}
                    title={t('splitStrip.downloadTitle')}
                    aria-label={t('splitStrip.downloadAria', { panelNum })}
                    className={`${ACTION} text-stone-600 hover:bg-stone-200`}
                  >
                    <Download className='w-3.5 h-3.5' aria-hidden='true' />
                  </a>
                  <button
                    type='button'
                    disabled={!canEdit}
                    onClick={() => canEdit && onRemoveArtwork(panel.id, panelNum)}
                    data-testid={`split-strip-remove-${panelNum}`}
                    title={
                      canEdit ? t('panelFrame.removeTitle') : t('common.noOpenSlotForPageStage')
                    }
                    aria-label={t('panelFrame.removeAria', { panelNum })}
                    className={`${ACTION} text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Trash2 className='w-3.5 h-3.5' aria-hidden='true' />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

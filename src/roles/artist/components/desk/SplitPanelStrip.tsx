import React from 'react';
import { Check, Download, Eye, ImageOff, Loader2, PanelsTopLeft, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { PanelDto } from '@/types/pipeline';
import type { PanelArtworkData } from './PanelFrameOverlay';

interface SplitPanelStripProps {
  panels: PanelDto[];
  artworks: Record<string, PanelArtworkData>;
  canEdit: boolean;
  canSave?: boolean;
  isSaving?: boolean;
  saveLabel?: string;
  selectedPanelId?: string | null;
  onSelectPanel: (panelId: string | null) => void;
  onPreviewArtwork: (preview: { imageUrl: string; title: string }) => void;
  onRemoveArtwork: (panelId: string, panelNumber: number) => void;
  onSave?: () => void;
}

const ACTION =
  'focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors';

/** Drawer Khung: xem nhanh ảnh đã tách/tải và lưu kết quả ngay cạnh trang. */
export const SplitPanelStrip: React.FC<SplitPanelStripProps> = ({
  panels,
  artworks,
  canEdit,
  canSave = false,
  isSaving = false,
  saveLabel,
  selectedPanelId = null,
  onSelectPanel,
  onPreviewArtwork,
  onRemoveArtwork,
  onSave,
}) => {
  const { t } = useTranslation('artist');
  const ordered = [...panels].sort(
    (a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
  );
  const filled = ordered.filter((panel) => artworks[panel.id]).length;

  return (
    <aside
      data-testid='split-panel-strip'
      aria-label={t('splitStrip.title')}
      className='flex h-full w-64 shrink-0 flex-col border-l border-stone-200 bg-white'
    >
      <header className='shrink-0 border-b border-stone-200 px-3 py-2.5'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='flex items-center gap-1.5 text-sm font-bold text-stone-900'>
            <PanelsTopLeft className='h-4 w-4 text-orange-600' aria-hidden='true' />
            {t('splitStrip.title')}
          </h2>
          <span className='rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600'>
            {filled}/{ordered.length}
          </span>
        </div>
        <p className='mt-1 text-xs text-stone-500'>{t('splitStrip.previewHint')}</p>
      </header>

      <ul className='min-h-0 flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar'>
        {ordered.map((panel, idx) => {
          const panelNum = panel.panelNumber || idx + 1;
          const artwork = artworks[panel.id];
          const isSelected = selectedPanelId === panel.id;
          return (
            <li
              key={panel.id}
              data-testid={`split-strip-item-${panelNum}`}
              className={`rounded-lg border p-1.5 transition-colors ${
                isSelected
                  ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500'
                  : 'border-stone-200 bg-stone-50'
              }`}
            >
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => onSelectPanel(isSelected ? null : panel.id)}
                  aria-pressed={isSelected}
                  aria-label={t('splitStrip.selectAria', { panelNum })}
                  className='focus-ring relative h-20 w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stone-200 bg-white'
                >
                  {artwork ? (
                    <img
                      src={artwork.imageUrl}
                      alt={t('splitStrip.imageAlt', { panelNum })}
                      width={64}
                      height={80}
                      loading='lazy'
                      className='h-full w-full select-none object-cover'
                    />
                  ) : (
                    <span className='flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-stone-400'>
                      <ImageOff className='h-4 w-4' aria-hidden='true' />
                      {t('splitStrip.empty')}
                    </span>
                  )}
                  <span className='pointer-events-none absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900/85 px-1 text-xs font-bold text-white'>
                    {panelNum}
                  </span>
                </button>

                <div className='flex min-w-0 flex-1 flex-col justify-between py-0.5'>
                  <div>
                    <p className='text-xs font-bold text-stone-900'>
                      {t('splitStrip.panelTitle', { panelNum })}
                    </p>
                    <p className='mt-0.5 truncate text-xs text-stone-500'>
                      {artwork?.fileName || t('splitStrip.empty')}
                    </p>
                  </div>
                  {artwork && (
                    <div className='flex items-center gap-1'>
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
                        <Eye className='h-3.5 w-3.5' aria-hidden='true' />
                      </button>
                      {canEdit && (
                        <>
                          <a
                            href={artwork.imageUrl}
                            download={artwork.fileName}
                            data-testid={`split-strip-download-${panelNum}`}
                            title={t('splitStrip.downloadTitle')}
                            aria-label={t('splitStrip.downloadAria', { panelNum })}
                            className={`${ACTION} text-stone-600 hover:bg-stone-200`}
                          >
                            <Download className='h-3.5 w-3.5' aria-hidden='true' />
                          </a>
                          <button
                            type='button'
                            onClick={() => onRemoveArtwork(panel.id, panelNum)}
                            data-testid={`split-strip-remove-${panelNum}`}
                            title={t('panelFrame.removeTitle')}
                            aria-label={t('panelFrame.removeAria', { panelNum })}
                            className={`${ACTION} text-rose-600 hover:bg-rose-50`}
                          >
                            <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {canSave && onSave && (
        <footer className='shrink-0 border-t border-stone-200 p-3'>
          <button
            type='button'
            onClick={onSave}
            disabled={isSaving}
            data-testid='split-drawer-save'
            className='focus-ring flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-orange-600 px-3 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70'
          >
            {isSaving ? (
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
            ) : (
              <Check className='h-4 w-4' aria-hidden='true' />
            )}
            {saveLabel || t('layoutToolbar.saveLayout')}
          </button>
        </footer>
      )}
    </aside>
  );
};

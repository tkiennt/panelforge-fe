import React from 'react';
import { useTranslation } from '@/lib/i18n';
import type { PanelDto } from '@/types/pipeline';
import type { PageChangeRequestMark } from '../../utils/changeRequestLocation';
import { parseBoundingBox } from '../../utils/panelBoundingBox';

interface ChangeRequestRegionOverlayProps {
  marks: PageChangeRequestMark[];
  panels: PanelDto[];
  pageWidth: number;
  pageHeight: number;
  focusedId?: string | null;
}

/** REV-01: vùng Editor khoanh (hoặc cả khung khi không có vùng) của các yêu cầu sửa còn mở trên trang đang xem. */
export const ChangeRequestRegionOverlay: React.FC<ChangeRequestRegionOverlayProps> = ({
  marks,
  panels,
  pageWidth,
  pageHeight,
  focusedId = null,
}) => {
  const { t } = useTranslation('artist');
  if (marks.length === 0) return null;

  return (
    <div
      data-testid='change-request-region-overlay'
      className='absolute inset-0 z-40 pointer-events-none'
    >
      {marks.map((mark, idx) => {
        const panel = mark.panelId ? panels.find((p) => p.id === mark.panelId) : undefined;
        const rect = mark.box
          ? { x: mark.box.x * 100, y: mark.box.y * 100, w: mark.box.w * 100, h: mark.box.h * 100 }
          : panel
            ? (() => {
                const b = parseBoundingBox(panel.boundingBox, pageWidth, pageHeight);
                return { x: b.percentX, y: b.percentY, w: b.percentW, h: b.percentH };
              })()
            : null;
        if (!rect) return null;
        const focused = focusedId === mark.id;
        return (
          <div
            key={mark.id}
            data-testid={`change-request-region-${mark.id}`}
            data-focused={focused ? 'true' : undefined}
            title={mark.description}
            className={`absolute rounded-sm border-2 border-dashed ${
              focused ? 'border-rose-600 bg-rose-500/15' : 'border-rose-500/80 bg-rose-500/5'
            } ${mark.onOlderVersion ? 'opacity-60' : ''}`}
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
            }}
          >
            <span
              className='absolute -top-2.5 -left-2.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shadow-2xs'
              aria-label={t('changeRegion.markAria', { num: idx + 1, text: mark.description })}
            >
              {idx + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
};

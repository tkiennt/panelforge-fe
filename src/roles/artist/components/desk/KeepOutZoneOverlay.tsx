import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { KeepOutZone, Rect } from '@/shared/lib/lettering/keepOutZones';

interface KeepOutZoneOverlayProps {
  zones: KeepOutZone[];
  pageWidth: number;
  pageHeight: number;
  isDrawingMode: boolean;
  readOnly?: boolean;
  onAddZone: (rectPx: Rect) => void;
  onDeleteZone: (zoneId: string) => void;
  onExitDrawingMode?: () => void;
}

const MIN_DRAW_PX = 20;

export const KeepOutZoneOverlay: React.FC<KeepOutZoneOverlayProps> = ({
  zones,
  pageWidth,
  pageHeight,
  isDrawingMode,
  readOnly = false,
  onAddZone,
  onDeleteZone,
  onExitDrawingMode,
}) => {
  const { t } = useTranslation('artist');
  const layerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [drawingRect, setDrawingRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!isDrawingMode) {
      startRef.current = null;
      setDrawingRect(null);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startRef.current = null;
        setDrawingRect(null);
        onExitDrawingMode?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawingMode, onExitDrawingMode]);

  const toPagePoint = (clientX: number, clientY: number) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(pageWidth, ((clientX - rect.left) / rect.width) * pageWidth));
    const y = Math.max(0, Math.min(pageHeight, ((clientY - rect.top) / rect.height) * pageHeight));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingMode || readOnly || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const start = toPagePoint(e.clientX, e.clientY);
    startRef.current = start;
    setDrawingRect({ x: start.x, y: start.y, width: 0, height: 0 });

    const onMove = (m: PointerEvent) => {
      if (!startRef.current) return;
      const cur = toPagePoint(m.clientX, m.clientY);
      const x1 = Math.min(startRef.current.x, cur.x);
      const y1 = Math.min(startRef.current.y, cur.y);
      const x2 = Math.max(startRef.current.x, cur.x);
      const y2 = Math.max(startRef.current.y, cur.y);
      setDrawingRect({
        x: Math.round(x1),
        y: Math.round(y1),
        width: Math.round(x2 - x1),
        height: Math.round(y2 - y1),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (startRef.current) {
        setDrawingRect((box) => {
          if (box && box.width >= MIN_DRAW_PX && box.height >= MIN_DRAW_PX) {
            onAddZone(box);
          }
          return null;
        });
      }
      startRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={layerRef}
      data-testid='canvas-keep-out-overlay'
      className='absolute inset-0 z-20 pointer-events-none'
    >
      {zones.map((kz) => (
        <div
          key={kz.id}
          data-testid={`keep-out-zone-${kz.id}`}
          className='absolute border-2 border-dashed border-red-500 bg-red-500/15 rounded flex flex-col justify-start p-1 select-none pointer-events-none'
          style={{
            left: `${(kz.x / pageWidth) * 100}%`,
            top: `${(kz.y / pageHeight) * 100}%`,
            width: `${(kz.width / pageWidth) * 100}%`,
            height: `${(kz.height / pageHeight) * 100}%`,
          }}
        >
          <div className='flex items-center justify-between text-[11px] font-bold text-red-700 bg-white/95 px-1.5 py-0.5 rounded shadow-xs max-w-full pointer-events-auto'>
            <span className='truncate flex items-center gap-1'>
              <ShieldAlert className='w-3 h-3 text-red-500 shrink-0' aria-hidden='true' />
              <span className='truncate'>{kz.label || t('keepOut.zoneFallbackLabel')}</span>
            </span>
            {!readOnly && (
              <button
                type='button'
                data-testid={`delete-keep-out-zone-${kz.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteZone(kz.id);
                }}
                aria-label={t('keepOut.deleteZoneAria', {
                  label: kz.label || t('keepOut.zoneFallbackLower'),
                })}
                title={t('keepOut.deleteZoneTitle')}
                className='ml-1 text-stone-400 hover:text-red-600 cursor-pointer'
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>
        </div>
      ))}

      {drawingRect && (
        <div
          data-testid='keep-out-draw-preview'
          className='absolute border-2 border-dashed border-red-600 bg-red-500/25 pointer-events-none z-35'
          style={{
            left: `${(drawingRect.x / pageWidth) * 100}%`,
            top: `${(drawingRect.y / pageHeight) * 100}%`,
            width: `${(drawingRect.width / pageWidth) * 100}%`,
            height: `${(drawingRect.height / pageHeight) * 100}%`,
          }}
        />
      )}

      {isDrawingMode && !readOnly && (
        <div
          data-testid='keep-out-draw-layer'
          onPointerDown={handlePointerDown}
          onClick={(e) => e.stopPropagation()}
          className='absolute inset-0 z-35 pointer-events-auto cursor-crosshair'
          title={t('keepOut.drawLayerTitle')}
        />
      )}
    </div>
  );
};

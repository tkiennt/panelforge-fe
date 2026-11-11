import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Box, CanvasRegion } from './artworkModel';

export type { Box, CanvasRegion } from './artworkModel';

const round = (n: number) => Math.round(n * 10000) / 10000;

// Một màu = một nghĩa (DESIGN_RULES 1.5): cam = nháp, đỏ = đang mở, hổ phách = chờ xác minh, ngọc = đã đạt.
const REGION_STYLE: Record<CanvasRegion['kind'], string> = {
  draft: 'border-dashed border-orange-500 bg-orange-500/10',
  Open: 'border-rose-500 bg-rose-500/10',
  Resolved: 'border-amber-500 bg-amber-500/10',
  Verified: 'border-emerald-500 bg-emerald-500/10',
  Rejected: 'border-stone-400 bg-stone-400/10',
};
const LABEL_STYLE: Record<CanvasRegion['kind'], string> = {
  draft: 'bg-orange-500',
  Open: 'bg-rose-600',
  Resolved: 'bg-amber-600',
  Verified: 'bg-emerald-600',
  Rejected: 'bg-stone-500',
};

const Frame: React.FC<{
  url: string | undefined;
  alt: string;
  zoom: number;
  caption: string;
  children?: React.ReactNode;
  wrapperRef?: React.Ref<HTMLDivElement>;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  drawable?: boolean;
  testId: string;
}> = ({ url, alt, zoom, caption, children, wrapperRef, onMouseDown, drawable, testId }) => (
  <figure className='flex min-w-0 flex-col items-center gap-2'>
    <figcaption className='text-xs font-semibold text-stone-600'>{caption}</figcaption>
    <div
      ref={wrapperRef}
      onMouseDown={onMouseDown}
      data-testid={testId}
      className={`relative inline-block select-none ${drawable ? 'cursor-crosshair' : ''}`}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          style={{ height: `calc((100vh - 13rem) * ${zoom})` }}
          className='w-auto max-w-none border border-stone-200 bg-white object-contain shadow-xs'
        />
      ) : (
        <div className='flex aspect-[2/3] h-[60vh] items-center justify-center border border-stone-200 bg-white'>
          <Loader2 className='h-4 w-4 animate-spin text-stone-500' aria-hidden='true' />
        </div>
      )}
      {children}
    </div>
  </figure>
);

/**
 * Khung xem bản nộp. Khoanh vùng chỉ trên bản đang duyệt; toạ độ chuẩn hoá 0–1 theo ảnh gốc,
 * không phụ thuộc mức phóng to (CF3: annotation gắn đúng phiên bản và vùng).
 */
export const ArtworkCanvas: React.FC<{
  currentUrl: string | undefined;
  currentCaption: string;
  previousUrl?: string;
  previousCaption?: string;
  zoom: number;
  canDraw: boolean;
  regions: CanvasRegion[];
  /** Vùng khoanh trên bản trước: khi xác minh cần thấy chỗ đã yêu cầu sửa trên bản cũ. */
  previousRegions?: CanvasRegion[];
  activeRegionId: string | null;
  onSelectRegion: (id: string) => void;
  onDrawn: (box: Box) => void;
  emptyText: string;
}> = ({
  currentUrl,
  currentCaption,
  previousUrl,
  previousCaption,
  zoom,
  canDraw,
  regions,
  previousRegions = [],
  activeRegionId,
  onSelectRegion,
  onDrawn,
  emptyText,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [drawing, setDrawingState] = useState<Box | null>(null);
  const drawingRef = useRef<Box | null>(null);
  const setDrawing = (box: Box | null) => {
    drawingRef.current = box;
    setDrawingState(box);
  };
  const onDrawnRef = useRef(onDrawn);
  useEffect(() => {
    onDrawnRef.current = onDrawn;
  }, [onDrawn]);

  const pointAt = (clientX: number, clientY: number) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / (rect.width || 1))),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / (rect.height || 1))),
    };
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!startRef.current || !wrapperRef.current) return;
      const p = pointAt(e.clientX, e.clientY);
      const s = startRef.current;
      setDrawing({
        x: Math.min(p.x, s.x),
        y: Math.min(p.y, s.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    };
    const up = () => {
      if (!startRef.current) return;
      startRef.current = null;
      const box = drawingRef.current;
      setDrawing(null);
      // Bấm mà không kéo thì bỏ qua: vùng dưới 1% cạnh ảnh không có ý nghĩa
      if (box && box.w >= 0.01 && box.h >= 0.01) {
        onDrawnRef.current({ x: round(box.x), y: round(box.y), w: round(box.w), h: round(box.h) });
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  if (!currentUrl && !currentCaption) {
    return <p className='p-8 text-center text-sm text-stone-500'>{emptyText}</p>;
  }

  const startDraw = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canDraw || e.button !== 0 || (e.target as HTMLElement).closest('[data-region]')) return;
    e.preventDefault();
    const p = pointAt(e.clientX, e.clientY);
    startRef.current = p;
    setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const pct = (b: Box) => ({
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  });

  const renderRegions = (list: CanvasRegion[]) =>
    list.map((r) => (
      <button
        key={r.id}
        type='button'
        data-region='true'
        onClick={() => onSelectRegion(r.id)}
        aria-label={r.label}
        className={`absolute border-2 ${REGION_STYLE[r.kind]} ${
          activeRegionId === r.id ? 'ring-4 ring-orange-400/50' : ''
        }`}
        style={pct(r.box)}
      >
        <span
          className={`absolute -left-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-xs font-bold text-white ${LABEL_STYLE[r.kind]}`}
        >
          {r.label}
        </span>
      </button>
    ));

  return (
    <div className='flex min-h-full items-start justify-center gap-6 p-6'>
      {previousCaption !== undefined && (
        <Frame
          url={previousUrl}
          alt={previousCaption}
          caption={previousCaption}
          zoom={zoom}
          testId='review-previous-image'
        >
          {renderRegions(previousRegions)}
        </Frame>
      )}
      <Frame
        testId='review-current-image'
        url={currentUrl}
        alt={currentCaption}
        caption={currentCaption}
        zoom={zoom}
        wrapperRef={wrapperRef}
        onMouseDown={startDraw}
        drawable={canDraw}
      >
        {renderRegions(regions)}
        {drawing && (
          <div
            className='pointer-events-none absolute border-2 border-orange-500 bg-orange-500/20'
            style={pct(drawing)}
          />
        )}
      </Frame>
    </div>
  );
};

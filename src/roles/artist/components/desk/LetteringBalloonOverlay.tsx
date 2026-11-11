import React from 'react';
import { Copy, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import type { ElementSnapshotDto } from '@/services/element.service';
import { createSpeechBalloonPath, createThoughtBalloonPath } from '@/shared/utils/balloonPaths';
import type { ResizeHandle } from '../../hooks/useLetteringBalloons';

const HANDLES: { id: ResizeHandle; position: string; cursor: string }[] = [
  { id: 'nw', position: '-top-2 -left-2', cursor: 'cursor-nwse-resize' },
  { id: 'ne', position: '-top-2 -right-2', cursor: 'cursor-nesw-resize' },
  { id: 'se', position: '-bottom-2 -right-2', cursor: 'cursor-nwse-resize' },
  { id: 'sw', position: '-bottom-2 -left-2', cursor: 'cursor-nesw-resize' },
];

const TOOL_BTN =
  'focus-ring w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer';

interface LetteringBalloonOverlayProps {
  elements: ElementSnapshotDto[];
  pageWidth: number;
  pageHeight: number;
  selectedId: string | null;
  activeGestureId: string | null;
  onSelect: (elementId: string) => void;
  onScale: (elementId: string, factor: number) => void;
  onCopy: (element: ElementSnapshotDto) => void;
  onDelete: (elementId: string) => void;
  onDragStart: (e: React.PointerEvent, elementId: string) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, elementId: string, handle: ResizeHandle) => void;
  onResizeMove: (e: React.PointerEvent) => void;
  onResizeEnd: (e: React.PointerEvent) => void;
}

const BalloonShape: React.FC<{ element: ElementSnapshotDto }> = ({ element: b }) => {
  if (b.elementType === 'NARRATION_BOX') {
    return (
      <div className='w-full h-full bg-amber-50/90 border-2 border-stone-800 rounded-xs p-2 flex items-center justify-center text-center'>
        <span className='text-xs font-sans font-medium text-stone-900 line-clamp-3 select-none'>
          {b.content}
        </span>
      </div>
    );
  }

  const path =
    b.elementType === 'THOUGHT_BALLOON'
      ? createThoughtBalloonPath(b.width, b.height)
      : createSpeechBalloonPath(b.width, b.height, b.width / 2, b.height + 30);

  return (
    <div className='relative w-full h-full flex items-center justify-center'>
      <svg
        viewBox={`0 0 ${b.width} ${b.height}`}
        className='absolute inset-0 w-full h-full overflow-visible pointer-events-none'
        aria-hidden='true'
      >
        <path d={path} fill='#ffffff' stroke='#1c1917' strokeWidth='2.5' />
      </svg>
      <div className='relative z-10 p-2 text-center'>
        <span className='text-xs font-comic font-medium text-stone-900 line-clamp-3 select-none'>
          {b.content}
        </span>
      </div>
    </div>
  );
};

export const LetteringBalloonOverlay: React.FC<LetteringBalloonOverlayProps> = ({
  elements,
  pageWidth,
  pageHeight,
  selectedId,
  activeGestureId,
  onSelect,
  onScale,
  onCopy,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}) => (
  <div data-testid='canvas-lettering-overlay' className='absolute inset-0 z-25 pointer-events-none'>
    {elements.map((b, idx) => {
      const isSelected = selectedId === b.elementId;
      const isActive = activeGestureId === b.elementId;

      return (
        <div
          key={b.elementId}
          data-testid={`lettering-element-${b.elementId}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(b.elementId);
          }}
          onPointerDown={(e) => onDragStart(e, b.elementId)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          className={`absolute pointer-events-auto cursor-move select-none touch-none ${
            isActive ? 'z-40 shadow-lg' : 'transition-shadow'
          } ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2 z-30' : 'z-20 hover:ring-1 hover:ring-orange-400'}`}
          style={{
            left: `${(b.x / pageWidth) * 100}%`,
            top: `${(b.y / pageHeight) * 100}%`,
            width: `${(b.width / pageWidth) * 100}%`,
            height: `${(b.height / pageHeight) * 100}%`,
          }}
        >
          {isSelected && (
            <div
              data-testid={`lettering-toolbar-${b.elementId}`}
              className='absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-stone-900 text-white px-1 py-0.5 rounded-lg shadow-lg border border-stone-700 select-none pointer-events-auto'
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type='button'
                onClick={() => onScale(b.elementId, 1.15)}
                className={`${TOOL_BTN} text-stone-200 hover:bg-stone-800 hover:text-white`}
                title='Phóng to (Phím +)'
                aria-label='Phóng to bóng thoại'
                data-testid={`btn-zoom-in-${b.elementId}`}
              >
                <ZoomIn className='w-4 h-4' aria-hidden='true' />
              </button>
              <button
                type='button'
                onClick={() => onScale(b.elementId, 0.85)}
                className={`${TOOL_BTN} text-stone-200 hover:bg-stone-800 hover:text-white`}
                title='Thu nhỏ (Phím -)'
                aria-label='Thu nhỏ bóng thoại'
                data-testid={`btn-zoom-out-${b.elementId}`}
              >
                <ZoomOut className='w-4 h-4' aria-hidden='true' />
              </button>
              <span className='w-px h-4 bg-stone-700' aria-hidden='true' />
              <button
                type='button'
                onClick={() => onCopy(b)}
                className={`${TOOL_BTN} text-stone-200 hover:bg-stone-800 hover:text-white`}
                title='Sao chép (Ctrl+C)'
                aria-label='Sao chép bóng thoại'
                data-testid={`btn-copy-${b.elementId}`}
              >
                <Copy className='w-4 h-4' aria-hidden='true' />
              </button>
              <button
                type='button'
                onClick={() => onDelete(b.elementId)}
                className={`${TOOL_BTN} text-rose-300 hover:bg-rose-500/30 hover:text-rose-200`}
                title='Xóa bóng (Del / Backspace)'
                aria-label='Xóa bóng thoại'
                data-testid={`btn-delete-${b.elementId}`}
              >
                <Trash2 className='w-4 h-4' aria-hidden='true' />
              </button>
            </div>
          )}

          {isSelected &&
            HANDLES.map((h) => (
              <div
                key={h.id}
                data-testid={`lettering-resize-${h.id}-${b.elementId}`}
                onPointerDown={(e) => onResizeStart(e, b.elementId, h.id)}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                className={`absolute ${h.position} ${h.cursor} w-4 h-4 bg-white border-2 border-orange-500 rounded-full z-40 pointer-events-auto touch-none`}
                title='Kéo để thay đổi kích thước'
              />
            ))}

          <BalloonShape element={b} />

          <span className='absolute -top-2 -left-2 z-20 min-w-5 h-5 px-1 rounded-full bg-stone-900 text-white font-mono text-xs font-bold flex items-center justify-center'>
            #{b.readingOrder ?? idx + 1}
          </span>
        </div>
      );
    })}
  </div>
);

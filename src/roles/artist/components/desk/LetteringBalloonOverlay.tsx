import React from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  MessageCircle,
  MoreVertical,
  ShieldAlert,
} from 'lucide-react';
import type { ElementSnapshotDto } from '@/services/element.service';
import { findKeepOutCollision, type KeepOutZone } from '@/shared/lib/lettering/keepOutZones';
import {
  resolveAppearance,
  appearanceFromStyle,
  tailFromStyle,
  balloonPath,
  fillRgba,
  defaultTail,
  layoutBalloonText,
  letteringCase,
  type TailPoint,
} from '@/shared/lib/lettering/balloonRender';
import { pageUnit, resolveTextStyle, textStyleCss } from '@/shared/lib/lettering/textStyle';
import type { ResizeHandle } from '../../hooks/useLetteringBalloons';

const HANDLES: { id: ResizeHandle; position: string; cursor: string }[] = [
  { id: 'nw', position: '-top-2 -left-2', cursor: 'cursor-nwse-resize' },
  { id: 'ne', position: '-top-2 -right-2', cursor: 'cursor-nesw-resize' },
  { id: 'se', position: '-bottom-2 -right-2', cursor: 'cursor-nwse-resize' },
  { id: 'sw', position: '-bottom-2 -left-2', cursor: 'cursor-nesw-resize' },
];

const MENU_ITEM =
  'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-100 cursor-pointer';

const hasNativePopoverTarget = () =>
  typeof HTMLButtonElement !== 'undefined' && 'popoverTargetElement' in HTMLButtonElement.prototype;

/** Nhãn "Thoại N" phía trên bóng đang chọn + nút ⋮ mở menu thao tác (phóng/thu, sao chép, xóa). */
const SelectedChrome: React.FC<{
  element: ElementSnapshotDto;
  label: string;
  /** Bóng sát mép trên / mép phải trang: lật nhãn xuống dưới, nút ⋮ sang trái để không bị cắt. */
  nearTop?: boolean;
  nearRight?: boolean;
  onScale: (id: string, factor: number) => void;
  onCopy: (el: ElementSnapshotDto) => void;
  onDelete: (id: string) => void;
}> = ({ element, label, nearTop, nearRight, onScale, onCopy, onDelete }) => {
  const { t } = useTranslation('artist');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const id = element.elementId;
  const popoverId = `lettering-toolbar-${id}`;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const r = trigger.getBoundingClientRect();
    const width = 160;
    const height = 150;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    let left = nearRight ? r.left - width : r.right - width;
    let top = r.bottom + 4;

    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    if (top + height > vh - 8) top = Math.max(8, r.top - height - 4);

    popover.style.position = 'fixed';
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.margin = '0';
  };

  const handleToggle = (e: React.SyntheticEvent) => {
    const nativeEvent = e.nativeEvent as any;
    const nextOpen =
      nativeEvent?.newState !== undefined
        ? nativeEvent.newState === 'open'
        : Boolean(
            popoverRef.current?.matches?.(':popover-open') ||
            popoverRef.current?.classList.contains(':popover-open'),
          );
    setIsExpanded(nextOpen);
    if (nextOpen) {
      updatePosition();
    }
  };

  const closeMenu = () => {
    try {
      popoverRef.current?.hidePopover?.();
    } catch {
      // ignore
    }
    setIsExpanded(false);
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <>
      <span
        data-testid={`lettering-label-${id}`}
        className={`absolute ${nearTop ? '-bottom-8' : '-top-8'} left-0 z-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-semibold shadow-sm whitespace-nowrap pointer-events-none`}
      >
        <MessageCircle className='w-3 h-3' aria-hidden='true' />
        {label}
      </span>
      <div
        className={`absolute -top-1 ${nearRight ? '-left-10' : '-right-10'} z-50 pointer-events-auto`}
        onClick={stop}
        onPointerDown={stop}
      >
        <button
          ref={triggerRef}
          type='button'
          data-testid={`lettering-menu-${id}`}
          aria-label={t('balloonOverlay.actionsAria')}
          aria-expanded={isExpanded}
          aria-controls={popoverId}
          popoverTarget={popoverId}
          onClick={(e) => {
            stop(e);
            if (!hasNativePopoverTarget()) {
              const pop = popoverRef.current;
              if (!pop) return;
              if (pop.classList.contains(':popover-open')) {
                pop.hidePopover?.();
                setIsExpanded(false);
              } else {
                updatePosition();
                pop.showPopover?.();
                setIsExpanded(true);
              }
            }
          }}
          className='w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 shadow-sm text-stone-600 hover:text-stone-900 cursor-pointer'
        >
          <MoreVertical className='w-4 h-4' aria-hidden='true' />
        </button>
        <div
          ref={popoverRef}
          id={popoverId}
          popover='auto'
          data-testid={`lettering-toolbar-${id}`}
          onToggle={handleToggle}
          className={`w-40 py-1 rounded-lg bg-white border border-stone-200 shadow-lg ${
            !isExpanded && !hasNativePopoverTarget() ? 'hidden' : ''
          }`}
        >
          <button
            type='button'
            data-testid={`btn-zoom-in-${id}`}
            className={MENU_ITEM}
            onClick={() => onScale(id, 1.15)}
          >
            <ZoomIn className='w-3.5 h-3.5' aria-hidden='true' /> {t('balloonOverlay.zoomIn')}
          </button>
          <button
            type='button'
            data-testid={`btn-zoom-out-${id}`}
            className={MENU_ITEM}
            onClick={() => onScale(id, 0.85)}
          >
            <ZoomOut className='w-3.5 h-3.5' aria-hidden='true' /> {t('balloonOverlay.zoomOut')}
          </button>
          <button
            type='button'
            data-testid={`btn-copy-${id}`}
            className={MENU_ITEM}
            onClick={() => {
              onCopy(element);
              closeMenu();
            }}
          >
            <Copy className='w-3.5 h-3.5' aria-hidden='true' /> {t('balloonOverlay.copy')}
          </button>
          <button
            type='button'
            data-testid={`btn-delete-${id}`}
            className={`${MENU_ITEM} text-rose-600 hover:bg-rose-50`}
            onClick={() => {
              onDelete(id);
              closeMenu();
            }}
          >
            <Trash2 className='w-3.5 h-3.5' aria-hidden='true' /> {t('balloonOverlay.delete')}
          </button>
        </div>
      </div>
    </>
  );
};

interface LetteringBalloonOverlayProps {
  elements: ElementSnapshotDto[];
  pageWidth: number;
  pageHeight: number;
  activeLang?: string;
  selectedId: string | null;
  activeGestureId: string | null;
  readOnly?: boolean;
  showOrder?: boolean;
  keepOutZones?: KeepOutZone[];
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
  /** Thả đầu đuôi bóng (toạ độ nội bộ của bóng, px trang). Không truyền thì không có tay nắm đuôi. */
  onTailChange?: (elementId: string, tail: TailPoint) => void;
}

/** Vẽ lại khi font web tải xong: ngắt dòng đo bằng canvas, đo trước khi có font sẽ lệch. */
function useFontsVersion(): number {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) return;
    let alive = true;
    const bump = () => alive && setVersion((v) => v + 1);
    void fonts.ready.then(bump);
    fonts.addEventListener?.('loadingdone', bump);
    return () => {
      alive = false;
      fonts.removeEventListener?.('loadingdone', bump);
    };
  }, []);
  return version;
}

const BalloonShape: React.FC<{
  element: ElementSnapshotDto;
  activeLang?: string;
  pageWidth: number;
  /** Đuôi đang kéo (chưa lưu) — ưu tiên hơn đuôi đã lưu. */
  tailOverride?: TailPoint | null;
}> = ({ element: b, activeLang, pageWidth, tailOverride }) => {
  const textStyle = resolveTextStyle(b);
  const appearance = resolveAppearance(b.elementType, appearanceFromStyle(b.style));
  const tail = tailOverride ?? tailFromStyle(b.style) ?? defaultTail(b.width, b.height);
  const path = balloonPath(appearance.shape, b.width, b.height, tail);
  const fill = fillRgba(appearance);
  const rawText = activeLang && b.texts?.[activeLang] ? b.texts[activeLang] : (b.content ?? '');
  // Cùng bố cục với bản xuất: ngắt dòng hình thoi, câu tràn tự thu nhỏ, bản EN in hoa
  const layout = layoutBalloonText(
    letteringCase(rawText, activeLang),
    textStyle,
    appearance.shape,
    b.width,
    b.height,
  );
  const { area } = layout;
  const align = textStyle.align ?? 'center';

  return (
    <div className='relative w-full h-full overflow-visible'>
      {path && appearance.shape !== 'none' && (
        <svg
          viewBox={`0 0 ${b.width} ${b.height}`}
          className='absolute inset-0 w-full h-full overflow-visible pointer-events-none'
          aria-hidden='true'
        >
          <path
            d={path}
            fill={fill}
            stroke={appearance.borderColor}
            strokeWidth={appearance.borderWidth}
          />
        </svg>
      )}
      <div
        className='absolute flex flex-col justify-center pointer-events-none'
        style={{
          left: `${(area.x / b.width) * 100}%`,
          top: `${(area.y / b.height) * 100}%`,
          width: `${(area.w / b.width) * 100}%`,
          height: `${(area.h / b.height) * 100}%`,
          alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        }}
      >
        <span
          data-testid={`lettering-text-${b.elementId}`}
          data-font-size={layout.fontSize}
          className='select-none whitespace-pre text-stone-900'
          style={{
            ...textStyleCss(textStyle),
            color: textStyle.color || '#1c1917',
            // fontSize/strokeWidth lưu theo px của trang → quy đổi theo bề rộng trang đang hiển thị
            fontSize: pageUnit(layout.fontSize, pageWidth),
            lineHeight: pageUnit(layout.lineHeightPx, pageWidth),
            WebkitTextStroke:
              textStyle.strokeColor && textStyle.strokeWidth
                ? `${pageUnit(textStyle.strokeWidth, pageWidth)} ${textStyle.strokeColor}`
                : undefined,
          }}
        >
          {layout.lines.join('\n')}
        </span>
      </div>
    </div>
  );
};

/** Tay nắm đầu đuôi bóng oval: kéo để chỉ về người nói, thả mới lưu. */
const TailHandle: React.FC<{
  element: ElementSnapshotDto;
  tail: TailPoint;
  title: string;
  onMove: (tail: TailPoint) => void;
  onCommit: (tail: TailPoint) => void;
}> = ({ element: b, tail, title, onMove, onCommit }) => {
  const dragRef = React.useRef<{ box: DOMRect; last: TailPoint } | null>(null);
  const toLocal = (e: React.PointerEvent, box: DOMRect): TailPoint => ({
    x: Math.round(((e.clientX - box.left) / box.width) * b.width),
    y: Math.round(((e.clientY - box.top) / box.height) * b.height),
  });
  return (
    <div
      data-testid={`lettering-tail-${b.elementId}`}
      role='slider'
      aria-label={title}
      aria-valuetext={`${tail.x}, ${tail.y}`}
      title={title}
      className='absolute z-40 w-4 h-4 -ml-2 -mt-2 rounded-full bg-orange-500 border-2 border-white shadow cursor-crosshair pointer-events-auto touch-none'
      style={{ left: `${(tail.x / b.width) * 100}%`, top: `${(tail.y / b.height) * 100}%` }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        dragRef.current = { box, last: tail };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        e.stopPropagation();
        drag.last = toLocal(e, drag.box);
        onMove(drag.last);
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        e.stopPropagation();
        dragRef.current = null;
        onCommit(drag.last);
      }}
    />
  );
};

export const LetteringBalloonOverlay: React.FC<LetteringBalloonOverlayProps> = ({
  elements,
  pageWidth,
  pageHeight,
  activeLang,
  selectedId,
  activeGestureId,
  readOnly = false,
  showOrder = false,
  keepOutZones = [],
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
  onTailChange,
}) => {
  const { t } = useTranslation('artist');
  useFontsVersion();
  const [tailDraft, setTailDraft] = React.useState<{ id: string; tail: TailPoint } | null>(null);
  const pointerGestureRef = React.useRef<{
    elementId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  return (
    <div
      data-testid='canvas-lettering-overlay'
      className='absolute inset-0 z-25 pointer-events-none'
      style={{ containerType: 'inline-size' }}
    >
      {elements.map((b, idx) => {
        const isSelected = selectedId === b.elementId;
        const isActive = activeGestureId === b.elementId;
        const keepOutCollision =
          keepOutZones.length > 0
            ? findKeepOutCollision(
                { x: b.x, y: b.y, width: b.width, height: b.height },
                keepOutZones,
              )
            : null;

        return (
          <div
            key={b.elementId}
            data-testid={`lettering-element-${b.elementId}`}
            onClick={(e) => {
              e.stopPropagation();
              const gesture = pointerGestureRef.current;
              pointerGestureRef.current = null;
              if (gesture?.elementId === b.elementId && gesture.moved) return;
              onSelect(b.elementId);
            }}
            onPointerDown={(e) => {
              if (readOnly) return;
              pointerGestureRef.current = {
                elementId: b.elementId,
                startX: e.clientX,
                startY: e.clientY,
                moved: false,
              };
              onDragStart(e, b.elementId);
            }}
            onPointerMove={
              !readOnly
                ? (e) => {
                    const gesture = pointerGestureRef.current;
                    if (
                      gesture?.elementId === b.elementId &&
                      Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 4
                    ) {
                      gesture.moved = true;
                    }
                    onDragMove(e);
                  }
                : undefined
            }
            onPointerUp={!readOnly ? onDragEnd : undefined}
            className={`absolute pointer-events-auto ${readOnly ? 'cursor-default' : 'cursor-move'} select-none touch-none ${
              isActive ? 'z-40 shadow-lg' : 'transition-shadow'
            } ${
              keepOutCollision
                ? 'ring-2 ring-red-500 z-30'
                : isSelected
                  ? 'ring-2 ring-orange-500 z-30'
                  : 'z-20 hover:ring-1 hover:ring-orange-400'
            }`}
            style={{
              left: `${(b.x / pageWidth) * 100}%`,
              top: `${(b.y / pageHeight) * 100}%`,
              width: `${(b.width / pageWidth) * 100}%`,
              height: `${(b.height / pageHeight) * 100}%`,
            }}
          >
            {isSelected && !readOnly && (
              <SelectedChrome
                element={b}
                label={t('balloonOverlay.labelPrefix', { order: b.readingOrder ?? idx + 1 })}
                nearTop={b.y / pageHeight < 0.07}
                nearRight={(b.x + b.width) / pageWidth > 0.9}
                onScale={onScale}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            )}

            {isSelected &&
              !readOnly &&
              HANDLES.map((h) => (
                <div
                  key={h.id}
                  data-testid={`lettering-resize-${h.id}-${b.elementId}`}
                  onPointerDown={(e) => onResizeStart(e, b.elementId, h.id)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeEnd}
                  className={`absolute ${h.position} ${h.cursor} w-4 h-4 bg-white border-2 border-orange-500 rounded-full z-40 pointer-events-auto touch-none`}
                  title={t('balloonOverlay.resizeTitle')}
                />
              ))}

            <BalloonShape
              element={b}
              activeLang={activeLang}
              pageWidth={pageWidth}
              tailOverride={tailDraft?.id === b.elementId ? tailDraft.tail : null}
            />

            {isSelected &&
              !readOnly &&
              onTailChange &&
              resolveAppearance(b.elementType, appearanceFromStyle(b.style)).shape === 'oval' && (
                <TailHandle
                  element={b}
                  tail={
                    (tailDraft?.id === b.elementId ? tailDraft.tail : null) ??
                    tailFromStyle(b.style) ??
                    defaultTail(b.width, b.height)
                  }
                  title={t('balloonOverlay.tailTitle')}
                  onMove={(tail) => setTailDraft({ id: b.elementId, tail })}
                  onCommit={(tail) => {
                    setTailDraft(null);
                    onTailChange(b.elementId, tail);
                  }}
                />
              )}

            {!isSelected && showOrder && (
              <span className='absolute -top-2 -left-2 z-20 min-w-5 h-5 px-1 rounded-full bg-stone-900 text-white font-mono text-xs font-bold flex items-center justify-center'>
                #{b.readingOrder ?? idx + 1}
              </span>
            )}

            {keepOutCollision && (
              <span
                data-testid={`keepout-collision-badge-${b.elementId}`}
                className='absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded bg-red-600 text-white text-xs font-bold flex items-center gap-0.5 shadow-sm whitespace-nowrap pointer-events-none'
                title={t('balloonOverlay.keepOutTitle', {
                  label: keepOutCollision.label || t('balloonOverlay.keepOutDefaultLabel'),
                })}
              >
                <ShieldAlert className='w-3 h-3' aria-hidden='true' />{' '}
                {t('balloonOverlay.keepOutBadge')}
              </span>
            )}

            {b.isStale && (
              <span
                data-testid={`text-stale-badge-${b.elementId}`}
                className='absolute -top-3 right-2 z-30 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 shadow-sm'
                title={t('balloonOverlay.staleTitle')}
              >
                <AlertTriangle className='h-3 w-3' /> {t('balloonOverlay.staleBadge')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

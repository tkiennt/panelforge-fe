/* Lucian UX/UI Prompt #122 · Layer stacking order · (c) 2026 Seokwoo Lee · MIT License */
import React, { useMemo } from 'react';
import {
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Trash2,
  User,
  Mountain,
  Package,
  Zap,
  Palette,
  Layers,
} from 'lucide-react';
import type { ElementSnapshotDto } from '@/services/element.service';
import type { BibleEntryDto } from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import './lucian-122.css';

export interface LayerStackingOrderProps {
  elements: ElementSnapshotDto[];
  selectedElementId?: string | null;
  onSelectElement: (id: string) => void;
  onChangeZIndex: (elem: ElementSnapshotDto, delta: number) => void;
  onRotateLayer?: (elem: ElementSnapshotDto, deltaDeg: number) => void;
  onDeleteLayer?: (elem: ElementSnapshotDto) => void;
  onBringToFront?: (elem: ElementSnapshotDto) => void;
  onSendToBack?: (elem: ElementSnapshotDto) => void;
  bibleEntries?: BibleEntryDto[];
  panels?: Array<{ id: string; panelNumber?: number }>;
  className?: string;
}

const LAYER_COLORS: Record<string, string> = {
  CHARACTER_INSTANCE: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  BACKGROUND: 'linear-gradient(135deg, #10B981, #047857)',
  PROP: 'linear-gradient(135deg, #F59E0B, #B45309)',
  EFFECT: 'linear-gradient(135deg, #EF4444, #B91C1C)',
  ARTWORK_LAYER: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
};

const LAYER_TYPE_LABELS: Record<string, string> = {
  CHARACTER_INSTANCE: 'Nhân vật',
  BACKGROUND: 'Bối cảnh',
  PROP: 'Đạo cụ',
  EFFECT: 'Hiệu ứng',
  ARTWORK_LAYER: 'Lớp tranh',
};

export const LayerStackingOrder: React.FC<LayerStackingOrderProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onChangeZIndex,
  onRotateLayer,
  onDeleteLayer,
  onBringToFront,
  onSendToBack,
  bibleEntries = [],
  panels = [],
  className = '',
}) => {
  // Sắp xếp layer theo zIndex tăng dần (ở dưới cùng đến trên cùng)
  const sortedLayers = useMemo(() => {
    return [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [elements]);

  // Layer cao nhất và thấp nhất
  const maxZ = sortedLayers.length > 0 ? sortedLayers[sortedLayers.length - 1].zIndex || 1 : 1;
  const minZ = sortedLayers.length > 0 ? sortedLayers[0].zIndex || 1 : 1;

  const handleBringToFront = (elem: ElementSnapshotDto) => {
    if (onBringToFront) {
      onBringToFront(elem);
    } else {
      // Tăng lên trên cùng: maxZ + 1 - elem.zIndex
      const delta = maxZ + 1 - (elem.zIndex || 0);
      onChangeZIndex(elem, Math.max(1, delta));
    }
  };

  const handleSendToBack = (elem: ElementSnapshotDto) => {
    if (onSendToBack) {
      onSendToBack(elem);
    } else {
      // Hạ xuống đáy cùng
      const delta = minZ - 1 - (elem.zIndex || 0);
      onChangeZIndex(elem, delta);
    }
  };

  const getBibleEntry = (elem: ElementSnapshotDto) => {
    return bibleEntries.find((b) => b.id === elem.bibleEntryId);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'CHARACTER_INSTANCE':
        return <User className='w-3.5 h-3.5' />;
      case 'BACKGROUND':
        return <Mountain className='w-3.5 h-3.5' />;
      case 'PROP':
        return <Package className='w-3.5 h-3.5' />;
      case 'EFFECT':
        return <Zap className='w-3.5 h-3.5' />;
      case 'ARTWORK_LAYER':
      default:
        return <Palette className='w-3.5 h-3.5' />;
    }
  };

  // Lấy tối đa 5 layer tiêu biểu để hiển thị trong 3D visual stack
  const previewLayers = useMemo(() => {
    if (sortedLayers.length <= 5) return sortedLayers;
    // Lấy 5 layer gần với layer đang chọn nhất hoặc top 5
    return sortedLayers.slice(-5);
  }, [sortedLayers]);

  return (
    <div
      className={`pf-layer-stacking ${className}`}
      data-testid='layer-stacking-order-root'
      aria-label='Quản lý thứ tự lớp layer (#122)'
    >
      {/* 1. Visual Stack Stage: Trực quan hoá thứ tự xếp chồng theo phong cách Lucian #122 */}
      {previewLayers.length > 0 && (
        <div
          className='pf-layer-stack-stage'
          data-testid='layer-stack-preview-stage'
          aria-label='Khung xem trước thứ tự xếp lớp 3D'
        >
          {previewLayers.map((el, index) => {
            const isSelected = el.elementId === selectedElementId;
            const bible = getBibleEntry(el);
            const title = bible ? bible.name : LAYER_TYPE_LABELS[el.elementType] || el.elementType;
            const bg = LAYER_COLORS[el.elementType] || 'linear-gradient(135deg, #78716C, #44403C)';

            // Tính toán vị trí so le (staggered stack)
            const count = previewLayers.length;
            const offset = (index - (count - 1) / 2) * 22;
            const yOffset = (index - (count - 1) / 2) * 16;

            return (
              <button
                key={el.elementId}
                type='button'
                className='pf-layer-chip'
                data-testid={`preview-chip-${el.elementId}`}
                style={{
                  background: bg,
                  transform: `translate(${offset}px, ${yOffset}px)`,
                  zIndex: index + 1,
                }}
                aria-pressed={isSelected}
                aria-label={`Layer ${title}, Z-Index: ${el.zIndex}. Bấm để chọn và đưa lên đầu.`}
                onClick={() => {
                  onSelectElement(el.elementId);
                  handleBringToFront(el);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    handleBringToFront(el);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleSendToBack(el);
                  }
                }}
              >
                <div className='pf-layer-chip-title'>
                  {renderIcon(el.elementType)}
                  <span className='truncate'>Lớp: {title}</span>
                </div>
                <span className='pf-layer-chip-z'>z:{el.zIndex ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Danh sách chi tiết các Layer & Bộ nút điều khiển thứ tự nhanh */}
      <div className='pf-layer-list custom-scrollbar' data-testid='layer-stack-list'>
        {/* Render theo thứ tự từ trên xuống dưới (z cao nhất ở trên) */}
        {[...sortedLayers].reverse().map((el) => {
          const isSelected = el.elementId === selectedElementId;
          const bible = getBibleEntry(el);
          const title = bible ? bible.name : LAYER_TYPE_LABELS[el.elementType] || el.elementType;
          const panel = panels.find((p) => p.id === el.panelId);

          return (
            <div
              key={el.elementId}
              className={`pf-layer-item ${isSelected ? 'is-selected' : ''}`}
              data-testid={`layer-item-${el.elementId}`}
              onClick={() => onSelectElement(el.elementId)}
            >
              <div className='flex items-center gap-2 min-w-0 flex-1'>
                {/* Thumbnail / Icon */}
                <div className='w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 text-stone-500 overflow-hidden'>
                  {bible?.referenceImageUrl ? (
                    <AuthenticatedImage
                      src={bible.referenceImageUrl}
                      alt={bible.name}
                      className='w-full h-full rounded object-cover'
                    />
                  ) : (
                    renderIcon(el.elementType)
                  )}
                </div>

                {/* Tiêu đề & metadata */}
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-xs text-stone-900 truncate'>{title}</p>
                  <div className='flex items-center gap-1.5 text-xs text-stone-500'>
                    <span className='font-mono font-bold text-[#F97316]'>z:{el.zIndex}</span>
                    {el.rotation ? <span className='font-mono'>• {el.rotation}°</span> : null}
                    {panel ? (
                      <span className='bg-orange-50 text-[#C2410C] font-medium px-1 rounded'>
                        Khung #{panel.panelNumber}
                      </span>
                    ) : (
                      <span className='text-stone-400'>Toàn trang</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div
                className='pf-layer-actions'
                onClick={(e) => e.stopPropagation()}
                data-testid={`layer-actions-${el.elementId}`}
              >
                {/* Lên trên cùng */}
                <button
                  type='button'
                  className='pf-layer-action-btn'
                  data-testid={`bring-to-front-${el.elementId}`}
                  title='Đưa lên trên cùng (#122)'
                  onClick={() => handleBringToFront(el)}
                >
                  <ChevronsUp className='w-3.5 h-3.5 text-[#F97316]' />
                </button>

                {/* Lên 1 lớp */}
                <button
                  type='button'
                  className='pf-layer-action-btn'
                  data-testid={`layer-up-${el.elementId}`}
                  title='Lên 1 lớp'
                  onClick={() => onChangeZIndex(el, 1)}
                >
                  <ArrowUp className='w-3.5 h-3.5' />
                </button>

                {/* Xuống 1 lớp */}
                <button
                  type='button'
                  className='pf-layer-action-btn'
                  data-testid={`layer-down-${el.elementId}`}
                  title='Xuống 1 lớp'
                  onClick={() => onChangeZIndex(el, -1)}
                >
                  <ArrowDown className='w-3.5 h-3.5' />
                </button>

                {/* Xuống dưới cùng */}
                <button
                  type='button'
                  className='pf-layer-action-btn'
                  data-testid={`send-to-back-${el.elementId}`}
                  title='Hạ xuống đáy cùng (#122)'
                  onClick={() => handleSendToBack(el)}
                >
                  <ChevronsDown className='w-3.5 h-3.5 text-stone-600' />
                </button>

                {/* Xoay */}
                {onRotateLayer && (
                  <button
                    type='button'
                    className='pf-layer-action-btn'
                    data-testid={`rotate-layer-${el.elementId}`}
                    title='Xoay +15°'
                    onClick={() => onRotateLayer(el, 15)}
                  >
                    <RotateCw className='w-3 h-3' />
                  </button>
                )}

                {/* Xóa */}
                {onDeleteLayer && (
                  <button
                    type='button'
                    className='pf-layer-action-btn delete'
                    data-testid={`delete-layer-${el.elementId}`}
                    title='Xoá layer'
                    onClick={() => onDeleteLayer(el)}
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <output className='sr-only' aria-live='polite' data-testid='layer-stacking-live-output'>
        Front{' '}
        {sortedLayers
          .map((l) => l.elementId)
          .reverse()
          .join(' · ')}{' '}
        Back
      </output>
    </div>
  );
};

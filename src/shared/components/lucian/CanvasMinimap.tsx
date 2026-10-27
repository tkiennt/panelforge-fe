/* Lucian UX/UI Prompt #104 · Canvas minimap · (c) 2026 Seokwoo Lee · MIT License */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Eye, EyeOff, Maximize2 } from 'lucide-react';
import '@/styles/modules/lucian/lucian-104.css';

export interface MinimapPanelItem {
  id: string;
  panelNumber?: number;
  percentX?: number;
  percentY?: number;
  percentW?: number;
  percentH?: number;
  boundingBox?: string;
  orderIndex?: number;
}

export interface CanvasMinimapProps {
  panels: MinimapPanelItem[];
  selectedPanelId?: string | null;
  onSelectPanel?: (panelId: string) => void;
  liveRects?: Record<string, { x: number; y: number; w: number; h: number }>;
  className?: string;
  pageNumber?: number;
  defaultCollapsed?: boolean;
}

function parseBox(panel: MinimapPanelItem): { x: number; y: number; w: number; h: number } {
  if (
    typeof panel.percentX === 'number' &&
    typeof panel.percentY === 'number' &&
    typeof panel.percentW === 'number' &&
    typeof panel.percentH === 'number'
  ) {
    return {
      x: panel.percentX,
      y: panel.percentY,
      w: panel.percentW,
      h: panel.percentH,
    };
  }
  if (panel.boundingBox) {
    try {
      const parsed = JSON.parse(panel.boundingBox);
      return {
        x: parsed.percentX ?? parsed.x ?? 0,
        y: parsed.percentY ?? parsed.y ?? 0,
        w: parsed.percentW ?? parsed.w ?? 100,
        h: parsed.percentH ?? parsed.h ?? 100,
      };
    } catch {
      // fallback
    }
  }
  return { x: 5, y: 5, w: 90, h: 90 };
}

export const CanvasMinimap: React.FC<CanvasMinimapProps> = ({
  panels,
  selectedPanelId,
  onSelectPanel,
  liveRects = {},
  className = '',
  pageNumber,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLButtonElement | null>(null);

  // Tìm panel đang chọn để hiển thị viewport indicator
  const selectedPanel = panels.find((p) => p.id === selectedPanelId);
  const selectedRect = selectedPanel
    ? (liveRects[selectedPanel.id] ?? parseBox(selectedPanel))
    : null;

  // Viewport rect (mặc định lấy theo panel đang chọn hoặc cả trang)
  const viewportX = activeCoords?.x ?? selectedRect?.x ?? 0;
  const viewportY = activeCoords?.y ?? selectedRect?.y ?? 0;
  const viewportW = selectedRect?.w ?? 100;
  const viewportH = selectedRect?.h ?? 100;

  const handlePointerAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickXPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const clickYPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      setActiveCoords({ x: clickXPercent, y: clickYPercent });

      // Tìm panel nào bao phủ toạ độ này hoặc gần nhất
      const matched = panels.find((p) => {
        const b = liveRects[p.id] ?? parseBox(p);
        return (
          clickXPercent >= b.x &&
          clickXPercent <= b.x + b.w &&
          clickYPercent >= b.y &&
          clickYPercent <= b.y + b.h
        );
      });

      if (matched && onSelectPanel) {
        onSelectPanel(matched.id);
      }
    },
    [panels, liveRects, onSelectPanel],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      handlePointerAtPoint(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setActiveCoords(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!panels.length || !onSelectPanel) return;

    const currentIndex = panels.findIndex((p) => p.id === selectedPanelId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < panels.length - 1 ? currentIndex + 1 : 0;
      onSelectPanel(panels[nextIndex].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : panels.length - 1;
      onSelectPanel(panels[prevIndex].id);
    } else if (e.key === 'Escape' || e.key === 'Home') {
      e.preventDefault();
      if (panels.length > 0) {
        onSelectPanel(panels[0].id);
      }
    }
  };

  if (collapsed) {
    return (
      <div className={`pf-minimap-container ${className}`} data-testid='canvas-minimap-collapsed'>
        <button
          type='button'
          onClick={() => setCollapsed(false)}
          className='px-2.5 py-1.5 bg-[#1C1917]/90 hover:bg-[#1C1917] text-[#FCFBF8] text-xs font-semibold rounded-xl shadow-soft-sm flex items-center gap-1.5 border border-[#D8D2C5]/30 cursor-pointer transition-all active:scale-95'
          title='Mở Minimap trang truyện (#104)'
          data-testid='open-minimap-btn'
        >
          <MapPin className='w-3.5 h-3.5 text-[#F97316]' />
          <span>Minimap</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`pf-minimap-container ${className}`}
      data-testid='canvas-minimap-root'
      aria-label='Bản đồ thu nhỏ trang tranh'
    >
      <div className='flex items-center gap-1.5'>
        <span className='pf-minimap-label' data-testid='minimap-label'>
          <MapPin className='w-3 h-3 text-[#F97316]' />
          {pageNumber ? `Trang ${pageNumber}` : 'Bản đồ Canvas'} · {panels.length} khung
        </span>
        <button
          type='button'
          onClick={() => setCollapsed(true)}
          className='p-1 rounded-md bg-[#1C1917]/80 hover:bg-[#1C1917] text-[#FCFBF8] transition-colors cursor-pointer'
          title='Thu nhỏ minimap'
          data-testid='collapse-minimap-btn'
        >
          <EyeOff className='w-3 h-3' />
        </button>
      </div>

      <button
        ref={containerRef}
        type='button'
        className='pf-minimap-btn'
        aria-label='Minimap định vị khung tranh, bấm hoặc dùng phím mũi tên để chọn khung'
        data-testid='minimap-canvas-btn'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <svg
          viewBox='0 0 100 141.4'
          preserveAspectRatio='none'
          className='pf-minimap-svg'
          aria-hidden='true'
        >
          {/* Nền trang truyện giấy vẽ */}
          <rect width='100' height='141.4' fill='#FCFBF8' />
          {/* Lề an toàn mờ */}
          <rect
            x='3'
            y='3'
            width='94'
            height='135.4'
            fill='none'
            stroke='#E7E5E4'
            strokeWidth='0.6'
            strokeDasharray='1.5 1.5'
          />

          {/* Các khung tranh */}
          {panels.map((p) => {
            const b = liveRects[p.id] ?? parseBox(p);
            const isSel = p.id === selectedPanelId;
            // Ánh xạ % chiều cao của trang (100% -> 141.4 trong viewBox)
            const sy = (b.y / 100) * 141.4;
            const sh = (b.h / 100) * 141.4;

            return (
              <g key={p.id}>
                <rect
                  x={b.x}
                  y={sy}
                  width={b.w}
                  height={sh}
                  fill={isSel ? 'rgba(249, 115, 22, 0.25)' : '#F5F5F4'}
                  stroke={isSel ? '#F97316' : '#78716C'}
                  strokeWidth={isSel ? '1.5' : '0.8'}
                  rx='1'
                />
                <text
                  x={b.x + b.w / 2}
                  y={sy + sh / 2 + 1.5}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  fill={isSel ? '#EA580C' : '#57534E'}
                  fontSize='4'
                  fontWeight='bold'
                  fontFamily='sans-serif'
                >
                  #{p.panelNumber ?? '?'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Khung định vị Viewport (#104) */}
        {selectedRect && (
          <span
            className='pf-minimap-viewport'
            data-testid='minimap-viewport-indicator'
            style={{
              left: `${viewportX}%`,
              top: `${(viewportY / 100) * 100}%`,
              width: `${Math.max(12, viewportW)}%`,
              height: `${Math.max(10, viewportH)}%`,
            }}
          />
        )}
      </button>

      <output className='sr-only' aria-live='polite' data-testid='minimap-live-output'>
        {selectedPanel
          ? `Đang chọn khung #${selectedPanel.panelNumber || selectedPanel.id}`
          : 'Chưa chọn khung nào'}
      </output>
    </div>
  );
};

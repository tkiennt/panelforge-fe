import React, { useRef, useState } from 'react';
import { PanelItem, BibleOverlay } from '../../data/mockLayoutData';
import { CanvasPanelItem } from './CanvasPanelItem';
import { User, MapPin, Box, Paintbrush } from 'lucide-react';

interface CanvasEditorProps {
  panels: PanelItem[];
  setPanels: React.Dispatch<React.SetStateAction<PanelItem[]>>;
  overlays: BibleOverlay[];
  setOverlays: React.Dispatch<React.SetStateAction<BibleOverlay[]>>;
  selectedPanelId: string | null;
  setSelectedPanelId: (id: string | null) => void;
  showOverlays: boolean;
  toolMode: 'select' | 'draw';
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  panels,
  setPanels,
  overlays,
  setOverlays,
  selectedPanelId,
  setSelectedPanelId,
  showOverlays,
  toolMode,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Dragging state (moving a panel)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });

  const getPercentagePos = (e: React.MouseEvent | React.DragEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    // If clicking on the canvas directly (not on a panel)
    if (e.target === canvasRef.current) {
      setSelectedPanelId(null);
      if (toolMode === 'draw') {
        const pos = getPercentagePos(e);
        setStartPos(pos);
        setCurrentPos(pos);
        setIsDrawing(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      setCurrentPos(getPercentagePos(e));
    } else if (isDragging && selectedPanelId) {
      const pos = getPercentagePos(e);
      setPanels((prev) =>
        prev.map((p) => {
          if (p.id === selectedPanelId) {
            return {
              ...p,
              x: Math.max(0, Math.min(100 - p.width, pos.x - dragOffset.x)),
              y: Math.max(0, Math.min(100 - p.height, pos.y - dragOffset.y)),
            };
          }
          return p;
        }),
      );
    } else if (isResizing && selectedPanelId) {
      const pos = getPercentagePos(e);
      setPanels((prev) =>
        prev.map((p) => {
          if (p.id === selectedPanelId) {
            return {
              ...p,
              width: Math.max(5, pos.x - p.x),
              height: Math.max(5, pos.y - p.y),
            };
          }
          return p;
        }),
      );
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      // Only create if it's large enough (e.g. > 2%)
      if (width > 2 && height > 2) {
        const newPanel: PanelItem = {
          id: `PNL-${(panels.length + 1).toString().padStart(2, '0')}`,
          x,
          y,
          width,
          height,
          stage: 'thumbnail',
          assignee: 'Unassigned',
          versions: [],
        };
        setPanels((prev) => [...prev, newPanel]);
        setSelectedPanelId(newPanel.id);
      }
    }

    if (isDragging) {
      setIsDragging(false);
    }

    if (isResizing) {
      setIsResizing(false);
    }
  };

  const handlePanelMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedPanelId(id);
    if (toolMode === 'select') {
      const pos = getPercentagePos(e);
      const panel = panels.find((p) => p.id === id);
      if (panel) {
        setDragOffset({ x: pos.x - panel.x, y: pos.y - panel.y });
        setIsDragging(true);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'bible') {
        const pos = getPercentagePos(e);
        // Default size for a dropped reference card
        const width = 15;
        const height = 10;
        const newOverlay: BibleOverlay = {
          id: `ref-${Date.now()}`,
          entityId: data.data.id,
          name: data.data.name,
          x: Math.max(0, Math.min(100 - width, pos.x - width / 2)),
          y: Math.max(0, Math.min(100 - height, pos.y - height / 2)),
          width,
          height,
        };
        setOverlays((prev) => [...prev, newOverlay]);
      }
    } catch (err) {
      console.error('Drop error', err);
    }
  };

  const drawRectStyle = isDrawing
    ? {
        left: `${Math.min(startPos.x, currentPos.x)}%`,
        top: `${Math.min(startPos.y, currentPos.y)}%`,
        width: `${Math.abs(currentPos.x - startPos.x)}%`,
        height: `${Math.abs(currentPos.y - startPos.y)}%`,
      }
    : {};

  return (
    <div className='flex-1 w-full flex justify-center items-center py-10 px-8 overflow-y-auto custom-scrollbar bg-[#E7E7E7] relative'>
      {/* B5 Canvas Container (ratio 1:1.414) */}
      <div
        ref={canvasRef}
        className={`w-full max-w-[600px] aspect-[1/1.414] bg-white shadow-lg relative ${toolMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Draw Ghost Box */}
        {isDrawing && (
          <div
            className='absolute border-2 border-dashed border-[#F97316] bg-[#F97316]/10 z-50 pointer-events-none'
            style={drawRectStyle}
          />
        )}

        {/* Panels */}
        {panels.map((panel) => (
          <CanvasPanelItem
            key={panel.id}
            panel={panel}
            isSelected={selectedPanelId === panel.id}
            onSelect={(e) => handlePanelMouseDown(e, panel.id)}
            onResizeStart={(e) => {
              if (toolMode === 'select') {
                setIsResizing(true);
                setResizeStartSize({ width: panel.width, height: panel.height });
              }
            }}
          />
        ))}

        {/* Bible Overlays */}
        {showOverlays &&
          overlays.map((overlay) => (
            <div
              key={overlay.id}
              className='absolute border-2 border-dashed border-[#D8B4FE] bg-[#F3E8FF]/40 z-40 flex items-center justify-center p-2 text-center pointer-events-none'
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                width: `${overlay.width}%`,
                height: `${overlay.height}%`,
              }}
            >
              <div className='bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm flex items-center gap-1'>
                <User className='w-3 h-3 text-[#8B5CF6]' />
                <span className='text-[10px] font-semibold text-[#6D28D9]'>{overlay.name}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

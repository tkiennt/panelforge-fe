import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';
import { Plus, Image as ImageIcon, Save, Info, Wand2 } from 'lucide-react';
import { useWorkspace, CanvasElement, BoundingBox } from '../context/WorkspaceContext';
import CharacterImagePipeline from '../components/CharacterImagePipeline';

// --- Types & Interfaces ---

export interface Panel extends BoundingBox {
  id: string;
}

// --- Collision Logic ---

const isIntersecting = (r1: BoundingBox, r2: BoundingBox) => {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
};

const isOverflowing = (element: BoundingBox, panel: BoundingBox) => {
  return (
    element.x < panel.x ||
    element.y < panel.y ||
    element.x + element.width > panel.x + panel.width ||
    element.y + element.height > panel.y + panel.height
  );
};

// --- Mock Data ---

const INITIAL_PANELS: Panel[] = [
  { id: 'panel-1', x: 50, y: 50, width: 300, height: 400 },
  { id: 'panel-2', x: 380, y: 50, width: 350, height: 400 },
];

const INITIAL_ELEMENTS: CanvasElement[] = [
  { id: 'art-1', type: 'artwork', panelId: 'panel-1', x: 60, y: 60, width: 280, height: 380, color: '#334155' },
  { id: 'art-2', type: 'artwork', panelId: 'panel-2', x: 390, y: 60, width: 330, height: 380, color: '#1E293B' },
  { id: 'text-1', type: 'text_balloon', panelId: 'panel-1', x: 80, y: 80, width: 120, height: 60, content: 'What is this place?' },
  { id: 'text-2', type: 'text_balloon', panelId: 'panel-2', x: 400, y: 80, width: 150, height: 60, content: 'The Undercity.' },
  { id: 'text-3', type: 'text_balloon', panelId: 'panel-2', x: 500, y: 200, width: 140, height: 50, content: 'Watch your step.' },
];

// --- Main Component ---

export const PanelCanvasEditor: React.FC = () => {
  const { canvasElements, setCanvasElements } = useWorkspace();
  const [panels] = useState<Panel[]>(INITIAL_PANELS);
  const [elements, setElements] = useState<CanvasElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);

  // Sync Global elements to local on mount if empty, or vice versa.
  useEffect(() => {
    if (canvasElements.length === 0) {
      setCanvasElements(INITIAL_ELEMENTS);
    }
  }, []);

  // Listen to global canvasElements additions (e.g. from Pipeline)
  useEffect(() => {
    if (canvasElements.length > 0) {
      // Re-run warning checks on the new merged state
      setElements(prev => checkWarnings(canvasElements));
    }
  }, [canvasElements]);

  // Recalculate warnings when elements move
  const checkWarnings = (currentElements: CanvasElement[]) => {
    return currentElements.map((el) => {
      if (el.type !== 'text_balloon') return { ...el, warning: null };
      
      const parentPanel = panels.find((p) => p.id === el.panelId);
      let warning: 'overflow' | 'overlap' | null = null;
      
      // 1. Check Overflow
      if (parentPanel && isOverflowing(el, parentPanel)) {
        warning = 'overflow';
      } else {
        // 2. Check Overlap with other text balloons (Reading order issue)
        const overlappingBalloons = currentElements.filter(
          (other) => other.id !== el.id && other.type === 'text_balloon' && isIntersecting(el, other)
        );
        if (overlappingBalloons.length > 0) {
          warning = 'overlap';
        }
      }
      
      return { ...el, warning };
    });
  };

  useEffect(() => {
    // Initial warning check
    setElements((prev) => checkWarnings(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels]);

  const handleDragMove = (e: any, id: string) => {
    const node = e.target;
    setElements((prev) => {
      const updated = prev.map((el) => {
        if (el.id === id) {
          return { ...el, x: node.x(), y: node.y() };
        }
        return el;
      });
      return checkWarnings(updated);
    });
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-[#FAF8F5] text-zinc-800 font-sans">
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 shrink-0 bg-white border-b border-zinc-200 flex items-center px-4 gap-3">
          <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add Balloon
          </button>
          <button 
            onClick={() => setShowPipeline(true)}
            className="px-3 py-1.5 bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 border border-orange-500/30 text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> Generate Character (AI)
          </button>
          <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" /> Upload Cut-out
          </button>
          <div className="flex-1"></div>
          <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Save Layout
          </button>
        </div>

        {/* Konva Stage Wrapper */}
        <div className="flex-1 overflow-auto bg-[#FAF8F5] flex items-center justify-center p-8">
          {/* A fixed size wrapper representing the Page */}
          <div className="bg-white shadow-2xl border border-zinc-200 shadow-zinc-200/50" style={{ width: 800, height: 600 }}>
            <Stage width={800} height={600} onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}>
              <Layer>
                {/* 1. Render Panels (Boundaries) */}
                {panels.map((panel) => (
                  <Group key={panel.id}>
                    <Rect
                      x={panel.x}
                      y={panel.y}
                      width={panel.width}
                      height={panel.height}
                      stroke="#4B5563"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                    <Text
                      x={panel.x + 5}
                      y={panel.y + 5}
                      text={panel.id.toUpperCase()}
                      fill="#6B7280"
                      fontSize={10}
                      fontFamily="monospace"
                    />
                  </Group>
                ))}

                {/* 2. Render Elements */}
                {elements.map((el) => {
                  const isSelected = selectedId === el.id;
                  
                  if (el.type === 'artwork') {
                    return (
                      <Rect
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        fill={el.color || '#334155'}
                        draggable
                        onClick={() => setSelectedId(el.id)}
                        onDragMove={(e) => handleDragMove(e, el.id)}
                        stroke={isSelected ? '#6366F1' : undefined}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  }

                  if (el.type === 'text_balloon') {
                    let strokeColor = isSelected ? '#6366F1' : '#E5E7EB';
                    let strokeWidth = isSelected ? 3 : 1;
                    
                    if (el.warning === 'overflow') {
                      strokeColor = '#EF4444'; // Red
                      strokeWidth = 3;
                    } else if (el.warning === 'overlap') {
                      strokeColor = '#F59E0B'; // Orange
                      strokeWidth = 3;
                    }

                    return (
                      <Group
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        draggable
                        onClick={() => setSelectedId(el.id)}
                        onDragMove={(e) => handleDragMove(e, el.id)}
                      >
                        <Rect
                          width={el.width}
                          height={el.height}
                          fill="#FFFFFF"
                          cornerRadius={16}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          shadowColor={el.warning ? strokeColor : "black"}
                          shadowBlur={el.warning ? 10 : 5}
                          shadowOpacity={el.warning ? 0.5 : 0.2}
                          shadowOffset={{ x: 0, y: 2 }}
                        />
                        <Text
                          text={el.content}
                          width={el.width}
                          height={el.height}
                          align="center"
                          verticalAlign="middle"
                          fill="#111827"
                          fontSize={12}
                          fontFamily="sans-serif"
                          padding={10}
                        />
                      </Group>
                    );
                  }
                  
                  return null;
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Properties Panel (Right Sidebar) */}
      <div className="w-72 shrink-0 bg-white border-l border-zinc-200 p-5 flex flex-col">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-200 pb-3 mb-4">
          <Info className="w-4 h-4 text-orange-600" /> Properties
        </h3>

        {!selectedElement ? (
          <div className="text-xs text-zinc-400 text-center py-10">
            Select an element to view properties.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#FAF8F5] p-2 rounded border border-zinc-200">
              <span className="text-xs text-zinc-400 font-mono">ID</span>
              <span className="text-xs text-zinc-800 font-mono">{selectedElement.id}</span>
            </div>
            
            <div className="flex justify-between items-center bg-[#FAF8F5] p-2 rounded border border-zinc-200">
              <span className="text-xs text-zinc-400 font-mono">TYPE</span>
              <span className="text-xs text-orange-600 font-bold uppercase">{selectedElement.type.replace('_', ' ')}</span>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-zinc-200 space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Geometry</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-400 mr-2">X:</span>
                  <span className="text-xs text-zinc-700 font-mono">{Math.round(selectedElement.x)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 mr-2">Y:</span>
                  <span className="text-xs text-zinc-700 font-mono">{Math.round(selectedElement.y)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 mr-2">W:</span>
                  <span className="text-xs text-zinc-700 font-mono">{Math.round(selectedElement.width)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 mr-2">H:</span>
                  <span className="text-xs text-zinc-700 font-mono">{Math.round(selectedElement.height)}</span>
                </div>
              </div>
            </div>

            {selectedElement.warning && (
              <div className={`p-3 rounded-xl border ${selectedElement.warning === 'overflow' ? 'bg-red-950/30 border-red-900/50 text-red-400' : 'bg-amber-950/30 border-amber-900/50 text-amber-400'}`}>
                <h4 className="text-xs font-bold mb-1">
                  {selectedElement.warning === 'overflow' ? 'Panel Overflow' : 'Overlap Warning'}
                </h4>
                <p className="text-[10px] opacity-80">
                  {selectedElement.warning === 'overflow' 
                    ? 'Text balloon falls outside its parent panel boundaries. Lettering may be clipped.' 
                    : 'Text balloons overlap. This may cause reading order confusion.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Modal Overlay */}
      {showPipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
          <div className="w-full h-full max-w-7xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-300 flex flex-col relative">
            <button 
              onClick={() => setShowPipeline(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <CharacterImagePipeline onClose={() => setShowPipeline(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

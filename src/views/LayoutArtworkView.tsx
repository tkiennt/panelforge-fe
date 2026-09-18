import React, { useState } from 'react';
import { MousePointer2, Square, ZoomIn, Sparkles, BookOpen, Trash2 } from 'lucide-react';
import {
  MOCK_PAGE_PANELS,
  PanelItem,
  BibleOverlay,
  StageType,
  ArtworkVersion,
} from '../data/mockLayoutData';
import { BibleReferencePanel } from '../components/layout/BibleReferencePanel';
import { CanvasEditor } from '../components/layout/CanvasEditor';
import { PanelProperties } from '../components/layout/PanelProperties';
import { AILayoutModal } from '../components/layout/AILayoutModal';

interface LayoutArtworkViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const LayoutArtworkView: React.FC<LayoutArtworkViewProps> = ({ onShowToast }) => {
  const [panels, setPanels] = useState<PanelItem[]>(MOCK_PAGE_PANELS);
  const [overlays, setOverlays] = useState<BibleOverlay[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  const [showBible, setShowBible] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [toolMode, setToolMode] = useState<'select' | 'draw'>('select');
  const [showAIModal, setShowAIModal] = useState(false);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) || null;

  const handleUpdateStage = (id: string, stage: StageType) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));
    onShowToast('Stage Updated', `Panel ${id} moved to ${stage}`);
  };

  const handleUploadArtwork = (id: string) => {
    const newVersion: ArtworkVersion = {
      id: `v${Math.floor(Math.random() * 100)}`,
      uploaderName: 'Artist (You)',
      uploaderAvatar: 'A',
      timestamp: new Date().toISOString(),
      stageAtUpload: panels.find((p) => p.id === id)?.stage || 'thumbnail',
    };

    setPanels((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            currentArtworkVersionId: newVersion.id,
            versions: [newVersion, ...p.versions],
          };
        }
        return p;
      }),
    );
    onShowToast('Artwork Uploaded', 'New version added successfully.');
  };

  const handleRollback = (id: string, versionId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentArtworkVersionId: versionId } : p)),
    );
    onShowToast('Version Restored', `Rolled back to ${versionId}`);
  };

  const handleDeleteSelected = () => {
    if (selectedPanelId) {
      setPanels((prev) => prev.filter((p) => p.id !== selectedPanelId));
      setSelectedPanelId(null);
      onShowToast('Panel Deleted', 'Panel removed from canvas.');
    }
  };

  const handleApplyAILayout = (newPanels: PanelItem[]) => {
    setPanels(newPanels);
    setSelectedPanelId(null);
    onShowToast('AI Layout Applied', 'Canvas overwritten with AI suggestion.');
  };

  return (
    <div className='w-full h-full flex flex-col bg-[#F3F3F3] relative overflow-hidden'>
      {/* Sticky Toolbar */}
      <div className='shrink-0 border-b border-[#E7E7E7] px-4 py-2.5 flex items-center justify-between bg-white shadow-sm z-20'>
        {/* Left: Toggles & Tools */}
        <div className='flex items-center gap-4'>
          <button
            onClick={() => setShowBible(!showBible)}
            className={`p-1.5 rounded-md transition-colors border ${showBible ? 'bg-[#F5F3FF] text-[#6D28D9] border-[#D8B4FE]' : 'bg-white text-[#525252] border-[#E7E7E7] hover:bg-[#F3F3F3]'}`}
            title='Toggle Series Bible'
          >
            <BookOpen className='w-4 h-4' />
          </button>

          <div className='w-px h-5 bg-[#E7E7E7]'></div>

          <div className='flex bg-[#F3F3F3] p-1 rounded-lg border border-[#E7E7E7]'>
            <button
              onClick={() => setToolMode('select')}
              className={`p-1.5 rounded-md transition-colors ${toolMode === 'select' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#737373] hover:text-[#171717]'}`}
              title='Select / Move Tool'
            >
              <MousePointer2 className='w-4 h-4' />
            </button>
            <button
              onClick={() => {
                setToolMode('draw');
                setSelectedPanelId(null);
              }}
              className={`p-1.5 rounded-md transition-colors ${toolMode === 'draw' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#737373] hover:text-[#171717]'}`}
              title='Draw Panel Tool'
            >
              <Square className='w-4 h-4' />
            </button>
          </div>

          <div className='flex items-center gap-1 bg-[#F3F3F3] p-1 rounded-lg border border-[#E7E7E7]'>
            <span className='text-[11px] font-mono font-medium text-[#525252] px-2'>100%</span>
            <button className='p-1 rounded hover:bg-[#E7E7E7] text-[#737373]'>
              <ZoomIn className='w-3.5 h-3.5' />
            </button>
          </div>

          {selectedPanelId && (
            <>
              <div className='w-px h-5 bg-[#E7E7E7]'></div>
              <button
                onClick={handleDeleteSelected}
                className='p-1.5 rounded-md text-[#EF4444] hover:bg-[#FEE2E2] transition-colors'
                title='Delete Selected Panel'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            </>
          )}
        </div>

        {/* Right: AI Layout & Overlay Toggle */}
        <div className='flex items-center gap-4'>
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={showOverlays}
              onChange={(e) => setShowOverlays(e.target.checked)}
              className='accent-[#8B5CF6] cursor-pointer'
            />
            <span className='text-[11px] font-mono font-bold text-[#525252] uppercase tracking-wider'>
              Show Ref Overlays
            </span>
          </label>

          <button
            onClick={() => setShowAIModal(true)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#F3E8FF] hover:bg-[#E9D5FF] border border-[#D8B4FE] rounded-md shadow-2xs transition-colors'
          >
            <Sparkles className='w-3.5 h-3.5' />
            AI Layout Suggestion
          </button>
        </div>
      </div>

      {/* Main Area: 3 Columns */}
      <div className='flex-1 w-full flex overflow-hidden'>
        {/* Col 1: Bible Reference Panel */}
        {showBible && <BibleReferencePanel />}

        {/* Col 2: Canvas */}
        <CanvasEditor
          panels={panels}
          setPanels={setPanels}
          overlays={overlays}
          setOverlays={setOverlays}
          selectedPanelId={selectedPanelId}
          setSelectedPanelId={setSelectedPanelId}
          showOverlays={showOverlays}
          toolMode={toolMode}
        />

        {/* Col 3: Properties / Upload */}
        <PanelProperties
          panel={selectedPanel}
          onUpdateStage={handleUpdateStage}
          onUploadArtwork={handleUploadArtwork}
          onRollback={handleRollback}
        />
      </div>

      <AILayoutModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApplyLayout={handleApplyAILayout}
      />
    </div>
  );
};

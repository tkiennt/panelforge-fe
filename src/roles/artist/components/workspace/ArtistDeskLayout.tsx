import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Eye,
  Columns,
  Maximize2,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { ScriptReaderPanel } from './ScriptReaderPanel';
import { ArtworkCanvasDropzone } from './ArtworkCanvasDropzone';
import { AIPromptStudio } from './AIPromptStudio';
import { ImageViewerLightbox } from '@/shared/components/image-viewer/ImageViewerLightbox';
import {
  ScriptLineItem,
  CanvasPanelItem,
  BibleCharacterRef,
  ViewMode,
  AiAgentStatus,
} from './workspace.types';

// Realistic Manga Production Mock Data for demonstration and fallback
const DEFAULT_SCRIPT_LINES: ScriptLineItem[] = [
  {
    id: 'line-1',
    lineOrder: 1,
    panelId: 'panel-1',
    stageDirection: 'Góc toàn cảnh bên ngoài Cổng thành Hoàng gia đổ nát sau cơn bão cát. Khói bốc lên ngùn ngụt từ tháp canh.',
    cameraAngle: 'Toàn cảnh (Wide)',
    mood: 'Trầm lắng, căng thẳng',
  },
  {
    id: 'line-2',
    lineOrder: 2,
    panelId: 'panel-1',
    characterName: 'Akira Takahashi',
    characterColor: '#F97316',
    dialogueText: 'Cuối cùng... chúng ta cũng đã đến được cổng thành phía Nam.',
    mood: 'Kiệt sức nhưng quyết tâm',
  },
  {
    id: 'line-3',
    lineOrder: 3,
    panelId: 'panel-2',
    stageDirection: 'Cận cảnh bước chân của Akira giẫm lên thanh gươm gãy bị chôn vùi dưới cát.',
    cameraAngle: 'Cận cảnh chân (Low Angle)',
  },
  {
    id: 'line-4',
    lineOrder: 4,
    panelId: 'panel-3',
    characterName: 'Ren (Phụ tá)',
    characterColor: '#3B82F6',
    dialogueText: 'Cẩn thận, Akira! Có dấu hiệu phục kích của lính canh bóng đêm phía trước!',
    mood: 'Cảnh giác cao độ',
  },
  {
    id: 'line-5',
    lineOrder: 5,
    panelId: 'panel-4',
    stageDirection: 'Góc cận mặt kịch tính của Akira, mắt lóe sáng kiên định, vết sẹo má trái căng lên đón gió.',
    cameraAngle: 'Cận cảnh mặt (Close-up)',
    mood: 'Chiến đấu',
  },
  {
    id: 'line-6',
    lineOrder: 6,
    panelId: 'panel-4',
    characterName: 'Akira Takahashi',
    characterColor: '#F97316',
    dialogueText: 'Rút vũ khí ra. Chúng ta sẽ mở đường bằng chính lưỡi kiếm này!',
  },
];

const DEFAULT_PANELS: CanvasPanelItem[] = [
  {
    id: 'panel-1',
    panelNumber: 1,
    readingOrder: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 38,
    cameraAngle: 'Toàn cảnh (Wide Shot)',
    lighting: 'Ánh sáng vàng hoàng hôn le lói qua khói bụi',
    mood: 'Hoang tàn, bi tráng',
    suggestedPrompt:
      'Manga ink style, panoramic wide shot of ruined colossal fortress gates after a sandstorm, smoke rising, scattered broken spears on sandy ground, dramatic sunset lighting, high contrast screentone, traditional G-pen hatching.',
    assignedScriptIds: ['line-1', 'line-2'],
  },
  {
    id: 'panel-2',
    panelNumber: 2,
    readingOrder: 2,
    x: 0,
    y: 40,
    width: 48,
    height: 28,
    cameraAngle: 'Góc thấp (Low Angle)',
    lighting: 'Bóng râm sâu tương phản',
    mood: 'Hồi hộp',
    suggestedPrompt:
      'Manga ink linework, close-up of a weathered leather boot stepping on a shattered ancient katana in the desert sand, wind dust particles, sharp dynamic shadows, crisp screentone.',
    assignedScriptIds: ['line-3'],
  },
  {
    id: 'panel-3',
    panelNumber: 3,
    readingOrder: 3,
    x: 52,
    y: 40,
    width: 48,
    height: 28,
    cameraAngle: 'Góc nghiêng (Dutch Angle)',
    lighting: 'Ánh sáng gắt bên hông',
    mood: 'Báo động',
    suggestedPrompt:
      'Manga style, young agile scout Ren in hooded cloak peering through sandstorm, anxious expression, holding a dagger, dynamic motion speedlines, cel shaded ink art.',
    assignedScriptIds: ['line-4'],
  },
  {
    id: 'panel-4',
    panelNumber: 4,
    readingOrder: 4,
    x: 0,
    y: 70,
    width: 100,
    height: 30,
    cameraAngle: 'Cận mặt kịch tính (Dramatic Close-up)',
    lighting: 'Ánh sáng rim light sắc nét',
    mood: 'Quyết đoán đỉnh điểm',
    suggestedPrompt:
      'Masterpiece manga ink art, intense emotional close-up of young swordsman Akira Takahashi, scar on left cheek, fierce focused eyes, black spiky hair blowing in strong wind, unsheathing a glowing blade, intense speedlines, bold ink contour.',
    assignedScriptIds: ['line-5', 'line-6'],
  },
];

const DEFAULT_BIBLE_REFS: BibleCharacterRef[] = [
  {
    id: 'char-1',
    name: 'Akira Takahashi',
    role: 'Nhân vật chính (Protagonist)',
    hairStyleGuide: 'Tóc đen ngắn lỉa chỉa, mái lệch nhẹ sang phải, vết sẹo mỏng dài 3cm má trái.',
    costumeGuide: 'Áo khoác dạ hành xám rách gấu, đai da nâu đính huy hiệu Sói bạc, găng tay đen hở ngón.',
    notableFeatures: ['Vết sẹo má trái', 'Mắt hổ phách', 'Áo rách vai'],
  },
  {
    id: 'char-2',
    name: 'Ren Alaster',
    role: 'Trinh sát / Đồng đội',
    hairStyleGuide: 'Tóc nâu hạt dẻ buộc gọn sau gáy, đeo dải băng trán màu xanh sẫm.',
    costumeGuide: 'Áo choàng có mũ trùm không tay, đeo túi phi tiêu và bản đồ bên hông.',
  },
];

export interface ArtistDeskLayoutProps {
  studioName?: string;
  seriesTitle?: string;
  chapterTitle?: string;
  currentPageNumber?: number;
  totalPages?: number;
  initialPanels?: CanvasPanelItem[];
  initialScriptLines?: ScriptLineItem[];
  bibleReferences?: BibleCharacterRef[];
  onBackToDashboard?: () => void;
  onSubmitReview?: () => void;
}

export const ArtistDeskLayout: React.FC<ArtistDeskLayoutProps> = ({
  studioName = 'Lucian Labs Studio',
  seriesTitle = 'Vương Triều Bóng Đêm',
  chapterTitle = 'Chương 12: Đột Kích Cổng Thành',
  currentPageNumber = 2,
  totalPages = 18,
  initialPanels = DEFAULT_PANELS,
  initialScriptLines = DEFAULT_SCRIPT_LINES,
  bibleReferences = DEFAULT_BIBLE_REFS,
  onBackToDashboard,
  onSubmitReview,
}) => {
  const [panels, setPanels] = useState<CanvasPanelItem[]>(initialPanels);
  const [scriptLines, setScriptLines] = useState<ScriptLineItem[]>(initialScriptLines);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>('panel-1');
  const [viewMode, setViewMode] = useState<ViewMode>('panel');
  const [pageNumber, setPageNumber] = useState<number>(currentPageNumber);
  const [aiStatus, setAiStatus] = useState<AiAgentStatus>('ready');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [saveTimestamp, setSaveTimestamp] = useState<string>('Vừa xong');
  const [lightboxSlide, setLightboxSlide] = useState<{ src: string; title: string } | null>(null);

  const selectedPanel = useMemo(
    () => panels.find((p) => p.id === selectedPanelId) || null,
    [panels, selectedPanelId]
  );

  const handleZoomArtwork = (panelId: string) => {
    const target = panels.find((p) => p.id === panelId);
    if (target?.imageUrl) {
      setLightboxSlide({
        src: target.imageUrl,
        title: `Bản vẽ Khung #${target.panelNumber} (Trang ${pageNumber})`,
      });
    }
  };

  // Handle image drop/upload onto a specific panel
  const handleDropArtwork = (panelId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? {
              ...p,
              imageUrl: objectUrl,
              imageVersion: `v${(parseFloat((p.imageVersion || 'v1.0').replace('v', '')) + 0.1).toFixed(1)}`,
            }
          : p
      )
    );
    setSaveTimestamp('Vừa lưu');
  };

  const handleDeleteArtwork = (panelId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, imageUrl: null } : p))
    );
    setSaveTimestamp('Vừa lưu');
  };

  // Trigger simulated AI Image Generation
  const handleGenerateAiImage = (prompt: string, negativePrompt: string, stylePreset: string) => {
    if (!selectedPanelId) return;
    setIsGenerating(true);
    setAiStatus('generating');

    // Simulate AI generation process with artistic placeholder
    setTimeout(() => {
      // High quality manga placeholder art generator
      const mockArtworkUrl = `https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80`;
      setPanels((prev) =>
        prev.map((p) =>
          p.id === selectedPanelId
            ? {
                ...p,
                imageUrl: mockArtworkUrl,
                imageVersion: 'v1.0-AI',
                suggestedPrompt: prompt,
              }
            : p
        )
      );
      setIsGenerating(false);
      setAiStatus('ready');
      setSaveTimestamp('Vừa lưu');
    }, 1800);
  };

  // Auto-sync script lines to panels based on reading order
  const handleAutoSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSaveTimestamp('Đã đồng bộ');
    }, 600);
  };

  return (
    <div
      data-testid='artist-desk-layout-container'
      className='flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F5] text-stone-900 font-sans'
    >
      {/* ========================================================
          A. TOP HEADER NAVIGATION (Compact Minimalist App Shell)
          ======================================================== */}
      <header
        data-testid='artist-desk-top-header'
        className='h-12 border-b border-stone-200 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-50 shadow-2xs select-none'
      >
        {/* Left: Dynamic Breadcrumb Navigation */}
        <div className='flex items-center gap-2 text-xs'>
          {onBackToDashboard && (
            <button
              type='button'
              onClick={onBackToDashboard}
              title='Quay lại Dashboard'
              className='p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer mr-1'
            >
              <ArrowLeft className='w-4 h-4' />
            </button>
          )}

          <span className='font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer'>
            {studioName}
          </span>
          <ChevronRight className='w-3.5 h-3.5 text-stone-400' />

          <span className='font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer'>
            {seriesTitle}
          </span>
          <ChevronRight className='w-3.5 h-3.5 text-stone-400' />

          <span className='font-bold text-stone-900 truncate max-w-[200px]'>
            {chapterTitle}
          </span>
          <ChevronRight className='w-3.5 h-3.5 text-stone-400' />

          <span className='font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200'>
            Trang {pageNumber}
          </span>
        </div>

        {/* Center: Compact Page Switcher & View Mode Toggles */}
        <div className='flex items-center gap-3'>
          {/* Page Switcher */}
          <div className='flex items-center bg-[#FAF8F5] border border-stone-300 rounded-lg p-0.5 shadow-2xs'>
            <button
              type='button'
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              title='Trang trước'
              className='p-1 rounded-md text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer'
            >
              <ChevronLeft className='w-3.5 h-3.5' />
            </button>

            <span className='text-xs font-mono font-bold px-2.5 text-stone-900'>
              Trang {pageNumber} / {totalPages}
            </span>

            <button
              type='button'
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              disabled={pageNumber >= totalPages}
              title='Trang kế tiếp'
              className='p-1 rounded-md text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer'
            >
              <ChevronRight className='w-3.5 h-3.5' />
            </button>
          </div>

          {/* View Mode Toggle (Panel Mode vs Full-Page Mode) */}
          <div className='flex bg-stone-100 p-0.5 rounded-lg text-[11px] font-medium border border-stone-200'>
            <button
              type='button'
              onClick={() => setViewMode('panel')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'panel'
                  ? 'bg-white text-stone-900 font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chế độ Khung (Panel)
            </button>
            <button
              type='button'
              onClick={() => setViewMode('fullpage')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'fullpage'
                  ? 'bg-white text-stone-900 font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cả Trang (Full-Page)
            </button>
          </div>
        </div>

        {/* Right: AI Indicator, Quick Save, and Primary Review CTA */}
        <div className='flex items-center gap-3'>
          {/* AI Agent Status Badge */}
          <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold'>
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus === 'generating'
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className='font-mono text-[11px]'>
              {aiStatus === 'generating' ? 'AI: Đang sinh ảnh' : 'AI Agent: Sẵn sàng'}
            </span>
          </div>

          {/* Quick Save Status Indicator */}
          <div className='flex items-center gap-1 text-[11px] text-stone-400 font-mono hidden md:flex'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
            <span>{saveTimestamp}</span>
          </div>

          {/* Primary CTA: Nộp kiểm duyệt (Submit to Review) */}
          <button
            type='button'
            data-testid='submit-to-review-btn'
            onClick={onSubmitReview}
            className='bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer'
          >
            <Send className='w-3.5 h-3.5' />
            <span>Nộp kiểm duyệt</span>
          </button>
        </div>
      </header>

      {/* ========================================================
          3-COLUMN WORKSPACE BODY
          ======================================================== */}
      <div className='flex-1 flex overflow-hidden min-h-0 relative'>
        {/* B. Left Column: Writer Script Reader (340px) */}
        <ScriptReaderPanel
          pageNumber={pageNumber}
          lines={scriptLines}
          selectedPanelId={selectedPanelId}
          onSelectPanel={(id) => setSelectedPanelId(id)}
          onAutoSync={handleAutoSync}
          isSyncing={isSyncing}
        />

        {/* C. Center Column: Interactive Artwork Canvas & Direct Dropzone (Flex-1) */}
        <ArtworkCanvasDropzone
          panels={panels}
          selectedPanelId={selectedPanelId}
          onSelectPanel={(id) => setSelectedPanelId(id)}
          onDropArtwork={handleDropArtwork}
          onDeleteArtwork={handleDeleteArtwork}
          onZoomArtwork={handleZoomArtwork}
          viewMode={viewMode}
          pageNumber={pageNumber}
        />

        {/* D. Right Column: AI Visual Agent & Prompt Studio (360px) */}
        <AIPromptStudio
          selectedPanel={selectedPanel}
          onGenerateAiImage={handleGenerateAiImage}
          isGenerating={isGenerating}
          bibleReferences={bibleReferences}
        />
      </div>

      {lightboxSlide && (
        <ImageViewerLightbox
          isOpen={Boolean(lightboxSlide)}
          onClose={() => setLightboxSlide(null)}
          slides={[lightboxSlide]}
        />
      )}
    </div>
  );
};

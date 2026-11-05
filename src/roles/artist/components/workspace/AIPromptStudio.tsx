import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  ChevronDown,
  BookMarked,
  Sliders,
  AlertCircle,
  Palette,
  Eye,
  Camera,
  Sun,
  Smile,
} from 'lucide-react';
import { CanvasPanelItem, BibleCharacterRef, PanelScriptContext } from './workspace.types';

interface AIPromptStudioProps {
  selectedPanel: CanvasPanelItem | null;
  scriptContext?: PanelScriptContext | null;
  onGenerateAiImage: (prompt: string, negativePrompt: string, stylePreset: string) => void;
  onCopyPrompt?: (prompt: string) => void;
  onRerollPrompt?: () => void;
  isGenerating?: boolean;
  bibleReferences?: BibleCharacterRef[];
}

const STYLE_PRESETS = [
  { id: 'shonen', label: 'Shonen Action', promptTag: 'high contrast ink, dynamic speed lines, intense screentone' },
  { id: 'classic-ink', label: 'Classic Ink', promptTag: 'traditional G-pen linework, sumi ink shading, crosshatching' },
  { id: 'webtoon', label: 'Webtoon Color', promptTag: 'crisp digital lineart, soft cel shading, cinematic lighting' },
  { id: 'seinen', label: 'Seinen Detailed', promptTag: 'gritty realistic hatching, deep shadows, atmospheric textures' },
  { id: 'shojo', label: 'Shojo Romantic', promptTag: 'delicate linework, flower screentone effects, soft gradient halftones' },
];

export const AIPromptStudio: React.FC<AIPromptStudioProps> = ({
  selectedPanel,
  scriptContext,
  onGenerateAiImage,
  onCopyPrompt,
  onRerollPrompt,
  isGenerating = false,
  bibleReferences = [],
}) => {
  const [positivePrompt, setPositivePrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(
    'low quality, blurry, extra limbs, bad anatomy, deformed eyes, color bleed, low resolution'
  );
  const [selectedStyle, setSelectedStyle] = useState<string>('shonen');
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [isBibleDrawerOpen, setIsBibleDrawerOpen] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync prompt when active panel changes
  useEffect(() => {
    if (selectedPanel?.suggestedPrompt) {
      setPositivePrompt(selectedPanel.suggestedPrompt);
    } else if (selectedPanel) {
      // Default crafted prompt for selected panel
      const angle = selectedPanel.cameraAngle || 'dynamic angle';
      const lighting = selectedPanel.lighting || 'dramatic directional rim light';
      setPositivePrompt(
        `Manga ink style, highly detailed linework, young male protagonist Akira with scarred left cheek, intense expression, ${angle}, ${lighting}, dynamic speedlines, high contrast screentone.`
      );
    } else {
      setPositivePrompt('');
    }
  }, [selectedPanel]);

  const handleCopy = () => {
    if (!positivePrompt) return;
    navigator.clipboard.writeText(positivePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyPrompt?.(positivePrompt);
  };

  const handleGenerate = () => {
    if (!positivePrompt) return;
    onGenerateAiImage(positivePrompt, negativePrompt, selectedStyle);
  };

  return (
    <aside
      data-testid='ai-visual-agent-studio'
      className='w-[360px] shrink-0 bg-white border-l border-stone-200 flex flex-col h-full overflow-hidden select-none'
    >
      {/* 1. Header AI Visual Agent */}
      <div className='p-4 border-b border-stone-200 bg-[#FCFBF8] shrink-0 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs'>
            <Sparkles className='w-4 h-4' />
          </div>
          <div>
            <h2 className='text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5'>
              <span>AI Visual Agent</span>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
            </h2>
            <p className='text-[10px] text-stone-500 font-sans'>
              Trợ lý biến đổi kịch bản thành bản vẽ
            </p>
          </div>
        </div>

        {/* Selection status badge */}
        <div>
          {selectedPanel ? (
            <span className='text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200'>
              Khung #{selectedPanel.panelNumber} đang chọn
            </span>
          ) : (
            <span className='text-[10px] font-mono text-stone-400'>
              Chưa chọn khung
            </span>
          )}
        </div>
      </div>

      {/* Main Studio Body */}
      <div className='flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4'>
        {/* Empty selection state */}
        {!selectedPanel ? (
          <div className='p-6 text-center text-stone-400 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-xl my-4'>
            <Sliders className='w-8 h-8 stroke-[1.5] text-stone-300 mb-2' />
            <p className='text-xs font-semibold text-stone-600 mb-1'>
              Chọn một khung trên canvas
            </p>
            <p className='text-[11px] text-stone-400 max-w-[200px]'>
              Chọn khung tranh ở giữa để AI Visual Agent tự động phân tích bối cảnh và gợi ý prompt sinh ảnh.
            </p>
          </div>
        ) : (
          <>
            {/* 2. Scene Context Breakdown (Phân tích bối cảnh tự động từ Script) */}
            <div className='p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/80 space-y-2'>
              <div className='flex items-center justify-between text-[11px] font-bold text-stone-900'>
                <span className='flex items-center gap-1.5 text-stone-700'>
                  <Camera className='w-3.5 h-3.5 text-orange-600' />
                  <span>Bối cảnh khung tranh (Scene Context)</span>
                </span>
                <span className='text-[9px] font-mono text-stone-400 uppercase'>
                  Auto-analyzed
                </span>
              </div>

              <div className='grid grid-cols-2 gap-2 text-[11px] pt-1'>
                <div className='p-2 bg-white rounded-lg border border-stone-200/60'>
                  <span className='text-[10px] text-stone-400 block font-mono'>Góc máy (Angle)</span>
                  <span className='font-semibold text-stone-800'>
                    {selectedPanel.cameraAngle || 'Góc cận mặt (Close-up)'}
                  </span>
                </div>

                <div className='p-2 bg-white rounded-lg border border-stone-200/60'>
                  <span className='text-[10px] text-stone-400 block font-mono'>Ánh sáng (Light)</span>
                  <span className='font-semibold text-stone-800'>
                    {selectedPanel.lighting || 'Ánh sáng vàng hoàng hôn'}
                  </span>
                </div>
              </div>

              {selectedPanel.mood && (
                <div className='flex items-center gap-1.5 text-[10px] text-stone-600 px-1'>
                  <Smile className='w-3 h-3 text-amber-600' />
                  <span>Tâm trạng: <strong className='text-stone-800'>{selectedPanel.mood}</strong></span>
                </div>
              )}
            </div>

            {/* 3. Prompt Editor Area */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-bold text-stone-900 flex items-center gap-1.5'>
                  <Wand2 className='w-3.5 h-3.5 text-purple-600' />
                  <span>Prompt Tạo Ảnh (Positive Prompt)</span>
                </label>
                <span className='text-[10px] font-mono text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded'>
                  Manga Model v2.4
                </span>
              </div>

              {/* High Contrast Prompt Textarea */}
              <div className='relative'>
                <textarea
                  data-testid='ai-positive-prompt-input'
                  value={positivePrompt}
                  onChange={(e) => setPositivePrompt(e.target.value)}
                  rows={4}
                  placeholder='Nhập prompt mô tả bản vẽ...'
                  className='w-full p-3 font-mono text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner leading-relaxed resize-none selection:bg-purple-600'
                />
              </div>

              {/* Style Presets Chips */}
              <div className='space-y-1.5 pt-1'>
                <div className='flex items-center gap-1 text-[11px] font-semibold text-stone-700'>
                  <Palette className='w-3.5 h-3.5 text-stone-500' />
                  <span>Phong cách vẽ (Style Preset)</span>
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {STYLE_PRESETS.map((preset) => {
                    const isSelected = selectedStyle === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type='button'
                        onClick={() => setSelectedStyle(preset.id)}
                        className={`text-[10px] font-mono font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accordion: Negative Prompt */}
              <div className='border border-stone-200 rounded-xl overflow-hidden mt-2'>
                <button
                  type='button'
                  onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                  className='w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-left text-[11px] font-semibold text-stone-700 transition-colors cursor-pointer'
                >
                  <span className='flex items-center gap-1.5'>
                    <AlertCircle className='w-3.5 h-3.5 text-stone-500' />
                    <span>Negative Prompt (Loại trừ lỗi vẽ)</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                      isAccordionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isAccordionOpen && (
                  <div className='p-2.5 bg-white border-t border-stone-200'>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                      className='w-full p-2 font-mono text-[11px] bg-stone-50 text-stone-700 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-normal resize-none'
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4. Action Buttons */}
            <div className='space-y-2 pt-2'>
              {/* Primary AI Generate CTA */}
              <button
                type='button'
                data-testid='generate-ai-artwork-btn'
                onClick={handleGenerate}
                disabled={isGenerating || !positivePrompt.trim()}
                className='w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className='w-4 h-4 animate-spin' />
                    <span>Đang sinh bản vẽ AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className='w-4 h-4 text-amber-300' />
                    <span>Sinh ảnh bản vẽ (AI Generate)</span>
                  </>
                )}
              </button>

              {/* Secondary Actions: Copy & Re-roll */}
              <div className='grid grid-cols-2 gap-2'>
                <button
                  type='button'
                  onClick={handleCopy}
                  className='py-1.5 px-3 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs'
                >
                  {copied ? (
                    <>
                      <Check className='w-3.5 h-3.5 text-emerald-600' />
                      <span className='text-emerald-700'>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className='w-3.5 h-3.5 text-stone-500' />
                      <span>Sao chép Prompt</span>
                    </>
                  )}
                </button>

                <button
                  type='button'
                  onClick={onRerollPrompt}
                  className='py-1.5 px-3 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs'
                >
                  <RefreshCw className='w-3.5 h-3.5 text-purple-600' />
                  <span>Đề xuất lại Prompt</span>
                </button>
              </div>
            </div>

            {/* 5. Series Bible Reference Card (Collapsible Drawer at Bottom) */}
            <div className='border border-stone-200 rounded-xl overflow-hidden pt-1'>
              <button
                type='button'
                onClick={() => setIsBibleDrawerOpen(!isBibleDrawerOpen)}
                className='w-full px-3 py-2 bg-[#FCFBF8] hover:bg-stone-50 flex items-center justify-between text-left text-xs font-bold text-stone-900 transition-colors cursor-pointer'
              >
                <div className='flex items-center gap-1.5'>
                  <BookMarked className='w-3.5 h-3.5 text-amber-600' />
                  <span>Hồ Sơ Nhân Vật (Series Bible Guide)</span>
                  <span className='text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold'>
                    {bibleReferences.length > 0 ? `${bibleReferences.length} nhân vật` : 'Akira'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                    isBibleDrawerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isBibleDrawerOpen && (
                <div className='p-3 bg-white border-t border-stone-200 space-y-2.5'>
                  {(bibleReferences.length > 0
                    ? bibleReferences
                    : [
                        {
                          id: 'char-1',
                          name: 'Akira Takahashi (Nhân vật chính)',
                          role: 'Protagonist',
                          hairStyleGuide: 'Tóc đen ngắn lỉa chỉa, có vết sẹo mỏng bên má trái',
                          costumeGuide: 'Áo khoác đồng phục rách vai, găng tay da đen hở ngón',
                          notableFeatures: ['Vết sẹo má trái', 'Ánh mắt kiên định'],
                        },
                      ]
                  ).map((char) => (
                    <div
                      key={char.id}
                      className='p-2.5 rounded-lg bg-[#FAF8F5] border border-stone-200/80 space-y-1.5 text-left'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-stone-900'>
                          {char.name}
                        </span>
                        <span className='text-[9px] font-mono px-1 rounded bg-stone-200/70 text-stone-600 uppercase'>
                          {char.role || 'Main'}
                        </span>
                      </div>

                      <div className='text-[10px] space-y-1 text-stone-700 leading-relaxed'>
                        {char.hairStyleGuide && (
                          <div>
                            <span className='text-stone-400 font-mono'>Diện mạo: </span>
                            <span>{char.hairStyleGuide}</span>
                          </div>
                        )}
                        {char.costumeGuide && (
                          <div>
                            <span className='text-stone-400 font-mono'>Trang phục: </span>
                            <span>{char.costumeGuide}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

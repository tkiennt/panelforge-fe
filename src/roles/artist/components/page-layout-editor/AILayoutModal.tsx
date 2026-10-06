import React, { useState } from 'react';
import { X, Sparkles, Layout, Check, AlertTriangle } from 'lucide-react';
import { PanelItem } from '@/data/mockLayoutData';

interface AILayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLayout: (panels: PanelItem[]) => void;
}

export const AILayoutModal: React.FC<AILayoutModalProps> = ({ isOpen, onClose, onApplyLayout }) => {
  const [panelCount, setPanelCount] = useState(5);
  const [scriptRef, setScriptRef] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<PanelItem[][]>([]);
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      // Mock generated layouts based on requested panel count
      const layout1: PanelItem[] = [];
      const layout2: PanelItem[] = [];

      for (let i = 0; i < panelCount; i++) {
        layout1.push({
          id: `AI-L1-${i}`,
          x: 5,
          y: 5 + i * (90 / panelCount),
          width: 90,
          height: 90 / panelCount - 2,
          stage: 'thumbnail',
          assignee: 'Unassigned',
          versions: [],
        });

        layout2.push({
          id: `AI-L2-${i}`,
          x: i % 2 === 0 ? 5 : 52,
          y: 5 + Math.floor(i / 2) * (90 / Math.ceil(panelCount / 2)),
          width: i === panelCount - 1 && panelCount % 2 !== 0 ? 90 : 43,
          height: 90 / Math.ceil(panelCount / 2) - 2,
          stage: 'thumbnail',
          assignee: 'Unassigned',
          versions: [],
        });
      }

      setSuggestions([layout1, layout2]);
      setIsGenerating(false);
    }, 1500);
  };

  const handleConfirmApply = () => {
    if (selectedLayoutIndex !== null && suggestions[selectedLayoutIndex]) {
      onApplyLayout(suggestions[selectedLayoutIndex]);
      onClose();
    }
  };

  if (showConfirm) {
    return (
      <>
        <div className='absolute inset-0 bg-[#171717]/40 backdrop-blur-sm z-[100]' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[110] border border-[#E7E7E7] overflow-hidden animate-in zoom-in-95 duration-200'>
          <div className='p-4 border-b border-[#E7E7E7] bg-[#FEF2F2] flex items-center gap-2 text-[#DC2626]'>
            <AlertTriangle className='w-5 h-5' />
            <h3 className='text-base font-heading font-bold'>Overwrite Current Canvas?</h3>
          </div>
          <div className='p-6'>
            <p className='text-sm text-[#525252] leading-relaxed'>
              Applying this AI layout will{' '}
              <strong>delete all current panels and their artwork versions</strong> on the canvas.
              This action cannot be undone.
            </p>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                onClick={() => setShowConfirm(false)}
                className='px-4 py-2 text-sm font-semibold text-[#525252] hover:bg-[#F3F3F3] rounded-lg transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className='px-4 py-2 text-sm font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-lg shadow-sm transition-colors'
              >
                Yes, Overwrite Canvas
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className='absolute inset-0 bg-[#171717]/40 backdrop-blur-sm z-[100]'
        onClick={onClose}
      />
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[110] flex flex-col max-h-[90vh] overflow-hidden border border-[#E7E7E7] animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='p-4 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#F3E8FF] border border-[#D8B4FE] flex items-center justify-center text-[#6D28D9]'>
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-heading font-bold text-[#171717]'>
                AI Layout Suggestion
              </h2>
              <p className='text-xs text-[#737373]'>
                Generate panel layouts based on script content.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-[#E7E7E7] rounded-full text-[#737373] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6'>
          {/* Input Form */}
          <div className='w-full md:w-1/2 space-y-4'>
            <div>
              <label className='block text-xs font-semibold text-[#525252] mb-1.5'>
                Number of Panels
              </label>
              <input
                type='number'
                min={1}
                max={12}
                value={panelCount}
                onChange={(e) => setPanelCount(Number(e.target.value))}
                className='w-full text-sm bg-white border border-[#E7E7E7] rounded-md px-3 py-2 outline-none focus:border-[#8B5CF6] transition-all'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-[#525252] mb-1.5'>
                Script Reference (Optional)
              </label>
              <textarea
                rows={4}
                value={scriptRef}
                onChange={(e) => setScriptRef(e.target.value)}
                placeholder='Paste scene description here for better composition suggestions...'
                className='w-full text-sm bg-white border border-[#E7E7E7] rounded-md px-3 py-2 outline-none focus:border-[#8B5CF6] transition-all resize-none'
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className='w-full py-2.5 flex items-center justify-center gap-2 bg-[#171717] hover:bg-[#525252] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50'
            >
              {isGenerating ? (
                'Generating...'
              ) : (
                <>
                  <Sparkles className='w-4 h-4' /> Generate Layouts
                </>
              )}
            </button>
          </div>

          {/* Results Area */}
          <div className='w-full md:w-1/2 border-l border-[#E7E7E7] pl-6 flex flex-col'>
            <h3 className='text-xs font-bold text-[#171717] uppercase tracking-wider mb-4'>
              Suggestions
            </h3>

            {suggestions.length === 0 ? (
              <div className='flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E7E7E7] rounded-xl bg-[#FAF8F4]'>
                <Layout className='w-8 h-8 text-[#B8B8B8] mb-2' />
                <p className='text-sm text-[#737373]'>
                  Configure settings and generate layouts to see previews.
                </p>
              </div>
            ) : (
              <div className='flex-1 overflow-y-auto custom-scrollbar space-y-4'>
                {suggestions.map((layout, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedLayoutIndex(idx)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      selectedLayoutIndex === idx
                        ? 'border-[#8B5CF6] bg-[#F5F3FF]'
                        : 'border-[#E7E7E7] hover:border-[#B8B8B8] bg-white'
                    }`}
                  >
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-xs font-semibold text-[#171717]'>Option {idx + 1}</span>
                      {selectedLayoutIndex === idx && <Check className='w-4 h-4 text-[#8B5CF6]' />}
                    </div>
                    {/* Mini Canvas Preview */}
                    <div className='w-full aspect-[1/1.414] bg-white border border-[#E7E7E7] rounded shadow-sm relative overflow-hidden pointer-events-none'>
                      {layout.map((p) => (
                        <div
                          key={p.id}
                          className='absolute border border-[#B8B8B8] bg-[#F3F3F3]'
                          style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: `${p.width}%`,
                            height: `${p.height}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#E7E7E7] bg-[#FAF8F4] flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-semibold text-[#525252] hover:bg-[#E7E7E7] rounded-lg transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selectedLayoutIndex === null}
            className='px-4 py-2 text-sm font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            <Check className='w-4 h-4' /> Apply Layout
          </button>
        </div>
      </div>
    </>
  );
};

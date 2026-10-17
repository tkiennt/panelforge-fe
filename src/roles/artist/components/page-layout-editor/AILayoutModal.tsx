import React, { useState } from 'react';
import { X, Sparkles, Layout, Check, AlertTriangle } from 'lucide-react';
import { PanelItem } from '@/mocks/mockLayoutData';

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
        <div className='fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-[100]' />
        <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[110] border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200'>
          <div className='p-4.5 border-b border-rose-100 bg-rose-50/70 flex items-center gap-2.5 text-rose-800'>
            <AlertTriangle className='w-5 h-5 text-rose-600 shrink-0' />
            <h3 className='text-sm font-bold text-rose-950'>Ghi Đè Bố Cục Canvas Hiện Tại?</h3>
          </div>
          <div className='p-6'>
            <p className='text-xs text-stone-600 leading-relaxed'>
              Việc áp dụng bố cục AI này sẽ{' '}
              <strong className='text-stone-900'>
                thay thế toàn bộ các ô khung và phiên bản artwork hiện tại
              </strong>{' '}
              trên canvas. Hành động này không thể hoàn tác.
            </p>
            <div className='mt-6 flex justify-end gap-2.5'>
              <button
                onClick={() => setShowConfirm(false)}
                className='px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer'
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmApply}
                className='px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-soft-sm transition-all cursor-pointer active:scale-95'
              >
                Đồng Ý Ghi Đè Canvas
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className='fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-[100]' onClick={onClose} />
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[110] flex flex-col max-h-[90vh] overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='p-4.5 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700'>
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-sm font-bold text-stone-900'>
                Gợi Ý Bố Cục Khung Tranh AI (AI Layout)
              </h2>
              <p className='text-xs text-stone-500'>
                Tự động bố trí ô khung phân cảnh dựa trên nội dung kịch bản
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 text-xs'>
          {/* Input Form */}
          <div className='w-full md:w-1/2 space-y-4'>
            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Số Lượng Khung (Number of Panels)
              </label>
              <input
                type='number'
                min={1}
                max={12}
                value={panelCount}
                onChange={(e) => setPanelCount(Number(e.target.value))}
                className='w-full bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-violet-500 font-mono text-xs'
              />
            </div>
            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Trích Đoạn Kịch Bản Tham Chiếu (Tùy chọn)
              </label>
              <textarea
                rows={4}
                value={scriptRef}
                onChange={(e) => setScriptRef(e.target.value)}
                placeholder='Dán mô tả phân cảnh tại đây để AI bố cục góc quay và tỷ lệ ô phù hợp...'
                className='w-full bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-violet-500 transition-all resize-none text-xs leading-relaxed'
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className='w-full py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-soft-sm transition-all disabled:opacity-50 cursor-pointer active:scale-98'
            >
              {isGenerating ? (
                'Đang khởi tạo bố cục AI...'
              ) : (
                <>
                  <Sparkles className='w-4 h-4 text-amber-300' /> Tạo Gợi Ý Bố Cục
                </>
              )}
            </button>
          </div>

          {/* Results Area */}
          <div className='w-full md:w-1/2 border-l border-stone-100 pl-6 flex flex-col'>
            <h3 className='text-xs font-bold text-stone-900 uppercase tracking-wider mb-3'>
              Gợi Ý Bố Cục ({suggestions.length})
            </h3>

            {suggestions.length === 0 ? (
              <div className='flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50'>
                <Layout className='w-8 h-8 text-stone-300 mb-2' />
                <p className='text-xs text-stone-500'>
                  Nhập số khung và bấm tạo gợi ý để xem các bản xem trước.
                </p>
              </div>
            ) : (
              <div className='flex-1 overflow-y-auto custom-scrollbar space-y-3.5'>
                {suggestions.map((layout, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedLayoutIndex(idx)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      selectedLayoutIndex === idx
                        ? 'border-violet-600 bg-violet-50/30 ring-2 ring-violet-500/20 shadow-soft-sm'
                        : 'border-stone-200 hover:border-violet-300 bg-white'
                    }`}
                  >
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-xs font-semibold text-stone-900'>Mẫu {idx + 1}</span>
                      {selectedLayoutIndex === idx && <Check className='w-4 h-4 text-violet-600' />}
                    </div>
                    {/* Mini Canvas Preview */}
                    <div className='w-full aspect-[1/1.414] bg-white border border-stone-200 rounded-lg shadow-2xs relative overflow-hidden pointer-events-none'>
                      {layout.map((p) => (
                        <div
                          key={p.id}
                          className='absolute border border-stone-800 bg-stone-100/80 font-mono text-xs flex items-center justify-center text-stone-600'
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
        <div className='p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end gap-2.5'>
          <button
            onClick={onClose}
            className='px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer'
          >
            Hủy
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selectedLayoutIndex === null}
            className='px-4 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl shadow-soft-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-95'
          >
            <Check className='w-4 h-4' /> Áp Dụng Bố Cục
          </button>
        </div>
      </div>
    </>
  );
};
